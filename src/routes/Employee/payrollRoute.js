const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createEmployeeCurrentPayroll,
  getCurrentPayrolls,
  createEmployeeBasePayroll,
  getBasePayrolls,
  createEmployeeHistoricalPayroll,
  getHistoricalPayrolls,
  bulkUploadEmployeeCurrentPayroll,
  bulkUploadEmployeeBasePayroll,
  bulkUploadEmployeeHistoricalPayroll,
} = require("../../controllers/Employee/payrollController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const router = express.Router();

// ##########----------Employee Current Payroll Routes----------##########
router.post(
  "/createEmployeeCurrentPayroll",
  validateToken,
  createEmployeeCurrentPayroll
);
router.post(
  "/bulkUploadEmployeeCurrentPayroll",
  validateToken,
  upload.single("file"),
  bulkUploadEmployeeCurrentPayroll
);
router.get("/getCurrentPayrolls", validateToken, getCurrentPayrolls);

// ##########----------Employee Base Payroll Routes----------##########
router.post(
  "/createEmployeeBasePayroll",
  validateToken,
  createEmployeeBasePayroll
);
router.post(
  "/bulkUploadEmployeeBasePayroll",
  validateToken,
  upload.single("file"),
  bulkUploadEmployeeBasePayroll
);
router.get("/getBasePayrolls", validateToken, getBasePayrolls);

// ##########----------Employee Historical Payroll Routes----------##########
router.post(
  "/createEmployeeHistoricalPayroll",
  validateToken,
  createEmployeeHistoricalPayroll
);
router.post(
  "/bulkUploadEmployeeHistoricalPayroll",
  validateToken,
  upload.single("file"),
  bulkUploadEmployeeHistoricalPayroll
);
router.get("/getHistoricalPayrolls", validateToken, getHistoricalPayrolls);

module.exports = router;
