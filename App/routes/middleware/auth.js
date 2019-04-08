const pool = require("../../db/index");

function nullFunction() {}

// Function to check if user is logged in
function checkLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("warning", "You must be logged in to access that page!");
  res.redirect("/account/login");
  return false;
}

// Function for checking if user is already logged in
function checkLoggedOut(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  req.flash("info", "You are already logged in!");
  res.redirect("/");
  return false;
}

// Function for checking that the user type account is created
function checkUserLoggedIn(req, res, next) {
  if (checkLoggedIn(req, res, nullFunction) !== false) {
    if (req.user.isuser) {
      return next();
    } else {
      req.flash("warning", "You cannot access that page!");
      res.redirect("/");
    }
  }
}

// Function for checking that the worker type account is created
function checkWorkerLoggedIn(req, res, next) {
  if (checkLoggedIn(req, res, nullFunction) !== false) {
    pool.query(
      "select 1 from approves where workerid=$1 and approved=true",
      [req.user.id],
      function(err, data) {
        if (err || !req.user.isworker) {
          req.flash("warning", "You cannot access that page!");
          res.redirect("/");
          return;
        } else if (data.rowCount === 0) {
          req.flash(
            "warning",
            "You cannot access that functionality until you get approved by an administrator!"
          );
          res.redirect("/");
          return;
        } else {
          return next();
        }
      }
    );
  }
}

// Function for checking that the admin type account is created
function checkAdminLoggedIn(req, res, next) {
  if (checkLoggedIn(req, res, nullFunction) !== false) {
    if (req.user.isadmin) {
      return next();
    } else {
      req.flash("warning", "You cannot access that page!");
      res.redirect("/");
    }
  }
}

module.exports.checkLoggedIn = checkLoggedIn;
module.exports.checkUserLoggedIn = checkUserLoggedIn;
module.exports.checkLoggedOut = checkLoggedOut;
module.exports.checkWorkerLoggedIn = checkWorkerLoggedIn;
module.exports.checkAdminLoggedIn = checkAdminLoggedIn;
