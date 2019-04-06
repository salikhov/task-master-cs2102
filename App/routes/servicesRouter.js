const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");

/* Services homepage */
router.get("/", function(req, res, next) {
  let query =
    "select serviceId, S.name as sname, description, price, R.name as rname, C.name as cname from services S " +
    "join cityregions R on R.regionid = S.regionid join categories C on C.catid = S.catid ";
  const params = [];
  if (req.query.q || req.query.p || req.query.c || req.query.r) {
    query += "where ";
    if (req.query.q) {
      query += "(S.name ILIKE $1 or S.description ILIKE $2)";
      params.push("%" + req.query.q + "%");
      params.push("%" + req.query.q + "%");
    }
    if (req.query.p) {
      const paramName = "$" + (params.length + 1);
      if (params.length !== 0) query += " and ";
      query += "price <= " + paramName;
      params.push(req.query.p);
    }
    if (req.query.c) {
      const paramName = "$" + (params.length + 1);
      if (params.length !== 0) query += " and ";
      query += "S.catid=" + paramName;
      params.push(req.query.c);
    }
    if (req.query.r) {
      const paramName = "$" + (params.length + 1);
      if (params.length !== 0) query += " and ";
      query += "S.regionid=" + paramName;
      params.push(req.query.r);
    }
  }
  pool.query(query, params, function(err, data) {
    pool.query("select * from categories", function(err, data2) {
      pool.query("select * from cityregions", function(err, data3) {
        res.render("services/services", {
          title: "Services",
          navCat: "services",
          services: data.rows,
          categories: data2.rows,
          regions: data3.rows,
          query: req.query,
          loggedIn: req.user
        });
      });
    });
  });
});

module.exports = router;
