const express = require("express");
const {
  registerEmployer,
  loginEmployer,
  getEmployeesByEmployer,
  deleteEmployer,
  addEmployeeByEmployer,
  handleEmployerActivationStatus,
  EmployerProfileCompletion,
  addEmployerWorkLocation,
  addEmployerCompanyPolicy,
  addEmployerContractType,
  getEmployerProfile,
  getEmployeeProfile,
} = require("../../controllers/Employer/authController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/registerEmployer", registerEmployer);
router.post("/loginEmployer", loginEmployer);
router.patch(
  "/EmployerProfileCompletion",
  validateToken,
  EmployerProfileCompletion
);
router.patch(
  "/addEmployerWorkLocation",
  validateToken,
  addEmployerWorkLocation
);
router.patch(
  "/addEmployerCompanyPolicy",
  validateToken,
  addEmployerCompanyPolicy
);
router.patch(
  "/addEmployerContractType",
  validateToken,
  addEmployerContractType
);
router.post("/addEmployeeByEmployer", validateToken, addEmployeeByEmployer);
router.get("/getEmployeesByEmployer", validateToken, getEmployeesByEmployer);
router.get("/getEmployeeProfile/:id", validateToken, getEmployeeProfile);
router.patch(
  "/handleEmployerActivationStatus",
  validateToken,
  handleEmployerActivationStatus
);
router.get("/getEmployerProfile", validateToken, getEmployerProfile);
router.delete("/deleteEmployer", validateToken, deleteEmployer);

module.exports = router;
