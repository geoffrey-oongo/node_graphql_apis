const { validationResult } = require("express-validator");
const Post = require("../models/post");
const fs = require("fs");
const path = require("path");
const User = require("../models/users");
const io = require("../socket/socketIo");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page;
  const perPage = 2;
  let totalItems;
  try {
    const docs = await Post.find().countDocuments();
    if (docs) {
      totalItems = docs;
    }
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    if (posts) {
      res.status(200).json({
        message: "fetched",
        posts: posts,
        totalItems: totalItems,
      });
    } else {
      const error = new Error("could not find post ");
      error.statusCode = 404;
      throw error;
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  console.log(req.userId);
  const title = req.body.title;
  const content = req.body.content;
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    if (!req.file) {
      const error = new Error(
        "Validation error, the data entered was incorrect"
      );
      error.statusCode = 422;
      throw error;
    }

    const imageUrl = req.file.path;

    const post = new Post({
      imageUrl: imageUrl,
      title: title,
      content: content,
      creator: req.userId,
    });

    try {
      const result = await post.save();

      if (result) {
        const user = await User.findById(req.userId);
        if (user) {
          user.posts.push(post);

          await user.save();
          io.getIo().emit("posts", {
            action: "create",
            post: {
              ...post._doc,
              creator: {
                _id: req.userId,
                name: user.name,
              },
            },
          });
        } else {
          const err = new Error("could not create the user ");
          err.statusCode = 401;
          throw err;
        }

        res.status(201).json({
          message: "success",
          post: post,
          creator: { _id: user._id, name: user.name },
        });
      } else {
        const err = new Error("could not create the post ");
        err.statusCode = 401;
        throw err;
      }
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  } else {
    const error = new Error("validation failed");
    error.statusCode = 422;
    throw error;
  }
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("could not find post ");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        message: "post fetched",
        post: post,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    if (!imageUrl) {
      const err = new Error("No file picked");
      err.statusCode = 422;
      throw err;
    } else {
      try {
        const post = await Post.findById(postId).populate("creator");

        if (!post) {
          const error = new Error("could not find a post");
          error.statusCode = 404;
          throw error;
        }
        if (imageUrl !== post.imageUrl) {
          clearImage(post.imageUrl);
        }
        if (post.creator._id.toString() !== req.userId) {
          const err = new Error("Not authorized");
          err.statusCode = 403;
          throw err;
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;

        const result = await post.save();
        if (result) {
          io.getIo().emit("posts", { action: "updated", post: result });
          res.status(200).json({ message: "post updated", post: result });
        }
      } catch (err) {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      }
    }
  } else {
    const error = new Error("validation failed");
    error.statusCode = 422;
    throw error;
  }
};
const clearImage = (fp) => {
  const filePath = path.join(__dirname, "..", fp);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("could not find a post");
      error.statusCode = 404;
      throw error;
    } else {
      if (post.creator.toString() !== req.userId) {
        const err = new Error("Not authorized");
        err.statusCode = 403;
        throw err;
      }

      const user = await User.findById(req.userId);
      const result = await post.remove();
      if (result) {
        user.posts.pull(postId);
        await user.save();
        io.getIo().emit("posts", { post: postId, action: "delete" });

        clearImage(post.imageUrl);
        res.status(200).json({
          message: "Deleted post",
        });
      }
    }
  } catch (e) {
    if (!e.statusCode) {
      e.statusCode = 500;
    }
    next(e);
  }
};
