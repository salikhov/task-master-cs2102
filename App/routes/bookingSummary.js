var express = require('express');
var router = express.Router();

// GET
router.get("/", function(req, res, next) {
        res.render("booking/bookingSummary", {
            loggedIn: req.user,
            title: "Booking Summary"
    });
});

module.exports = router;