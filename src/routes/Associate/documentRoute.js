const express = require("express");
const {
  createDocument,
  updateDocument,
  getAllDocuments,
  softDeleteDocument,
} = require("../../controllers/Associate/documentController");

const router = express.Router();

router.post("/createDocument", createDocument);
router.put("/updateDocument/:documentId", updateDocument);
router.get("/getAllDocuments", getAllDocuments);
router.delete("/softDeleteDocument/:documentId", softDeleteDocument);

module.exports = router;
