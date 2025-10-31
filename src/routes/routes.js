const express = require("express");

const router = express.Router();

router.use("/associate", require("./Associate/routes"));
router.use("/employer", require("./Employer/routes"));
router.use("/employee", require("./Employee/routes"));

module.exports = router;