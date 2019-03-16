const express = require("express");
const router = express.Router();
const { checkUserLoggedIn } = require("./middleware/auth");

router.get("/refer", checkUserLoggedIn, function(req, res, next) {
  res.render("account/refer", {
    title: "Refer a Friend",
    navCat: "",
    loggedIn: req.user
  });
});

router.post("/refer", checkUserLoggedIn, function(req, res, next) {
  res.json(req.body.email);
});

module.exports = router;
