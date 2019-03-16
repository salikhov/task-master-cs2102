const express = require("express");
const router = express.Router();
const passport = require("passport");

const {
  checkLoggedIn,
  checkLoggedOut,
  checkUserLoggedIn
} = require("./middleware/auth");

/* =====================================
   ========== AUTHENTICATION ===========
   ===================================== */

/* GET login - Login Form */
router.get("/login", checkLoggedOut, function(req, res, next) {
  res.render("account/login", {
    title: "Login",
    navCat: "login",
    loggedIn: req.user
  });
});

/* POST login - Login Action */
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

/* GET/POST logout - Logout Action */
router.all("/logout", checkLoggedIn, function(req, res, next) {
  req.logout();
  req.flash("success", "You have been logged out!");
  res.redirect("/");
});

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
