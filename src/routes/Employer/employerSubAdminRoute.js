const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createEmployerSubAdmin,
  loginEmployerSubAdmin,
  deleteEmployerSubAdmin,
  updateEmployerSubAdmin,
  getEmployerSubAdminsByEmployer,
  updateEmployerSubAdminActiveStatus,
  deleteSubAdminByEmployer,
} = require("../../controllers/Employer/employerSubAdminController");

const router = express.Router();

router.post("/createEmployerSubAdmin", validateToken, createEmployerSubAdmin);
router.post("/loginEmployerSubAdmin", loginEmployerSubAdmin);
router.put(
  "/updateEmployerSubAdmin/:subAdminId",
  validateToken,
  updateEmployerSubAdmin
);
router.patch(
  "/updateEmployerSubAdminActiveStatus/:subAdminId",
  validateToken,
  updateEmployerSubAdminActiveStatus
);
router.get("/getEmployerSubAdminsByEmployer", validateToken, getEmployerSubAdminsByEmployer);
router.delete("/deleteEmployerSubAdmin", validateToken, deleteEmployerSubAdmin);
router.delete("/deleteSubAdminByEmployer/:subAdminId", validateToken, deleteSubAdminByEmployer);

module.exports = router;
