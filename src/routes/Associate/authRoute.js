const express = require("express");
const {
  registerAssociate,
  loginAssociate,
  getEmployersByAssociate,
  deleteAssociate,
  verifyGSTAndPAN,
  getEmployerDetails,
  changeAssociatePassword,
} = require("../../controllers/Associate/authController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/registerAssociate", registerAssociate);
router.post("/loginAssociate", loginAssociate);
router.patch("/changeAssociatePassword", validateToken, changeAssociatePassword);
router.patch("/verifyGSTAndPAN", validateToken, verifyGSTAndPAN);
router.get("/getEmployersByAssociate", validateToken, getEmployersByAssociate);
router.get(
  "/getEmployerDetails/:employerId",
  validateToken,
  getEmployerDetails
);
router.delete("/deleteAssociate", validateToken, deleteAssociate);

module.exports = router;
