const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db");
const account = require("../db/account");
const { genericError } = require("../db/util");

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
  pool.query(
    "select bookingid,t3.name as cleaningname,price,starttime,endtime,address,firstname,lastname,email,t4.phone " +
      "as workerphone,userId from (select bookingid,starttime,endtime,address,t1.workerid as theworkerid,firstname,lastname,email, " +
      "t2.name,price,keepthis as userId from (select bookingid,starttime,endtime,address,workerid,serviceid,email, salt,firstname,lastname,userid " +
      "as keepthis from bookingdetails join accounts on (workerid = id)) as t1 join services as t2 on (t1.serviceid = t2.serviceid)) " +
      "as t3 join workers as t4 on (t3.theworkerid = t4.id) where userId = $1 ORDER by bookingid, price, starttime",
    [req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res);
        return;
      }
      res.render("account/index", {
        title: "Account",
        navCat: "account_view",
        bookings: data.rows,
        loggedIn: req.user
      });
    }
  );
});

/* GET - Edit account details */
router.get("/edit", checkLoggedIn, function(req, res, next) {
  pool.query(
    "select phone, address from users where id=$1",
    [req.user.id],
    function(err, userData) {
      if (err) {
        genericError(req, res);
        return;
      }
      pool.query(
        "select phone from workers where id=$1",
        [req.user.id],
        function(err, workerData) {
          if (err) {
            genericError(req, res);
            return;
          }
          res.render("account/edit", {
            title: "Edit Account",
            navCat: "account_edit",
            userData: userData.rows,
            workerData: workerData.rows,
            loggedIn: req.user
          });
        }
      );
    }
  );
});

/* POST update - Update account type */
router.post("/update_type", checkLoggedIn, function(req, res, next) {
  console.log(req.body);
  if (!(req.body.userCheck || req.body.workerCheck) && !req.user.isadmin) {
    req.flash("warning", "You must select at least one account type!");
    res.redirect("/account/edit");
    return;
  }
  if (
    (req.user.isuser && req.body.userCheck == undefined) ||
    (req.user.isworker && req.body.workerCheck == undefined)
  ) {
    req.flash(
      "warning",
      "You cannot disable account types your account already belongs to!"
    );
    res.redirect("/account/edit");
    return;
  }
  pool.connect(function(err, client, done) {
    function abort(err) {
      if (err) {
        client.query("rollback", function(err) {
          done();
        });
        req.flash(
          "danger",
          "Something went wrong while updating your account type"
        );
        res.redirect("/account/edit");
        return true;
      }
      return false;
    }
    client.query("begin; set constraints all deferred;", function(err, res1) {
      if (abort(err)) return;
      let failed = false;
      if (!req.user.isuser && req.body.userCheck) {
        client.query(
          "insert into users (id) values ($1)",
          [req.user.id],
          function(err, res2) {
            if (abort(err)) {
              failed = true;
              return;
            }
          }
        );
      }
      if (!req.user.isworker && req.body.workerCheck) {
        client.query(
          "insert into workers (id) values ($1)",
          [req.user.id],
          function(err, res3) {
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
          req.flash("success", "Update account type");
          res.redirect("/account/edit");
        });
      } else {
        done();
        req.flash(
          "danger",
          "Something went wrong while updating your account type"
        );
        res.redirect("/account/edit");
      }
    });
  });
});

/* POST update - Edit account action */
router.post("/update1", checkLoggedIn, function(req, res, next) {
  if (req.body.password != "" && req.body.password !== req.body.confirm) {
    req.flash(
      "warning",
      "Make sure you type the same password in both fields!"
    );
    res.redirect("/account/edit");
    return;
  }
  const userChanged =
    (req.user.isuser && !req.body.userCheck) ||
    (req.body.userCheck && !req.user.isuser);
  const workerChanged =
    (req.user.isworker && !req.body.workerCheck) ||
    (req.body.workerCheck && !req.user.isworker);
  if (!(req.body.userCheck || req.body.workerCheck) && !req.user.isadmin) {
    req.flash("warning", "You must select at least one account type!");
    res.redirect("/account/edit");
    return;
  }
  if (
    (req.user.isuser && req.body.userCheck == undefined) ||
    (req.user.isworker && req.body.workerCheck == undefined)
  ) {
    req.flash(
      "warning",
      "You cannot disable account types your account already belongs to!"
    );
    res.redirect("/account/edit");
    return;
  }
  pool.query(
    "update accounts set firstName=$1, lastName=$2 where id=$3",
    [req.body.firstName, req.body.lastName, req.user.id],
    function(err, updateData) {
      if (err) {
        req.flash(
          "danger",
          "Something went wrong during the update." + (req.body.password != "")
            ? " Your password was not changed."
            : ""
        );
        return;
      }
      if (req.body.password != "") {
        const salt = account.generateSalt();
        const hash = account.getPasswordHash(salt, req.body.password);
        pool.query(
          "update accounts set salt=$1, hash=$2 where id=$3",
          [salt, hash, req.user.id],
          function(err, updateData) {
            if (err) {
              req.flash(
                "danger",
                "Something went wrong during the update. Your password was not changed."
              );
              return;
            }
            req.flash("success", "Account information and password updated");
            if (userChanged || workerChanged) {
              res.redirect(307, "/account/update_type");
            } else {
              res.redirect("/account/edit");
            }
          }
        );
      } else {
        req.flash("success", "Account information updated");
        if (userChanged || workerChanged) {
          res.redirect(307, "/account/update_type");
        } else {
          res.redirect("/account/edit");
        }
      }
    }
  );
});

/* POST update - Edit user action */
router.post("/update2", checkLoggedIn, function(req, res, next) {
  pool.query(
    "update users set phone=$1, address=$2 where id=$3",
    [req.body.userPhone, req.body.address, req.user.id],
    function(err, updateData) {
      if (err) {
        genericError(req, res, "/account/edit");
      }
      req.flash("success", "User details updated");
      res.redirect("/account/edit");
    }
  );
});

/* POST update - Edit worker action */
router.post("/update3", checkLoggedIn, function(req, res, next) {
  pool.query(
    "update workers set phone=$1 where id=$2",
    [req.body.workerPhone, req.user.id],
    function(err, updateData) {
      if (err) {
        genericError(req, res, "/account/edit");
      }
      req.flash("success", "Worker details updated");
      res.redirect("/account/edit");
    }
  );
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
