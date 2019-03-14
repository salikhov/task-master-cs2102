const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");

/* Services homepage */
router.get("/", function(req, res, next) {
  pool.query("select serviceId, name, description from services", function(
    err,
    data
  ) {
    res.render("services/services", {
      title: "Services",
      navCat: "services",
      services: data.rows,
      loggedIn: req.user
    });
  });
});

module.exports = router;
