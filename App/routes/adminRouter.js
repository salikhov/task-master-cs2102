const express = require("express");
const router = express.Router();
const { checkAdminLoggedIn } = require("./middleware/auth");
const pool = require("../db");

/* GET index - Admin Panel Page */
router.get("/", checkAdminLoggedIn, function(req, res, next) {
  res.render("admin/index", {
    title: "Admin Panel",
    navCat: "admin",
    loggedIn: req.user
  });
});

module.exports = router;
