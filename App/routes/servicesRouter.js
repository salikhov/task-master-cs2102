const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");

/* Services homepage */
router.get("/", function(req, res, next) {
  let query =
    "select distinct S.serviceId, S.name as sname, description, price, R.name as rname, C.name as cname, avg(V.rating) " +
    "from services S join cityregions R on R.regionid = S.regionid join categories C on C.catid = S.catid " +
    "left join bookingdetails B on B.serviceid = S.serviceid and B.endtime <= NOW()" +
    "left join reviews V on B.reviewid = V.reviewid " +
    "where exists (select 1 from availability A where A.workerid = S.workerid and A.starttime > NOW())";
  const params = [];
  if (req.query.q) {
    query += " and (S.name ILIKE $1 or S.description ILIKE $1)";
    params.push("%" + req.query.q + "%");
  }
  if (req.query.p) {
    const paramName = "$" + (params.length + 1);
    query += " and ";
    query += "price <= " + paramName;
    params.push(req.query.p);
  }
  if (req.query.c) {
    const paramName = "$" + (params.length + 1);
    query += " and ";
    query += "S.catid=" + paramName;
    params.push(req.query.c);
  }
  if (req.query.r) {
    const paramName = "$" + (params.length + 1);
    query += " and ";
    query += "S.regionid=" + paramName;
    params.push(req.query.r);
  }
  query += " group by s.serviceid, rname, cname ";
  if (req.query.s) {
    const paramName = "$" + (params.length + 1);
    query +=
      "having avg(V.rating) >= " + paramName + " or avg(V.rating) is null";
    params.push(req.query.s);
  }

  pool.query(query, params, function(err, data) {
    if (err) {
      console.log(err);
    }
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
