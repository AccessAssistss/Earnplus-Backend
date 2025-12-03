const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
    submitVariantProductUpdateRequest,
    getAllVariantProductUpdateRequests,
    getVariantProductUpdateRequestDetail,
    approveVariantProductUpdateRequest,
    rejectVariantProductUpdateRequest,
} = require("../../controllers/Associate/variantProductUpdateRequestController");

const router = express.Router();

router.post("/submitVariantProductUpdateRequest", validateToken, submitVariantProductUpdateRequest);
router.get("/getAllVariantProductUpdateRequests", validateToken, getAllVariantProductUpdateRequests);
router.get("/getVariantProductUpdateRequestDetail/:requestId", validateToken, getVariantProductUpdateRequestDetail);
router.patch("/approveVariantProductUpdateRequest/:requestId", validateToken, approveVariantProductUpdateRequest);
router.patch("/rejectVariantProductUpdateRequest/:requestId", validateToken, rejectVariantProductUpdateRequest);

module.exports = router;