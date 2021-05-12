const express = require("express");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");
const graphQlschema = require("./graphql/schema");
const graphQlResolver = require("./graphql/resolvers");
const auth = require("./middleware/auth");


const clearImage = require("./util/file").clearImage;

const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const app = express();
const url = "<Your MongoDB urL>";
const fileStroge = multer.diskStorage({
  destination: (res, file, cb) => {
    cb(null, "images");
  },
  filename: (res, file, cb) => {
    cb(null, Date.now().toString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype == "image/jpeg" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
//app.use(bodyParser.urlencoded) //www-form-urlencoded <form>
app.use(bodyParser.json()); //application/json
app.use(
  multer({ storage: fileStroge, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST,PATCH, PUT,DELETE",
    "OPTIONS"
  );
  res.setHeader("Access-Control-Allow-HEADERS", "Authorization, Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use((error, req, res, next) => {
  console.log(error);
  const statusCode = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(statusCode).json({ message: message, data: data });
});

app.use(auth);
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    const err = new Error("Not authenticated");
    throw err;
  }
  if (!req.file) {
    return res.status(200).json({ message: "file image not provided" });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: "file stored", filePath: req.file.path });
});




app.use(
  "/graphQl",
  graphqlHTTP({
    schema:graphQlschema ,
    rootValue: graphQlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (err.originalError) {
        const data = err.originalError.data;
        const message = err.message || "An error ocurred";
        const code = err.originalError.code || 500;
        return { message: message, status: code, data: data };
      } else {
        return err;
      }
    },
  })
);
mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    const server = app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });
