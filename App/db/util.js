function genericError(req, res) {
  genericError(req, res, "/");
}

function genericError(req, res, redirect) {
  req.flash("error", "Something bad happened, please try again later!");
  res.redirect(redirect);
}

module.exports.genericError = genericError;
