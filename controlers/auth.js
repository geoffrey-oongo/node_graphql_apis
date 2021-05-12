const { validationResult } = require("express-validator");
const jsonWebToken = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/users");
exports.signup = async (req, res, next) => {
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        password: hashedPassword,
        email: email,
        name: name,
      });
      const result = await user.save();
      if (result) {
        res.status(201).json({
          message: "New user created",
          userId: result._id,
        });
      } else {
        const error = new Error("Database operation failed ");
        next(error);
      }
    } catch (err) {
      err.statusCode = 500;
      next(err);
    }
  } else {
    const error = new Error("validation failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  console.log(email);
  try {
    const user = await User.findOne({ email: email });
    if (user) {
      const isEqual = await bcrypt.compare(password, user.password);
      if (isEqual) {
        const token = jsonWebToken.sign(
          {
            email: user.email,
            userId: user._id.toString(),
          },
          "somesuperrrrlongrrrsecretttt",
          { expiresIn: "1h" }
        );
        res
          .status(200)
          .json({
            token: token,
            userId: user._id.toString(),
            status: user.status,
          });
      } else {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
    } else {
      const error = new Error("This email could not be found");
      error.statusCode = 401;
      throw error;
    }
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
};
exports.getStatus = async (req, res, next) => {
  const userId = req.userId;
  try {
    const user = await User.findById(userId);
    if (user) {
      res.status(200).json({
        message: "user founded",
        status: user.status,
      });
    } else {
      const err = new Error("no user found");
      err.statusCode = 500;
      throw err;
    }
  } catch (er) {
    er.statusCode = 500;
    next(er);
  }
};
