const express = require("express");
const router = express.Router();
const { checkAdminLoggedIn } = require("./middleware/auth");
const pool = require("../db");

const { genericError } = require("../db/util");

/* GET index - Admin Panel Page */
router.get("/", checkAdminLoggedIn, function(req, res, next) {
  const workerRatingsQuery = ``;

  const topReferralQuery = `select U.id, U.firstname, U.lastname, count(distinct R.email) from accounts U
  left join refers R on R.referrerid = U.id
  where exists (select 1 from accounts A where A.email = R.email)
  or not exists (select 1 from refers R1 where R1.referrerid = U.id)
  group by U.id having count(distinct R.email) <> 0
  limit 3`;

  pool.query(workerRatingsQuery, function(err, data1) {
    pool.query(topReferralQuery, function(err, data2) {
      res.render("admin/index", {
        title: "Admin Panel",
        navCat: "admin",
        aNavCat: "index",
        mostRefers: data2.rows,
        loggedIn: req.user
      });
    });
  });
});

router.get("/approval", checkAdminLoggedIn, function(req, res, next) {
  const unapprovedWorkersQuery = `select W.id, A.firstname, A.lastname from workers W join accounts A on A.id = W.id
  where not exists (select 1 from approves A where A.workerid = W.id and A.approved = true)`;
  const approvedWorkersQuery = `select W.workerid, A.firstname, A.lastname from approves W join accounts A on A.id = W.workerid
  where W.approved = true`;
  pool.query(unapprovedWorkersQuery, function(err, data1) {
    if (err) {
      genericError(req, res, "/admin");
      return;
    }
    pool.query(approvedWorkersQuery, function(err, data2) {
      if (err) {
        genericError(req, res, "/admin");
        return;
      }
      res.render("admin/approval", {
        title: "Admin Panel",
        navCat: "admin",
        aNavCat: "approval",
        needApproval: data1.rows,
        approved: data2.rows,
        loggedIn: req.user
      });
    });
  });
});

router.get("/approval/:id", checkAdminLoggedIn, function(req, res, next) {
  pool.query(
    "insert into approves (workerid, approved, adminid) values ($1, $2, $3)",
    [req.params.id, true, req.user.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/admin/approval");
        return;
      }
      req.flash("success", "Worker approved!");
      res.redirect("/admin/approval");
    }
  );
});

router.get("/approval/revoke/:id", checkAdminLoggedIn, function(
  req,
  res,
  next
) {
  pool.query(
    "delete from approves where workerid=$1",
    [req.params.id],
    function(err, data) {
      if (err) {
        genericError(req, res, "/admin/approval");
        return;
      }
      req.flash("success", "Approval revoked!");
      res.redirect("/admin/approval");
    }
  );
});

router.get("/monitoring", checkAdminLoggedIn, function(req, res, next) {
  pool.query("select * from monitors where adminid=$1", [req.user.id], function(
    err,
    data
  ) {
    if (err) {
      genericError(req, res, "/admin");
      return;
    }
    res.render("admin/monitoring", {
      title: "Admin Panel",
      navCat: "admin",
      aNavCat: "monit",
      monit: data.rows,
      loggedIn: req.user
    });
  });
});

module.exports = router;
