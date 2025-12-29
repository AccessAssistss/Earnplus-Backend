const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
    submitMasterProductDeleteRequest,
    getAllMasterProductDeleteRequests,
    getMasterProductDeleteRequestDetail,
    handleMasterProductDeleteRequest,
} = require("../../controllers/Associate/masterProductDeleteRequestController");

const router = express.Router();

router.post(
    "/submitMasterProductDeleteRequest",
    validateToken,
    submitMasterProductDeleteRequest
);
router.get(
    "/getAllMasterProductDeleteRequests",
    validateToken,
    getAllMasterProductDeleteRequests
);
router.get(
    "/getMasterProductDeleteRequestDetail/:requestId",
    validateToken,
    getMasterProductDeleteRequestDetail
);
router.patch(
    "/handleMasterProductDeleteRequest",
    validateToken,
    handleMasterProductDeleteRequest
);

module.exports = router;