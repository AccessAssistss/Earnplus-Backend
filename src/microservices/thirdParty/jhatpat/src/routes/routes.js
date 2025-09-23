const express = require("express");
const router = express.Router();

router.use("/crif", require("./crifRoute"));

module.exports = router;
