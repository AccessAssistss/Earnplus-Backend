const express = require("express");
const {
  verifyGSTAndPAN,
  getEmployerDetails,
  loginAssociateSubAdmin,
  addEmployerByAssociateSubAdmin,
  getEmployersByAssociateSubAdmin,
  deleteAssociateSubAdmin,
  createAssociateSubAdmin,
  updateAssociateSubAdmin,
  deactivateAssociateSubAdmin,
  getAssociateSubAdmins,
  deleteAssociateSubAdminByAssociate,
} = require("../../controllers/Associate/associateSubAdminController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { EMPLOYER_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadEmployerFiles = createUploadMiddleware("employer", EMPLOYER_FILE_FIELDS);

router.post("/createAssociateSubAdmin", validateToken, createAssociateSubAdmin);
router.post("/loginAssociateSubAdmin", loginAssociateSubAdmin);
router.put(
  "/updateAssociateSubAdmin/:subAdminId",
  validateToken,
  updateAssociateSubAdmin
);
router.patch(
  "/deactivateAssociateSubAdmin/:subAdminId",
  validateToken,
  deactivateAssociateSubAdmin
);
router.get(
  "/getAssociateSubAdmins",
  validateToken,
  getAssociateSubAdmins
);
router.post(
  "/addEmployerByAssociateSubAdmin", validateToken, uploadEmployerFiles, multerErrorHandler, addEmployerByAssociateSubAdmin
);
router.patch("/verifyGSTAndPAN", validateToken, verifyGSTAndPAN);
router.get(
  "/getEmployersByAssociateSubAdmin",
  validateToken,
  getEmployersByAssociateSubAdmin
);
router.get(
  "/getEmployerDetails/:employerId",
  validateToken,
  getEmployerDetails
);
router.delete(
  "/deleteAssociateSubAdmin",
  validateToken,
  deleteAssociateSubAdmin
);
router.delete(
  "/deleteAssociateSubAdminByAssociate/:userId",
  deleteAssociateSubAdminByAssociate
);

module.exports = router;
