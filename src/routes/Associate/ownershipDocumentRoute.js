const express = require("express");
const {
  createOwnershipDocument,
  updateOwnershipDocument,
  getAllOwnershipDocuments,
  softDeleteOwnershipDocument,
} = require("../../controllers/Associate/ownershipDocumentController");

const router = express.Router();

router.post("/createOwnershipDocument", createOwnershipDocument);
router.put("/updateOwnershipDocument/:ownershipDocumentId", updateOwnershipDocument);
router.get("/getAllOwnershipDocuments", getAllOwnershipDocuments);
router.delete("/softDeleteOwnershipDocument/:ownershipDocumentId", softDeleteOwnershipDocument);

module.exports = router;
