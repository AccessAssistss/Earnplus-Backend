const express = require("express");
const router = express.Router();
const { CRIFCreditReport } = require("../controllers/crifController");

router.post("/CRIFCreditReport", CRIFCreditReport);

module.exports = router;
