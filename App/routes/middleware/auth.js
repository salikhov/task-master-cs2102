// Function to check if user is logged in
function checkLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Function for checking if user is already logged in
function checkLoggedOut(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

module.exports.checkLoggedIn = checkLoggedIn;
module.exports.checkLoggedOut = checkLoggedOut;
