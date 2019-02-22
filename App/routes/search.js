const express = require("express");
const router = express.Router();

/* GET for deafult search page */
router.get("/", function(req, res, next) {
  res.render("search", { title: "Search", params: req.query });
});

module.exports = router;
