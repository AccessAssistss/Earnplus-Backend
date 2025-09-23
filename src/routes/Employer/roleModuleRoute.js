const express = require("express");
const {
  createModule,
  updateModule,
  softDeleteModule,
  createEmployerRole,
  updateEmployerRole,
  getAllEmployerRoles,
  softDeleteEmployerRole,
  getModulesByEmployerRole,
} = require("../../controllers/Employer/roleModuleController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

// ###############---------------Role Routes---------------###############
router.post("/createEmployerRole", validateToken, createEmployerRole);
router.put("/updateEmployerRole/:roleId", validateToken, updateEmployerRole);
router.get("/getAllEmployerRoles", validateToken, getAllEmployerRoles);
router.patch("/softDeleteEmployerRole/:roleId", softDeleteEmployerRole);

// ###############---------------Module Routes---------------###############
router.post("/createModule", validateToken, createModule);
router.put("/updateModule/:moduleId", validateToken, updateModule);
router.get("/getModulesByEmployerRole/:roleId", getModulesByEmployerRole);
router.patch("/softDeleteModule/:moduleId", softDeleteModule);

module.exports = router;
