const async = require("async");
const express = require("express");
const router = express.Router();
const { checkLoggedIn, checkUserLoggedIn } = require("./middleware/auth");
const { genericError } = require("../db/util");
const pool = require("../db");
const moment = require("moment");
let workerIDGlobal;

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

function checkNotReviewed(req, res, next) {
  pool.query(
    "select 1 from bookingdetails where bookingid=$1 and endtime < NOW() and reviewid is null",
    [req.params.id],
    function(err, data) {
      if (err || !data || data.rowCount === 0) {
        req.flash("warning", "That booking cannot be reviewed");
        res.redirect("/booking");
        return;
      } else {
        return next();
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

  const pastBookingsQ = `select
    bookingid,t3.name as cleaningname,price,starttime,endtime,address,firstname,lastname,email,t4.phone as workerphone,userId, reviewid
    from (
    select
    bookingid,starttime,endtime,address,t1.workerid as theworkerid, t1.reviewid,firstname,lastname,email, t2.name,price,keepthis as userId
    from (
    select
    bookingid,starttime,endtime,address,workerid,serviceid,email, salt,firstname,lastname,userid as keepthis, reviewid
    from bookingdetails join accounts on (workerid = id)) as t1 join services as t2 on (t1.serviceid = t2.serviceid)) as t3 join workers as t4 on (t3.theworkerid = t4.id) where userId = $1 and endtime < NOW()
    ORDER by bookingid, price, endtime desc`;

  pool.query(futureBookingsQ, [req.user.id], function(err, data) {
    if (err) {
      genericError(req, res, "/");
      return;
    }
    pool.query(pastBookingsQ, [req.user.id], function(err, data2) {
      if (err) {
        genericError(req, res, "/");
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
      " where B.billingid = C.billingid and B.bookingid = $1 and endtime >= NOW() returning B.starttime, B.endtime, B.workerid",
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
      pool.query(
        "insert into availability (workerid, starttime, endtime) values ($1, $2, $3)",
        [data.rows[0].workerid, data.rows[0].starttime, data.rows[0].endtime],
        function(err, data) {
          if (err) {
            genericError(req, res, "/booking");
            return;
          }
          req.flash("success", "Booking cancelled");
          res.redirect("/booking");
        }
      );
    }
  );
});

/* GET new review - Page to create review for particular booking */
router.get(
  "/review/:id",
  checkUserLoggedIn,
  checkPermissions,
  checkNotReviewed,
  function(req, res, next) {
    res.render("booking/new_review", {
      title: "New Review",
      navCat: "booking",
      bookingId: req.params.id,
      loggedIn: req.user
    });
  }
);

/* POST new review - action to create new review for a booking */
router.post(
  "/review/:id",
  checkUserLoggedIn,
  checkPermissions,
  checkNotReviewed,
  function(req, res, next) {
    pool.query(
      "insert into reviews (rating, review) values ($1, $2) returning reviewid",
      [req.body.rating, req.body.review == "" ? null : req.body.review],
      function(err, data1) {
        if (err || !data1 || data1.rowCount === 0) {
          genericError(req, res, "/booking/review/" + req.params.id);
          return;
        }
        const id = data1.rows[0].reviewid;
        pool.query(
          "update bookingdetails set reviewid=$1 where bookingid=$2",
          [id, req.params.id],
          function(err, data2) {
            if (err) {
              genericError(req, res, "/review/" + req.params.id);
              return;
            }
            req.flash("success", "Review added");
            res.redirect("/booking");
          }
        );
      }
    );
  }
);

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

function enumerateDaysBetweenDates(startDate, endDate) {
  var now = startDate.clone(),
    dates = [];

  while (now.isSameOrBefore(endDate)) {
    dates.push(now.format("YYYY-MM-DD HH:mm"));
    now.add(1, "days");
  }
  return dates;
}

// Get to this from services page
/* GET new - Booking Form */
router.get("/new/:id", checkUserLoggedIn, function(req, res, next) {
  async.parallel(
    [
      function(parallel_done) {
        const retrieveServiceDetails_query =
          "SELECT * from services where serviceID ='" + req.params.id + "';";
        pool.query(retrieveServiceDetails_query, function(err, services) {
          if (err) return parallel_done(err);
          return_data.serviceDetails = services;
          parallel_done();
        });
      },
      function(parallel_done) {
        pool.query(
          "select * from workers natural join accounts order by firstname asc;",
          function(err, workers) {
            if (err) return parallel_done(err);
            return_data.workers = workers;
            parallel_done();
          }
        );
      },
 
      function(parallel_done) {
        pool.query(
          "select * from availability where workerid in (SELECT workerid from services where serviceID = '" +
            req.params.id +
            "')order by starttime asc;",
          function(err, availability) {
            if (err) return parallel_done(err);
            return_data.availability = availability;
            parallel_done();
          }
        );
      },
      function(parallel_done) {
        pool.query("select discountid, promocode, percent, amount from discounts as D1 where not exists(select discountid from" +
        " billingDetails where discountid=D1.discountid);", function(err, discountCodes) {
          if (err) return parallel_done(err);
          return_data.discountCodes = discountCodes;
          parallel_done();
        });
      }
    ],
    function(err) {
      var datesAvailable = [];
      for (let i = 0; i < return_data.availability.rows.length; i++) {
        const daysBetweenDates = enumerateDaysBetweenDates(
          moment(return_data.availability.rows[i].starttime).startOf("day"),
          moment(return_data.availability.rows[i].endtime).startOf("day")
        );
        for (let j = 0; j < daysBetweenDates.length; j++) {
          datesAvailable.push(daysBetweenDates[j]);
        }
      }
      let uniquedatesAvailable = [...new Set(datesAvailable)];
      if (err) console.log(err);
      res.render("booking/new", {
        title: "New Booking",
        navCat: "booking",
        workers: return_data.workers.rows,
        loggedIn: req.user,
        serviceDetails: return_data.serviceDetails.rows,
        availability: return_data.availability.rows,
        datesAvailable: uniquedatesAvailable,
        discountCodes: return_data.discountCodes.rows
      });
    }
  );
});

/* POST create - Create Booking Action */
router.post("/new/create", checkUserLoggedIn, function(req, res, next) {
  // Retrieve Information
  const workTime = req.body.startTime;
  const parsedTime = workTime.split(" - ");
  const startTimeChosen = parsedTime[0];
  const endTimeChosen = parsedTime[1];
  const startTimeChosenTimestamp = moment(
    parsedTime[0],
    "ddd, MMM D, YYYY h:mm A"
  ).toISOString(true);
  const endTimeChosenTimestamp = moment(
    parsedTime[1],
    "ddd, MMM D, YYYY h:mm A"
  ).toISOString(true);
  const address = req.body.address;
  const comments = req.body.comments;
  const serviceID = req.body.serviceID;
  const userId = req.user.id;
  const cardNumber = req.body.cardNumber;
  const expDate = req.body.expDate;
  const cvv = req.body.cvv;
  const availabilityHidden = JSON.parse(req.body.availabilityHidden);
  const discountID =
    req.body.discountCode != "" ? req.body.discountCodeUserMatches : null;

  const retrieveServiceDetails_query =
    "SELECT * from services where serviceID = $1;";
  pool.query(
    retrieveServiceDetails_query,
    [serviceID],
    (err, retrieveServiceDetailsData) => {
      if (err) {
        genericError(req, res, "/booking/new/" + serviceID);
        return;
      }
      workerIDGlobal = retrieveServiceDetailsData.rows[0].workerid;

      const retrieveWorkerAccount_query =
        "SELECT * from accounts where id = $1;";
      pool.query(
        retrieveWorkerAccount_query,
        [retrieveServiceDetailsData.rows[0].workerid],
        (err, retrieveWorkerAccountData) => {
          if (err) {
            genericError(req, res, "/booking/new/" + serviceID);
            return;
          }
          const insertBillingDetails_query = discountID
            ? "INSERT into billingdetails (cardnumber,expdate, cvv, discountid) VALUES ($1, $2, $3, $4) returning billingid"
            : "INSERT into billingdetails (cardnumber,expdate, cvv) VALUES ($1, $2, $3) returning billingid";
          const bdQueryParams = [cardNumber, expDate, cvv];
          if (discountID) {
            bdQueryParams.push(discountID);
          }

          pool.query(
            insertBillingDetails_query,
            bdQueryParams,
            (err, insertBillingDetailsData) => {
              if (err || !insertBillingDetailsData.rows) {
                genericError(req, res, "/booking/new/" + serviceID);
                return;
              }
              const billingID = insertBillingDetailsData.rows[0].billingid;
              const insertBookingDetails_query =
                "INSERT into bookingdetails (starttime, endtime, address, comments, billingid, userid, workerid, serviceid) values($1, $2, $3, $4, $5, $6, $7, $8) returning bookingid";
              pool.query(
                insertBookingDetails_query,
                [
                  startTimeChosenTimestamp,
                  endTimeChosenTimestamp,
                  address,
                  comments,
                  billingID,
                  userId,
                  workerIDGlobal,
                  serviceID
                ],
                (err, insertBookingDetailsData) => {
                  if (err || !insertBookingDetailsData) {
                    genericError(req, res, "/booking/new/" + serviceID);
                    return;
                  } else {
                    updateAvailabilities(workerIDGlobal);
                  }
                  const bookingID = insertBookingDetailsData.rows[0].bookingid;

                  req.flash("success", "Booking created successfully!");
                  res.redirect("/booking/view/" + bookingID);
                }
              );
            }
          );
        }
      );
    }
  );

  function updateAvailabilities(workerID) {
    for (let i = 0; i < availabilityHidden.length; i++) {
      availabilityStart = moment(availabilityHidden[i].starttime).format(
        "YYYY-MM-DD HH:mm"
      );
      availabilityEnd = moment(availabilityHidden[i].endtime).format(
        "YYYY-MM-DD HH:mm"
      );
      let newAvailabilityStart = availabilityStart;
      let newAvailabilityEnd = availabilityEnd;
      let newAvailabilityStart2 = availabilityStart;
      let newAvailabilityEnd2 = availabilityEnd;
      const updateAvailability_query =
        "update availability SET starttime=$1, endtime=$2 where (workerid=$3 and starttime=$4)" +
        " and endtime=$5";
      let deleteAvailability_query = null;
      let insertAvailability_query = null;
      let shouldUpdate = true;
      if (
        moment(availabilityStart).isBefore(startTimeChosenTimestamp) &&
        moment(availabilityEnd).isAfter(endTimeChosenTimestamp)
      ) {
        newAvailabilityEnd = startTimeChosenTimestamp;
        newAvailabilityStart2 = endTimeChosenTimestamp;
        insertAvailability_query =
          "Insert into availability values($1, $2, $3)";
        deleteAvailability_query =
          "delete from availability where workerid=$1, starttime=$2, endtime=$3";
      } else if (
        moment(availabilityStart).isSame(startTimeChosenTimestamp) &&
        moment(availabilityEnd).isAfter(endTimeChosenTimestamp)
      ) {
        newAvailabilityStart = endTimeChosenTimestamp;

        [
          newAvailabilityStart,
          newAvailabilityEnd,
          workerID,
          availabilityStart,
          availabilityEnd
        ];
      } else if (
        moment(availabilityStart).isBefore(startTimeChosenTimestamp) &&
        moment(availabilityEnd).isSame(endTimeChosenTimestamp)
      ) {
        newAvailabilityEnd = startTimeChosenTimestamp;
        [
          newAvailabilityStart,
          newAvailabilityEnd,
          workerID,
          availabilityStart,
          availabilityEnd
        ];
      } else if (
        moment(availabilityStart).isSame(startTimeChosenTimestamp) &&
        moment(availabilityEnd).isSame(endTimeChosenTimestamp)
      ) {
        shouldUpdate = false;
        deleteAvailability_query =
          "delete from availability where workerid=$1, starttime=$2, endtime=$3;";
      } else {
        shouldUpdate = false;
      }

      if (shouldUpdate) {
        pool.query(
          updateAvailability_query,
          [
            newAvailabilityStart,
            newAvailabilityEnd,
            workerID,
            availabilityStart,
            availabilityEnd
          ],
          (err, updateAvailabilityData) => {}
        );
      }
      if (insertAvailability_query) {
        pool.query(
          insertAvailability_query,
          [workerID, newAvailabilityStart2, newAvailabilityEnd2],
          (err, insertAvailabilityData) => {}
        );
      }
      if (deleteAvailability_query) {
        pool.query(
          deleteAvailability_query,
          [workerID, availabilityStart, availabilityEnd],
          (err, deleteAvailabilityData) => {}
        );
      }
    }
  }
});

module.exports = router;
