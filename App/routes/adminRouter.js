const express = require("express");
const router = express.Router();
const { checkAdminLoggedIn } = require("./middleware/auth");
const pool = require("../db");

/* GET index - Admin Panel Page */
router.get("/", checkAdminLoggedIn, function(req, res, next) {

  pool.query("select workerid, approved, firstname, lastname from (select * from approves where approved = false) as t1 join accounts on accounts.id = t1.workerid",
   function(err,data1){
    
    pool.query("select workerid, firstname, lastname, averagerating, minrating, maxrating from (select workerid, avg(rating) as averagerating,min(rating) as minrating,max(rating) as maxrating from reviews group by workerid) as t1 join accounts on accounts.id = t1.workerid",
    function(err,data2){
      
      pool.query("select serviceid, active, adminid from monitors where adminid = $1", [req.user.id],function(err,data3){

    res.render("admin/index", {
    title: "Admin Panel",
    navCat: "admin",
    notapprovedusers: data1.rows,
    workerratings: data2.rows,
    monit: data3.rows,
    loggedIn: req.user
  });
});
});
});
});

module.exports = router;
