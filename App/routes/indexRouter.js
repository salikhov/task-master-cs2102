const express = require("express");
const router = express.Router();

/* Index Page */
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Home",
    navCat: "home",
    loggedIn: req.user
  });
});

module.exports = router;
