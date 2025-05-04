const express = require("express");
const {
  createMasterProduct,
  getAllMasterProducts,
  getMasterProductDetails,
} = require("../../controllers/Associate/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/createMasterProduct", validateToken, createMasterProduct);
router.get("/getAllMasterProducts", validateToken, getAllMasterProducts);
router.get("/getMasterProductDetails/:productId", validateToken, getMasterProductDetails);

module.exports = router;
