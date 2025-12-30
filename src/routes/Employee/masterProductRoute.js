const express = require("express");
const {
    getMasterProductsForCustomer,
    getMasterProductDetailsForCustomer,
    getMasterProductFields
} = require("../../controllers/Employee/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.get("/getMasterProductsForCustomer", validateToken, getMasterProductsForCustomer);
router.get("/getMasterProductDetailsForCustomer/:productId", validateToken, getMasterProductDetailsForCustomer);
router.get("/getMasterProductFields/:masterProductId", validateToken, getMasterProductFields);

module.exports = router;
