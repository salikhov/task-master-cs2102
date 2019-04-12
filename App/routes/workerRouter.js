const express = require("express");
const router = express.Router();
const { checkWorkerLoggedIn } = require("./middleware/auth");
const { genericError } = require("../db/util");
const pool = require("../db");
const moment = require("moment");

function checkBookPermissions(req, res, next) {
  pool.query(
    "select 1 from bookingdetails where workerid=$1 and bookingid=$2",
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

function checkServPermissions(req, res, next) {
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

function checkAvailPermissions(req, res, next) {
  const startTime = moment.unix(req.params.starttime);
  const endTime = moment.unix(req.params.endtime);
  pool.query(
    "select 1 from availability where workerid=$1 and starttime=$2 and endtime=$3",
    [req.user.id, startTime.toISOString(true), endTime.toISOString(true)],
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
  pool.query(
    "select bookingid, starttime, endtime, firstname, lastname, S.name from bookingdetails B" +
      " join accounts A on B.userid = A.id join services S on B.serviceid = S.serviceid" +
      " where B.workerid=$1 and endtime >= NOW() order by starttime ASC limit 5",
    [req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/");
        return;
      }
      res.render("worker/index", {
        title: "Worker Panel",
        navCat: "worker",
        wNavCat: "index",
        bookings: data.rows,
        moment: moment,
        loggedIn: req.user
      });
    }
  );
});

/* GET bookings - Worker Panel Bookings Page */
router.get("/bookings", checkWorkerLoggedIn, function(req, res, next) {
  pool.query(
    "select bookingid, starttime, endtime, firstname, lastname, S.name from bookingdetails B" +
      " join accounts A on B.userid = A.id join services S on B.serviceid = S.serviceid" +
      " where B.workerid=$1 and endtime >= NOW() order by starttime ASC",
    [req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/worker");
        return;
      }
      res.render("worker/bookings", {
        title: "Worker Panel",
        navCat: "worker",
        wNavCat: "bookings",
        bookings: data.rows,
        past: false,
        moment: moment,
        loggedIn: req.user
      });
    }
  );
});

/* GET bookings - Worker Panel Bookings Page */
router.get("/past_bookings", checkWorkerLoggedIn, function(req, res, next) {
  pool.query(
    "select bookingid, starttime, endtime, firstname, lastname, S.name from bookingdetails B" +
      " join accounts A on B.userid = A.id join services S on B.serviceid = S.serviceid" +
      " where B.workerid=$1 and endtime < NOW() order by endtime DESC",
    [req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/worker");
        return;
      }
      res.render("worker/bookings", {
        title: "Worker Panel",
        navCat: "worker",
        wNavCat: "bookings",
        bookings: data.rows,
        past: true,
        moment: moment,
        loggedIn: req.user
      });
    }
  );
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
        genericError(req, res, "/worker");
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

/* GET availability - Worker Panel Availability */
router.get("/availability", checkWorkerLoggedIn, function(req, res, next) {
  pool.query(
    "select starttime, endtime from availability where workerid=$1 and endtime >= NOW() order by starttime asc",
    [req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/worker");
        return;
      }
      res.render("worker/availability", {
        title: "Worker Panel",
        navCat: "worker",
        wNavCat: "availability",
        moment: moment,
        availability: data.rows,
        loggedIn: req.user
      });
    }
  );
});

/* GET reviews - Worker Panel Reviews */
router.get("/reviews", checkWorkerLoggedIn, function(req, res, next) {
  const textReviewQuery = `select rating, review from reviews R join bookingdetails B on B.reviewid = R.reviewid
  where review <> '' and review is not null and B.workerid=$1 order by B.endtime desc`;
  const ratingByRegion = `select CR.regionid, CR.name, avg(R.rating) from reviews R join bookingdetails B on B.reviewid = R.reviewid
  join services S on B.serviceid = S.serviceid join cityregions CR on S.regionid = CR.regionid where B.workerid=$1
  group by CR.regionid`;
  const ratingByCategory = `select C.catid, C.name, avg(R.rating) from reviews R join bookingdetails B on B.reviewid = R.reviewid
  join services S on B.serviceid = S.serviceid join categories C on S.catid = C.catid where B.workerid=$1
  group by C.catid`;
  const avgRating = `select avg(R.rating) from reviews R join bookingdetails B on B.reviewid=R.reviewid where B.workerid=$1`;
  pool.query(textReviewQuery, [req.user.id], function(err, data1) {
    if (err) {
      genericError(req, res, "/worker");
      return;
    }
    pool.query(avgRating, [req.user.id], function(err, data2) {
      if (err) {
        genericError(req, res, "/worker");
        return;
      }
      pool.query(ratingByRegion, [req.user.id], function(err, data3) {
        if (err) {
          genericError(req, res, "/worker");
          return;
        }
        pool.query(ratingByCategory, [req.user.id], function(err, data4) {
          if (err) {
            genericError(req, res, "/worker");
            return;
          }
          res.render("worker/reviews", {
            title: "Worker Panel",
            navCat: "worker",
            wNavCat: "reviews",
            reviews: data1.rows,
            avgRating: data2.rows[0].avg,
            byRegion: data3.rows,
            byCategory: data4.rows,
            loggedIn: req.user
          });
        });
      });
    });
  });
});

/* =====================================
   ========= BOOKINGS ACTIONS ==========
   ===================================== */
router.get(
  "/bookings/cancel/:id",
  checkWorkerLoggedIn,
  checkBookPermissions,
  function(req, res, next) {
    pool.query(
      "delete from billingdetails C using bookingdetails B" +
        " where B.billingid = C.billingid and B.bookingid = $1 and endtime >= NOW() returning B.starttime, B.endtime, B.workerid",
      [req.params.id],
      function(err, data) {
        if (err) {
          genericError(req, res, "/worker/bookings");
          return;
        }
        if (data.rowCount === 0) {
          req.flash("warning", "Booking cannot be cancelled");
          res.redirect("/worker/bookings");
        }
        pool.query(
          "insert into availability (workerid, starttime, endtime) values ($1, $2, $3)",
          [data.rows[0].workerid, data.rows[0].starttime, data.rows[0].endtime],
          function(err, data) {
            if (err) {
              genericError(req, res, "/worker/bookings");
              return;
            }
            req.flash("success", "Booking cancelled");
            res.redirect("/worker/bookings");
          }
        );
      }
    );
  }
);

/* =====================================
   ========= SERVICES ACTIONS ==========
   ===================================== */
router.get(
  "/services/edit/:id",
  checkWorkerLoggedIn,
  checkServPermissions,
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
  checkServPermissions,
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
  checkServPermissions,
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

router.get("/services/new", checkWorkerLoggedIn, function(req, res, next) {
  pool.query("select * from categories", function(err, data1) {
    if (err) {
      genericError(req, res, "/worker/services");
      return;
    }
    pool.query("select * from cityregions", function(err, data2) {
      if (err) {
        genericError(req, res, "/worker/services");
        return;
      }
      res.render("worker/services_new", {
        title: "New Service",
        navCat: "worker",
        wNavCat: "services",
        categories: data1.rows,
        regions: data2.rows,
        loggedIn: req.user
      });
    });
  });
});

router.post("/services/create", checkWorkerLoggedIn, function(req, res, next) {
  pool.query(
    "insert into services (name, description, price, catid, regionid, workerid) values ($1, $2, $3, $4, $5, $6)",
    [
      req.body.sname,
      req.body.description,
      req.body.price,
      req.body.category,
      req.body.region,
      req.user.id
    ],
    function(err, data) {
      if (err) {
        genericError(req, res, "/worker/services");
        return;
      }
      req.flash("success", "Service created");
      res.redirect("/worker/services");
    }
  );
});

/* =====================================
   ======= AVAILABILITY ACTIONS ========
   ===================================== */
router.get("/availability/new", checkWorkerLoggedIn, function(req, res, next) {
  res.render("worker/availability_new", {
    title: "Add Availability",
    navCat: "worker",
    wNavCat: "availability",
    loggedIn: req.user
  });
});

router.post("/availability/create", checkWorkerLoggedIn, function(
  req,
  res,
  next
) {
  const startTime = moment(req.body.startTime, "ddd, MMM D, YYYY h:mm A");
  const endTime = moment(req.body.endTime, "ddd, MMM D, YYYY h:mm A");
  const rn = moment();
  if (!startTime.isBefore(endTime)) {
    req.flash("warning", "Start time must be before end time");
    res.redirect("/worker/availability");
    return;
  }
  if (!startTime.isAfter(rn) || !endTime.isAfter(rn)) {
    req.flash("warning", "Both times must be in the future");
    res.redirect("/worker/availability");
    return;
  }
  pool.query(
    "insert into availability (workerid, starttime, endtime) values ($1, $2, $3)",
    [req.user.id, startTime.toISOString(true), endTime.toISOString(true)],
    function(err, data) {
      if (err) {
        genericError(req, res, "/worker/availability");
        return;
      }
      req.flash("success", "Availability added");
      res.redirect("/worker/availability");
    }
  );
});

router.get(
  "/availability/edit/:starttime/:endtime",
  checkWorkerLoggedIn,
  checkAvailPermissions,
  function(req, res, next) {
    res.render("worker/availability_edit", {
      title: "Edit Availability",
      navCat: "worker",
      wNavCat: "availability",
      startTime: req.params.starttime,
      endTime: req.params.endtime,
      loggedIn: req.user
    });
  }
);

router.post(
  "/availability/update/:starttime/:endtime",
  checkWorkerLoggedIn,
  checkAvailPermissions,
  function(req, res, next) {
    const oldStartTime = moment.unix(req.params.starttime);
    const oldEndTime = moment.unix(req.params.endtime);
    const startTime = moment(req.body.startTime, "ddd, MMM D, YYYY h:mm A");
    const endTime = moment(req.body.endTime, "ddd, MMM D, YYYY h:mm A");
    const rn = moment();
    if (!startTime.isBefore(endTime)) {
      req.flash("warning", "Start time must be before end time");
      res.redirect("/worker/availability");
      return;
    }
    if (!startTime.isAfter(rn) || !endTime.isAfter(rn)) {
      req.flash("warning", "Both times must be in the future");
      res.redirect("/worker/availability");
      return;
    }
    pool.query(
      "update availability set starttime=$1, endtime=$2 where workerid=$3 and starttime=$4 and endtime=$5",
      [
        startTime.toISOString(true),
        endTime.toISOString(true),
        req.user.id,
        oldStartTime.toISOString(true),
        oldEndTime.toISOString(true)
      ],
      function(err, data) {
        if (err) {
          genericError(req, res, "/worker/availability");
          return;
        }
        req.flash("success", "Availability updated");
        res.redirect("/worker/availability");
      }
    );
  }
);

router.get(
  "/availability/delete/:starttime/:endtime",
  checkWorkerLoggedIn,
  checkAvailPermissions,
  function(req, res, next) {
    const oldStartTime = moment.unix(req.params.starttime);
    const oldEndTime = moment.unix(req.params.endtime);
    pool.query(
      "delete from availability where workerid=$1 and starttime=$2 and endtime=$3",
      [
        req.user.id,
        oldStartTime.toISOString(true),
        oldEndTime.toISOString(true)
      ],
      function(err, data) {
        req.flash("success", "Deleted availability slot");
        res.redirect("/worker/availability");
      }
    );
  }
);

module.exports = router;
