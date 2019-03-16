const crypto = require("crypto");

function getPasswordHash(salt, password) {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 512, "sha512")
    .toString("hex");
}

module.exports.getPasswordHash = getPasswordHash;
