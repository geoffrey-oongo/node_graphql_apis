const User = require("../models/users");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const Post = require("../models/post");
const { clearImage } = require("../util/file");

module.exports = {
  login: async function ({ email, password }, req) {
    const user = await User.findOne({
      email: email,
    });
    if (!user) {
      const error = new Error("User not found");
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("password is incorrect");
      error.code = 401;
      throw error;
    }


    
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userName: user.name,
      },
      "supersecretsssecrrtt",
      { expiresIn: "1h" }
    );
    return { token: token, userId: user._id };
  },
  createUser: async function ({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "E-mail is invalid" });
    }
    if (!validator.isLength(userInput.password, { min: 5 })) {
      errors.push({ message: "password too short" });
    }
    if (errors.length > 0) {
      const error = new Error("invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User exists");

      throw error;
    } else {
      const hashedPassword = await bcrypt.hash(userInput.password, 12);
      const user = new User({
        email: userInput.email,
        name: userInput.name,
        password: hashedPassword,
      });

      const createdUser = await user.save();
      return { ...createdUser._doc, _id: createdUser._id.toString() };
    }
  },
  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 403
      throw error
    }
    const errors = [];
    if (!validator.isLength(postInput.title, { min: 5 })) {
      errors.push({ message: "Title is too short" });
    }
    if (!validator.isLength(postInput.content, { min: 8 })) {
      errors.push({ message: "Comtent is too short" });
    }
    if (errors.length > 0) {
      const error = new Error("invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("invalid User");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });
    const createdPost = await post.save();
    if (createdPost) {
      user.posts.push(createdPost);
      const res = await user.save();
      if (!res) {
        const err = new Error("Database operation failed");
        err.code = 401;
        throw err;
      }
    } else {
      const err = new Error("Database operation failed");
      err.code = 401;
      throw err;
    }

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  getPosts: async function ({ page }, req) {
    let loadedPosts = [];

    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    if (!posts) {
      const error = new Error(
        "could not retrieve products, check your internet connection and try again"
      );
      error.code = 401;
      throw error;
    }
    loadedPosts = posts.map((p) => {
      return {
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toString(),
        updatedAt: p.updatedAt.toString(),
      };
    });
    return {
      posts: loadedPosts,
      totalPosts: totalPosts,
    };
  },

  getPost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");

    if (!post) {
      const error = new Error("no post found");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toString(),
      updatedAt: post.updatedAt.toString(),
    };
  },
  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("no post found");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }

    const errors = [];
    if (!validator.isLength(postInput.title, { min: 5 })) {
      errors.push({ message: "Title is too short" });
    }
    if (!validator.isLength(postInput.content, { min: 8 })) {
      errors.push({ message: "Comtent is too short" });
    }
    if (errors.length > 0) {
      const error = new Error("invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== "no image") {
      post.imageUrl = postInput.imageUrl;
    }

    const updatedPost = await post.save();
    if (!updatedPost) {
      const error = new Error("updating post failed");
      error.data = errors;
      error.code = 500;
      throw error;
    }
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("no post found");
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    const result = await Post.findByIdAndDelete(id);
    if (!result) {
      const error = new Error("Deleting failed");
      error.code = 500;
      throw error;
    }
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    const res = await user.save();
    if (!res) {
      const error = new Error("Could not find a user");
      error.code = 500;
      throw error;
    }
    return true;
  },

  user: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("No user found");
      error.data = errors;
      error.code = 500;
      throw error;
    }
    return {
      ...user._doc,
      _id: user._id.toString(),
    };
  },
  updateStatus: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("No user found");
      error.data = errors;
      error.code = 500;
      throw error;
    }
    user.status = args.status;
    const result = await user.save();
    if (!result) {
      const error = new Error("could not update status");
      error.data = errors;
      error.code = 500;
      throw error;
    }

    return {
      ...user._doc,
      _id: user._id.toString(),
    };
  },
};
