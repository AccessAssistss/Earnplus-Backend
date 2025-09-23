const express = require("express");
const { CRIFCreditReport } = require("../../controllers/Associate/credentialController");

const router = express.Router();

router.post("/CRIFCreditReport", CRIFCreditReport);

module.exports = router;
