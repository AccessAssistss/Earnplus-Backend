const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createVKYCLinkForCustomer, getVKYCDataPointDetails } = require("../../controllers/AssociateSubAdmin/vkycController.js");

const router = express.Router();

router.post("/createVKYCLinkForCustomer/:loanApplicationId", validateToken, createVKYCLinkForCustomer);
router.get("/getVKYCDataPointDetails/:loanApplicationId", getVKYCDataPointDetails);

module.exports = router;
