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
  getAllModules,
} = require("../../controllers/Associate/roleModuleController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { MODULE_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadModuleFiles = createUploadMiddleware("module", MODULE_FILE_FIELDS);

// ###############---------------Role Routes---------------###############
router.post("/createRole", validateToken, createRole);
router.put("/updateRole/:roleId", validateToken, updateRole);
router.get("/getAllRoles", validateToken, getAllRoles);
router.patch("/softDeleteRole/:roleId", softDeleteRole);

// ###############---------------Module Routes---------------###############
router.post("/createModule", validateToken, uploadModuleFiles, multerErrorHandler, createModule);
router.put("/updateModule/:moduleId", validateToken, uploadModuleFiles, multerErrorHandler, updateModule);
router.get("/getModulesByRole/:roleId", getModulesByRole);
router.get("/getAllModules", getAllModules);
router.patch("/softDeleteModule/:moduleId", softDeleteModule);

module.exports = router;
