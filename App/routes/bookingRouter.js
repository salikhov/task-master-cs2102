const async = require("async");
const express = require("express");
const router = express.Router();
const { checkLoggedIn, checkUserLoggedIn } = require("./middleware/auth");
const { genericError } = require("../db/util");
const pool = require("../db");
const moment = require("moment");

let return_data = {};

function checkPermissions(req, res, next) {
  pool.query(
    "select 1 from bookingdetails where (userid=$1 or workerid=$1) and bookingid=$2",
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

router.get("/", checkUserLoggedIn, function(req, res, next) {
  const futureBookingsQ =
    "select bookingid,t3.name as cleaningname,price,starttime,endtime,address,firstname,lastname,email,t4.phone " +
    "as workerphone,userId from (select bookingid,starttime,endtime,address,t1.workerid as theworkerid,firstname,lastname,email, " +
    "t2.name,price,keepthis as userId from (select bookingid,starttime,endtime,address,workerid,serviceid,email, salt,firstname,lastname,userid " +
    "as keepthis from bookingdetails join accounts on (workerid = id)) as t1 join services as t2 on (t1.serviceid = t2.serviceid)) " +
    "as t3 join workers as t4 on (t3.theworkerid = t4.id) where userId = $1 and endtime >= NOW()" +
    " ORDER by bookingid, price, starttime";

  const pastBookingsQ =
    "select bookingid,t3.name as cleaningname,price,starttime,endtime,address,firstname,lastname,email,t4.phone " +
    "as workerphone,userId from (select bookingid,starttime,endtime,address,t1.workerid as theworkerid,firstname,lastname,email, " +
    "t2.name,price,keepthis as userId from (select bookingid,starttime,endtime,address,workerid,serviceid,email, salt,firstname,lastname,userid " +
    "as keepthis from bookingdetails join accounts on (workerid = id)) as t1 join services as t2 on (t1.serviceid = t2.serviceid)) " +
    "as t3 join workers as t4 on (t3.theworkerid = t4.id) where userId = $1 and endtime < NOW()" +
    " ORDER by bookingid, price, endtime desc";

  pool.query(futureBookingsQ, [req.user.id], function(err, data) {
    if (err) {
      genericError(req, res);
      return;
    }
    pool.query(pastBookingsQ, [req.user.id], function(err, data2) {
      if (err) {
        genericError(req, res);
        return;
      }
      res.render("booking/index", {
        title: "Booking Summary",
        navCat: "booking",
        bookings: data.rows,
        pastBookings: data2.rows,
        moment: moment,
        loggedIn: req.user
      });
    });
  });
});

router.get("/cancel/:id", checkUserLoggedIn, checkPermissions, function(
  req,
  res,
  next
) {
  pool.query(
    "delete from billingdetails C using bookingdetails B" +
      " where B.billingid = C.billingid and B.bookingid = $1 and endtime >= NOW()",
    [req.params.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/booking");
        return;
      }
      if (data.rowCount === 0) {
        req.flash("warning", "Booking cannot be cancelled");
        res.redirect("/booking");
      }
      req.flash("success", "Booking cancelled");
      res.redirect("/booking");
    }
  );
});

/* GET view - Booking Summary Page for Particular Booking */
router.get("/view/:id", checkLoggedIn, checkPermissions, function(
  req,
  res,
  next
) {
  const q = `select B.bookingid, starttime, endtime, B.address, comments, C.name as catname, CR.name as regname,
  S.price, S.name as sname, S.description, U.phone as cphone, W.phone as wphone, A1.email as wemail, A2.email as cemail,
  A1.firstname || ' ' || A1.lastname as wname, A2.firstname || ' ' || A2.lastname as cname,
  substring(cashmoney.cardnumber, length(cashmoney.cardnumber) - 3, 4) as lastFour
  from bookingdetails B join services S on S.serviceid = B.serviceid
  join categories C on C.catid = S.catid join cityregions CR on CR.regionid = S.regionid
  join accounts A1 on A1.id = B.workerid join accounts A2 on A2.id = B.userid
  join users U on U.id = B.userid join workers W on W.id = B.workerid
  join billingdetails as cashmoney on cashmoney.billingid = B.billingid
  where bookingid=$1`;
  pool.query(q, [req.params.id], function(err, data) {
    if (err) {
      genericError(req, res);
      return;
    }
    if (data.rowCount === 0) {
      req.flash("warning", "That booking does not exist!");
      res.redirect("/");
      return;
    }
    res.render("booking/view", {
      title: "Booking Summary",
      navCat: "booking",
      booking: data.rows[0],
      moment: moment,
      loggedIn: req.user
    });
  });
});

// This is a post because you should only be able to get to it when you click on
// a button from the services page, you shouldn't just be able to type it in
/* POST new - Booking Form */
router.post("/new", checkUserLoggedIn, function(req, res, next) {
  async.parallel(
    [
      function(parallel_done) {
        pool.query("select * from services order by name, price asc", function(
          err,
          services
        ) {
          if (err) return parallel_done(err);
          return_data.services = services;
          parallel_done();
        });
      },
      function(parallel_done) {
        pool.query(
          "select * from workers natural join accounts order by firstname asc",
          function(err, workers) {
            if (err) return parallel_done(err);
            return_data.workers = workers;
            parallel_done();
          }
        );
      }
    ],
    function(err) {
      if (err) console.log(err);
      res.render("booking/new", {
        title: "New Booking",
        navCat: "booking",
        workers: return_data.workers.rows,
        services: return_data.services.rows,
        loggedIn: req.user
      });
    }
  );
});

/* POST create - Create Booking Action */
router.post("/create", checkUserLoggedIn, function(req, res, next) {
  // Retrieve Information
  const startTime = req.body.startTime;
  const endTime = req.body.endTime;
  const address = req.body.address;
  const comments = req.body.comments;
  const workerID = req.body.workerID;
  const serviceID = req.body.serviceID;
  const userId = req.user.userid;
  const cardNumber = req.body.cardNumber;
  const expDate = req.body.expDate;
  const cvv = req.body.cvv;

  const insertBillingDetails_query =
    "INSERT into billingdetails (cardnumber, expdate, cvv) VALUES('" +
    cardNumber +
    "', '" +
    expDate +
    "', '" +
    cvv +
    "');";

  const retrieveBillingID_query =
    "select * from billingdetails where cardNumber='" + cardNumber + "';";

  pool.query(insertBillingDetails_query, (err, data1) => {
    pool.query(retrieveBillingID_query, (err, data2) => {
      const insertBookingDetails_query =
        "INSERT into bookingdetails values(DEFAULT,'" +
        startTime +
        "','" +
        endTime +
        "','" +
        address +
        "','" +
        comments +
        "','" +
        data2.rows[0].billingid +
        "','" +
        userId +
        "','" +
        workerID +
        "','" +
        serviceID +
        "');";

      pool.query(insertBookingDetails_query, (err, data3) => {
        const retrieveWorker_query =
          "SELECT * from workers where workerID ='" + workerID + "';";

        pool.query(retrieveWorker_query, (err, data4) => {
          const retrieveBookingID_query =
            "SELECT * from bookingdetails where address='" +
            address +
            "' and starttime='" +
            startTime +
            "';";

          // TODO redirect to view instead of summary
          pool.query(retrieveBookingID_query, (err, data5) => {
            res.render("booking/summary", {
              workerDetails: data4.rows[0],
              title: "Booking Summary",
              navCat: "booking",
              loggedIn: req.user,
              startTime: startTime,
              endTime: endTime,
              address: address,
              comments: comments,
              cardNumberTrimmed: cardNumber.substring(12, 16),
              bookingID: data5.rows[0].bookingid
            });
          });
        });
      });
    });
  });
});

module.exports = router;
