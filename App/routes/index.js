const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");

/* GET home page. */
router.get("/", function(req, res, next) {
  pool.query("select * from users", function(err, data) {
    res.render("index", {
      title: "Home",
      users: data.rows,
      loggedIn: req.user
    });
  });
});

/* Logout */
router.get("/logout", function(req, res, next) {
  req.logout();
  res.redirect("/");
});

/* Login Form */
router.get("/login", function(req, res, next) {
  res.render("login", { title: "Login" });
});

router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/error" }),
  function(req, res) {
    res.redirect("/");
  }
);

module.exports = router;
