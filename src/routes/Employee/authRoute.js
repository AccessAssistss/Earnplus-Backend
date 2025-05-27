const express = require("express");
const {
  sendUserOTP,
  verifyOTP,
  verifyEmployeeEmployerLink,
  handleSendAadhaarOtp,
  handleVerifyAadhaarOtp,
  verifyEmployeePan,
  checkEmployeePanStatus,
  faceLiveliness,
} = require("../../controllers/Employee/authController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/sendUserOTP", sendUserOTP);
router.post("/verifyOTP", verifyOTP);
router.patch(
  "/verifyEmployeeEmployerLink",
  validateToken,
  verifyEmployeeEmployerLink
);
router.patch("/handleSendAadhaarOtp", validateToken, handleSendAadhaarOtp);
router.patch("/handleVerifyAadhaarOtp", validateToken, handleVerifyAadhaarOtp);
router.patch("/verifyEmployeePan", validateToken, verifyEmployeePan);
router.patch("/faceLiveliness", validateToken, faceLiveliness);
router.patch("/checkEmployeePanStatus", validateToken, checkEmployeePanStatus);

module.exports = router;
