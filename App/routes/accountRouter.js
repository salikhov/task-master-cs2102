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

/* =====================================
   ============= OPERATIONS ============
   ===================================== */

/* GET - Summary page (profile) */
router.get("/", checkLoggedIn, function(req, res, next) {
  res.render("account/index", {
    title: "Account",
    navCat: "account",
    loggedIn: req.user
  });
});

/* GET edit - Edit account details */
router.get("/edit", checkLoggedIn, function(req, res, next) {
  res.render("account/edit", {
    title: "Edit Account",
    navCat: "account",
    loggedIn: req.user
  });
});

/* PUT update - Edit account action */
router.put("/update", checkLoggedIn, function(req, res, next) {
  // This is where the stuff that actually updates the account goes
});

/* GET refer - Referral page */
router.get("/refer", checkUserLoggedIn, function(req, res, next) {
  res.render("account/refer", {
    title: "Refer a Friend",
    navCat: "account",
    loggedIn: req.user
  });
});

/* POST refer - Referral action */
router.post("/refer", checkUserLoggedIn, function(req, res, next) {
  res.json(req.body.email);
});

module.exports = router;
