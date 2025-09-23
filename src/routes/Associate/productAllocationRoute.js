const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  allocateProductToEmployer,
  getAllocatedProductsToEmployers,
} = require("../../controllers/Associate/productAllocationController");

const router = express.Router();

router.post(
  "/allocateProductToEmployer",
  validateToken,
  allocateProductToEmployer
);
router.get(
  "/getAllocatedProductsToEmployers",
  validateToken,
  getAllocatedProductsToEmployers
);

module.exports = router;
