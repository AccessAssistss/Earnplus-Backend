const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createKYCRequest, getKYCRequest, updateKYCStatus, updateKYCStatus, getKYCDetails } = require("../../controllers/Employee/kycController");

const router = express.Router();

router.post("/createKYCRequest", validateToken, createKYCRequest);
router.get("/getKYCRequest", validateToken, getKYCRequest);
router.get("/getKYCDetails", validateToken, getKYCDetails);
router.patch("/updateKYCStatus", validateToken, updateKYCStatus);

module.exports = router;
