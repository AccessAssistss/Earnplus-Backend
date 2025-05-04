const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createEmployerSubAdmin,
  loginEmployerSubAdmin,
  deleteEmployerSubAdmin,
  updateEmployerSubAdmin,
} = require("../../controllers/Employer/employerSubAdminController");

const router = express.Router();

router.post("/createEmployerSubAdmin", validateToken, createEmployerSubAdmin);
router.post("/loginEmployerSubAdmin", loginEmployerSubAdmin);
router.put(
  "/updateEmployerSubAdmin/:subAdminId",
  validateToken,
  updateEmployerSubAdmin
);
router.delete("/deleteEmployerSubAdmin", validateToken, deleteEmployerSubAdmin);

module.exports = router;
