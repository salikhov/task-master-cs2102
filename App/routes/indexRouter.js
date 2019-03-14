const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");

/* Index Page */
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Home",
    navCat: "home",
    loggedIn: req.user
  });
});

/* Logout */
router.get("/logout", function(req, res, next) {
  req.logout();
  res.redirect("/");
});

/* Login Form */
router.get("/login", function(req, res, next) {
  res.render("login", { title: "Login", navCat: "login", loggedIn: req.user });
});

router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/error" }),
  function(req, res) {
    res.redirect("/");
  }
);

module.exports = router;
