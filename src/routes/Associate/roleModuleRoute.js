const express = require("express");
const {
  createRole,
  updateRole,
  getAllRoles,
  softDeleteRole,
  createModule,
  updateModule,
  getModulesByRole,
  softDeleteModule,
} = require("../../controllers/Associate/roleModuleController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

// ###############---------------Role Routes---------------###############
router.post("/createRole", validateToken, createRole);
router.put("/updateRole/:roleId", validateToken, updateRole);
router.get("/getAllRoles", validateToken, getAllRoles);
router.patch("/softDeleteRole/:roleId", softDeleteRole);

// ###############---------------Module Routes---------------###############
router.post("/createModule", validateToken, createModule);
router.put("/updateModule/:moduleId", validateToken, updateModule);
router.get("/getModulesByRole/:roleId", getModulesByRole);
router.patch("/softDeleteModule/:moduleId", softDeleteModule);

module.exports = router;
