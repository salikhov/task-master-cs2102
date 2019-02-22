const express = require("express");
const router = express.Router();

const pool = require("../db");

/* GET home page. */
router.get("/", function(req, res, next) {
  pool.query("select * from users", function(err, data) {
    console.log(data.rows);
    res.render("index", { title: "Home", users: data.rows });
  });
});

module.exports = router;
