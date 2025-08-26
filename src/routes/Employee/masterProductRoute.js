const express = require("express");
const {
    getMasterProductsForCustomer,
    getMasterProductDetailsForCustomer,
    getMasterProductFields,
    getSubFieldsByFieldAndDropdown
} = require("../../controllers/Employee/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.get("/getMasterProductsForCustomer", validateToken, getMasterProductsForCustomer);
router.get("/getMasterProductDetailsForCustomer/:productId", validateToken, getMasterProductDetailsForCustomer);
router.get("/getMasterProductFields/:masterProductId", validateToken, getMasterProductFields);
router.get("/getSubFieldsByFieldAndDropdown/:masterProductId", validateToken, getSubFieldsByFieldAndDropdown);

module.exports = router;
