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
  RegisterEmployee,
  addEmployeeBank,
  getEmployeeBanks,
  getEmployeeProfile,
  updateEmployeeProfile,
  cardController,
  deleteEmployee,
  getCreditReport,
  requestInactivation,
  requestReactivation
} = require("../../controllers/Employee/authController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/sendUserOTP", sendUserOTP);
router.post("/verifyOTP", verifyOTP);
router.post("/RegisterEmployee", validateToken, RegisterEmployee);
router.put("/updateEmployeeProfile", validateToken, updateEmployeeProfile);
router.get("/getEmployeeProfile", validateToken, getEmployeeProfile);
router.post("/addEmployeeBank", validateToken, addEmployeeBank);
router.get("/getEmployeeBanks", validateToken, getEmployeeBanks);
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
router.get("/cardController", cardController);
router.post("/requestInactivation", validateToken, requestInactivation);
router.post("/requestReactivation", requestReactivation);
router.post("/pullCreditReport", validateToken, getCreditReport);

module.exports = router;
