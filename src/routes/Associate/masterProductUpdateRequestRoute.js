const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
    submitMasterProductUpdateRequest,
    getAllMasterProductUpdateRequests,
    getMasterProductUpdateRequestDetail,
    approveMasterProductUpdateRequest,
    rejectMasterProductUpdateRequest,
} = require("../../controllers/Associate/masterProductUpdateRequestController");

const router = express.Router();

router.post(
    "/submitMasterProductUpdateRequest",
    validateToken,
    submitMasterProductUpdateRequest
);
router.get(
    "/getAllMasterProductUpdateRequests",
    validateToken,
    getAllMasterProductUpdateRequests
);
router.get(
    "/getMasterProductUpdateRequestDetail/:requestId",
    validateToken,
    getMasterProductUpdateRequestDetail
);
router.patch(
    "/approveMasterProductUpdateRequest/:requestId",
    validateToken,
    approveMasterProductUpdateRequest
);
router.patch(
    "/rejectMasterProductUpdateRequest/:requestId",
    validateToken,
    rejectMasterProductUpdateRequest
);

module.exports = router;