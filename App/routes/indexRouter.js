const express = require("express");
const router = express.Router();
const passport = require("passport");
const { checkLoggedIn, checkLoggedOut } = require("./middleware/auth");

/* Index Page */
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Home",
    navCat: "home",
    loggedIn: req.user
  });
});

/* Logout */
router.get("/logout", checkLoggedIn, function(req, res, next) {
  req.logout();
  req.flash("success", "You have been logged out!");
  res.redirect("/");
});

/* Login Form */
router.get("/login", checkLoggedOut, function(req, res, next) {
  res.render("login", { title: "Login", navCat: "login", loggedIn: req.user });
});

router.post(
  "/login",
  checkLoggedOut,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  }),
  function(req, res) {
    req.flash("success", "You have successfully logged in!");
    res.redirect("/");
  }
);

module.exports = router;
