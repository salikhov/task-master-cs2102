const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");

// Use dotenv package to load custom .env file
require("dotenv").load();

const pool = require("./db");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Express Session
app.use(
  session({
    secret: "sql",
    resave: true,
    saveUninitialized: true
  })
);

/* Body Parser */
app.use(bodyParser.urlencoded({ extended: true }));

/* Passport Setup */
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
  cb(null, user.userid);
});

passport.deserializeUser(function(user, cb) {
  pool.query(
    "select userId, firstName, lastName from users where userId=$1",
    [user],
    function(err, data) {
      cb(err, data.rows[0]);
    }
  );
});

const LocalStrategy = require("passport-local").Strategy;
passport.use(
  "local",
  new LocalStrategy(function(username, password, done) {
    pool.query(
      "select userId, firstName, lastName from users where userId=$1",
      [username],
      function(err, data) {
        if (err) return done(err);
        if (data.rowCount === 0) return done(null, false);
        return done(null, data.rows[0]);
      }
    );
  })
);

app.use(express.static('public'));

/* Different routers and stuff */
const indexRouter = require("./routes/index");
const searchRouter = require("./routes/search");
const bookingFormRouter = require('./routes/bookingForm');
const bookingSummaryRouter = require('./routes/bookingSummary');
app.use("/", indexRouter);
app.use("/search", searchRouter);
app.use('/bookingForm', bookingFormRouter);
app.use('/bookingSummary', bookingSummaryRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
