const async = require("async");
const express = require("express");
const router = express.Router();
const { checkLoggedIn } = require("./middleware/auth");
const pool = require("../db");

let return_data = {};

// GET
router.get("/new", checkLoggedIn, function(req, res, next) {
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
        pool.query("select * from workers order by firstname asc", function(
          err,
          workers
        ) {
          if (err) return parallel_done(err);
          return_data.workers = workers;
          parallel_done();
        });
      }
    ],
    function(err) {
      if (err) console.log(err);
      res.render("booking/bookingNew", {
        title: "New Booking",
        navCat: "booking",
        workers: return_data.workers.rows,
        services: return_data.services.rows,
        loggedIn: req.user
      });
    }
  );
});

// POST
router.post("/create", checkLoggedIn, function(req, res, next) {
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

          pool.query(retrieveBookingID_query, (err, data5) => {
            res.render("booking/bookingSummary", {
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
