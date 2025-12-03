const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
    submitVariantProductDeleteRequest,
    getAllVariantProductDeleteRequests,
    getVariantProductDeleteRequestDetail,
    handleVariantProductDeleteRequest,
} = require("../../controllers/Associate/variantProductDeleteRequestController");

const router = express.Router();

router.post("/submitVariantProductDeleteRequest", validateToken, submitVariantProductDeleteRequest);
router.patch("/handleVariantProductDeleteRequest/:requestId", validateToken, handleVariantProductDeleteRequest);
router.get("/getAllVariantProductDeleteRequests", validateToken, getAllVariantProductDeleteRequests);
router.get("/getVariantProductDeleteRequestDetail/:requestId", validateToken, getVariantProductDeleteRequestDetail);

module.exports = router;