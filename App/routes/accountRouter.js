const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");
const account = require("../db/account");

const {
  checkLoggedIn,
  checkLoggedOut,
  checkUserLoggedIn
} = require("./middleware/auth");

/* =====================================
   ========= HELPER FUNCTIONS ==========
   ===================================== */
function failRegister(req, res) {
  req.flash("error", "Something bad happened, please try again later!");
  res.redirect("/account/register");
}

/* =====================================
   ========== AUTHENTICATION ===========
   ===================================== */

/* GET login - Login Form */
router.get("/login", checkLoggedOut, function(req, res, next) {
  res.render("account/login", {
    title: "Login",
    navCat: "login",
    loggedIn: req.user
  });
});

/* POST login - Login Action */
router.post(
  "/login",
  checkLoggedOut,
  passport.authenticate("local", {
    failureRedirect: "/account/login",
    failureFlash: true
  }),
  function(req, res) {
    req.flash("success", "You have successfully logged in!");
    res.redirect("/");
  }
);

/* GET/POST logout - Logout Action */
router.all("/logout", checkLoggedIn, function(req, res, next) {
  req.logout();
  req.flash("success", "You have been logged out!");
  res.redirect("/");
});

/* =====================================
   =========== REGISTRATION ============
   ===================================== */

/* GET register - Registration Page */
router.get("/register", checkLoggedOut, function(req, res, next) {
  res.render("account/register", {
    title: "Register",
    navCat: "register",
    loggedIn: req.user
  });
});

/* POST register - Registration Action */
router.post("/register", checkLoggedOut, function(req, res, next) {
  if (req.body.password !== req.body.confirm) {
    req.flash(
      "warning",
      "Make sure you type the same password in both fields!"
    );
    res.redirect("/account/register");
    return;
  }
  if (!(req.body.userCheck || req.body.workerCheck)) {
    req.flash("warning", "You must select at least one account type!");
    res.redirect("/account/register");
    return;
  }
  pool.query(
    "select 1 from accounts where email=$1;",
    [req.body.email],
    function(err, data) {
      if (err) {
        failRegister(req, res);
      } else {
        if (data.rowCount === 0) {
          const salt = account.generateSalt();
          const hash = account.getPasswordHash(salt, req.body.password);
          pool.connect(function(err, client, done) {
            console.log("connected");
            function abort(err) {
              if (err) {
                client.query("rollback", function(err) {
                  done();
                });
                failRegister(req, res);
                return true;
              }
              return false;
            }
            client.query("begin; set constraints all deferred;", function(
              err,
              res1
            ) {
              if (abort(err)) return;
              client.query(
                "insert into accounts (email, salt, hash, firstName, lastName) VALUES ($1, $2, $3, $4, $5) returning id;",
                [
                  req.body.email,
                  salt,
                  hash,
                  req.body.firstName,
                  req.body.lastName
                ],
                function(err, res2) {
                  if (abort(err)) return;
                  const id = res2.rows[0].id;
                  const failed = false;
                  if (req.body.userCheck) {
                    client.query(
                      "insert into users (id) values ($1)",
                      [id],
                      function(err, res3) {
                        if (abort(err)) {
                          failed = true;
                          return;
                        }
                      }
                    );
                  }
                  if (req.body.workerCheck && !failed) {
                    client.query(
                      "insert into workers (id) values ($1)",
                      [id],
                      function(err, res4) {
                        if (abort(err)) {
                          failed = true;
                          return;
                        }
                      }
                    );
                  }
                  if (!failed) {
                    client.query("commit", function(err, res5) {
                      if (abort(err)) return;
                      done();
                      req.flash(
                        "success",
                        "Created account, you may now login."
                      );
                      res.redirect("/account/login");
                    });
                  } else {
                    done();
                    failRegister(req, res);
                  }
                }
              );
            });
          });
        } else {
          req.flash("warning", "An account with that email already exists!");
          res.redirect("/account/login");
        }
      }
    }
  );
});

/* =====================================
   ============= OPERATIONS ============
   ===================================== */

/* GET - Summary page (profile) */
router.get("/", checkLoggedIn, function(req, res, next) {
  res.render("account/index", {
    title: "Account",
    navCat: "account",
    loggedIn: req.user
  });
});

/* GET edit - Edit account details */
router.get("/edit", checkLoggedIn, function(req, res, next) {
  res.render("account/edit", {
    title: "Edit Account",
    navCat: "account",
    loggedIn: req.user
  });
});

/* PUT update - Edit account action */
router.put("/update", checkLoggedIn, function(req, res, next) {
  // This is where the stuff that actually updates the account goes
});

/* GET refer - Referral page */
router.get("/refer", checkUserLoggedIn, function(req, res, next) {
  res.render("account/refer", {
    title: "Refer a Friend",
    navCat: "account",
    loggedIn: req.user
  });
});

/* POST refer - Referral action */
router.post("/refer", checkUserLoggedIn, function(req, res, next) {
  res.json(req.body.email);
});

module.exports = router;
