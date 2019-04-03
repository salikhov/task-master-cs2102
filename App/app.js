const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");
const flash = require("express-flash");

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
app.use(flash());

// Express Session
app.use(
  session({
    secret: process.env.SECRET,
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
  cb(null, user.id);
});

passport.deserializeUser(function(user, cb) {
  pool.query(
    "select id, email, firstName, lastName, isUser, isWorker, isAdmin from accounts natural join accountTypes where id=$1",
    [user],
    function(err, data) {
      cb(err, data.rows[0]);
    }
  );
});

const { getPasswordHash } = require("./db/account");
const LocalStrategy = require("passport-local").Strategy;
passport.use(
  "local",
  new LocalStrategy(function(email, password, done) {
    pool.query("select salt from accounts where email=$1", [email], function(
      err,
      data
    ) {
      if (err) return done(err);
      if (data.rowCount === 0)
        return done(null, false, {
          message: "You entered an incorrect email or password!"
        });
      pool.query(
        "select id, email, firstName, lastName, isUser, isWorker, isAdmin from accounts natural join accountTypes where email=$1 and hash=$2",
        [email, getPasswordHash(data.rows[0].salt, password)],
        function(err, data) {
          if (err) return done(err);
          if (data.rowCount === 0)
            return done(null, false, {
              message: "You entered an incorrect email or password!"
            });
          return done(null, data.rows[0]);
        }
      );
    });
  })
);

app.use(express.static("public"));

/* Different routers and stuff */
const indexRouter = require("./routes/indexRouter");
const bookingRouter = require("./routes/bookingRouter");
const servicesRouter = require("./routes/servicesRouter");
const accountRouter = require("./routes/accountRouter");
const adminRouter = require("./routes/adminRouter");
const workerRouter = require("./routes/workerRouter");
app.use("/", indexRouter);
app.use("/booking", bookingRouter);
app.use("/services", servicesRouter);
app.use("/account", accountRouter);
app.use("/admin", adminRouter);
app.use("/worker", workerRouter);

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
