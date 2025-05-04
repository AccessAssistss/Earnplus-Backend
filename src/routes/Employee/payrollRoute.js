const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createEmployeeCurrentPayroll,
  getCurrentPayrolls,
  createEmployeeBasePayroll,
  getBasePayrolls,
  createEmployeeHistoricalPayroll,
  getHistoricalPayrolls,
} = require("../../controllers/Employee/payrollController");

const router = express.Router();

// ##########----------Employee Current Payroll Routes----------##########
router.post(
  "/createEmployeeCurrentPayroll",
  validateToken,
  createEmployeeCurrentPayroll
);
router.get("/getCurrentPayrolls", validateToken, getCurrentPayrolls);

// ##########----------Employee Base Payroll Routes----------##########
router.post(
  "/createEmployeeBasePayroll",
  validateToken,
  createEmployeeBasePayroll
);
router.get("/getBasePayrolls", validateToken, getBasePayrolls);

// ##########----------Employee Historical Payroll Routes----------##########
router.post(
  "/createEmployeeHistoricalPayroll",
  validateToken,
  createEmployeeHistoricalPayroll
);
router.get("/getHistoricalPayrolls", validateToken, getHistoricalPayrolls);

module.exports = router;
