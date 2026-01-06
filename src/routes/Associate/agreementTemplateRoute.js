const express = require("express");
const { createAgreementTemplate, updateAgreementTemplate, getAllAgreementTemplates, getAgreementTemplateForManager, softDeleteAgreementTemplate } = require("../../controllers/Associate/agreementTemplateController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { AGREEMENT_TEMPLATE } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadAgreementTemplateFiles = createUploadMiddleware("agreement", AGREEMENT_TEMPLATE);

router.post("/createAgreementTemplate", validateToken, uploadAgreementTemplateFiles, multerErrorHandler, createAgreementTemplate);
router.put("/updateAgreementTemplate/:templateId", validateToken, uploadAgreementTemplateFiles, multerErrorHandler, updateAgreementTemplate);
router.get("/getAllAgreementTemplates", validateToken, getAllAgreementTemplates);
router.get("/getAgreementTemplateForManager", validateToken, getAgreementTemplateForManager);
router.delete("/softDeleteAgreementTemplate/:templateId", validateToken, softDeleteAgreementTemplate);

module.exports = router;