const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createFieldKey, updateFieldKey, getAllFieldKeys, getAllFieldKeysForManager, softDeleteFieldKey, createSectionKey, softDeleteSectionKey, getAllSectionKeysForManager, getAllSectionKeys, updateSectionKey } = require("../../controllers/Associate/filedController");

const router = express.Router();

// ##########----------Section Key Routes----------##########
router.post("/createSectionKey", validateToken, createSectionKey);
router.put("/updateSectionKey/:sectionKeyId", validateToken, updateSectionKey);
router.get("/getAllSectionKeys", validateToken, getAllSectionKeys);
router.get("/getAllSectionKeysForManager", validateToken, getAllSectionKeysForManager);
router.delete("/softDeleteSectionKey/:sectionKeyId", validateToken, softDeleteSectionKey);

// ##########----------Field Key Routes----------##########
router.post("/createFieldKey", validateToken, createFieldKey);
router.put("/updateFieldKey/:fieldKeyId", validateToken, updateFieldKey);
router.get("/getAllFieldKeys", validateToken, getAllFieldKeys);
router.get("/getAllFieldKeysForManager", validateToken, getAllFieldKeysForManager);
router.delete("/softDeleteFieldKey/:fieldKeyId", validateToken, softDeleteFieldKey);

module.exports = router;