const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/employerSubAdmin", require("./employerSubAdminRoute"));

module.exports = router;
