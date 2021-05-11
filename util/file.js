const path = require("path");
const fs = require("fs");
const clearImage = (fp) => {
  const filePath = path.join(__dirname, "..", fp);
  fs.unlink(filePath, (err) => {
    throw new Error('an error ocurred')
  });
};
exports.clearImage = clearImage;
