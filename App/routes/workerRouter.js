const express = require("express");
const router = express.Router();
const { checkWorkerLoggedIn } = require("./middleware/auth");
const { genericError } = require("../db/util");
const pool = require("../db");

function checkPermissions(req, res, next) {
  pool.query(
    "select 1 from services where workerid=$1 and serviceid=$2",
    [req.user.id, req.params.id],
    function(err, data) {
      if (!err && data && data.rowCount !== 0) {
        return next();
      } else {
        req.flash("warning", "You cannot access that page!");
        res.redirect("/");
        return;
      }
    }
  );
}

/* =====================================
   ========= BASIC TABS/PAGES ==========
   ===================================== */

/* GET index - Worker Panel Summary Page */
router.get("/", checkWorkerLoggedIn, function(req, res, next) {
  res.render("worker/index", {
    title: "Worker Panel",
    navCat: "worker",
    wNavCat: "index",
    loggedIn: req.user
  });
});

/* GET bookings - Worker Panel Bookings Page */
router.get("/bookings", checkWorkerLoggedIn, function(req, res, next) {
  res.render("worker/bookings", {
    title: "Worker Panel",
    navCat: "worker",
    wNavCat: "bookings",
    loggedIn: req.user
  });
});

/* GET bookings - Worker Panel Services Page */
router.get("/services", checkWorkerLoggedIn, function(req, res, next) {
  pool.query(
    "select S.serviceid, S.name as sname, C.name as cname, price, R.name as rname from services S " +
      "join categories C on S.catid = C.catid join cityregions R on S.regionid = R.regionid " +
      "where workerId=$1",
    [req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res);
        return;
      }
      res.render("worker/services", {
        title: "Worker Panel",
        navCat: "worker",
        wNavCat: "services",
        services: data.rows,
        loggedIn: req.user
      });
    }
  );
});

/* =====================================
   ========= BOOKINGS ACTIONS ==========
   ===================================== */

/* =====================================
   ========= SERVICES ACTIONS ==========
   ===================================== */
router.get(
  "/services/edit/:id",
  checkWorkerLoggedIn,
  checkPermissions,
  function(req, res, next) {
    pool.query(
      "select * from services where serviceid=$1",
      [req.params.id],
      function(err, data1) {
        if (err) {
          genericError(req, res, "/worker/services");
          return;
        }
        pool.query("select * from categories", function(err, data2) {
          if (err) {
            genericError(req, res, "/worker/services");
            return;
          }
          pool.query("select * from cityregions", function(err, data3) {
            if (err) {
              genericError(req, res, "/worker/services");
              return;
            }
            res.render("worker/services_edit", {
              title: "Edit Service",
              navCat: "worker",
              wNavCat: "services",
              service: data1.rows[0],
              categories: data2.rows,
              regions: data3.rows,
              loggedIn: req.user
            });
          });
        });
      }
    );
  }
);

router.post(
  "/services/update/:id",
  checkWorkerLoggedIn,
  checkPermissions,
  function(req, res, next) {
    pool.query(
      "update services set name=$1, description=$2, price=$3, catid=$4, regionid=$5 where serviceid=$6",
      [
        req.body.sname,
        req.body.description,
        req.body.price,
        req.body.category,
        req.body.region,
        req.params.id
      ],
      function(err, data) {
        if (err) {
          genericError(req, res, "/worker/services");
          return;
        }
        req.flash("success", "Service updated");
        res.redirect("/worker/services");
      }
    );
  }
);

router.get(
  "/services/delete/:id",
  checkWorkerLoggedIn,
  checkPermissions,
  function(req, res, next) {
    pool.query(
      "delete from services where serviceid=$1",
      [req.params.id],
      function(err, data) {
        if (err) {
          genericError(req, res, "/worker/services");
          return;
        }
        req.flash("success", "Service deleted");
        res.redirect("/worker/services");
      }
    );
  }
);

module.exports = router;
