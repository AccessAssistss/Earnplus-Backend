const express = require("express");
const {
  registerAssociate,
  loginAssociate,
  addEmployerByAssociate,
  getEmployersByAssociate,
  deleteAssociate,
  verifyGSTAndPAN,
  getEmployerDetails,
  changeAssociatePassword,
} = require("../../controllers/Associate/authController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { EMPLOYER_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadEmployerFiles = createUploadMiddleware("employer", EMPLOYER_FILE_FIELDS);

router.post("/registerAssociate", registerAssociate);
router.post("/loginAssociate", loginAssociate);
router.patch("/changeAssociatePassword", validateToken, changeAssociatePassword);
router.post("/addEmployerByAssociate", validateToken, uploadEmployerFiles, multerErrorHandler, addEmployerByAssociate);
router.patch("/verifyGSTAndPAN", validateToken, verifyGSTAndPAN);
router.get("/getEmployersByAssociate", validateToken, getEmployersByAssociate);
router.get(
  "/getEmployerDetails/:employerId",
  validateToken,
  getEmployerDetails
);
router.delete("/deleteAssociate", validateToken, deleteAssociate);

module.exports = router;
