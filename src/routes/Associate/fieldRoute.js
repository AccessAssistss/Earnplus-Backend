const express = require("express");
const {
  createField,
  updateField,
  getAllFields,
  softDeleteField
} = require("../../controllers/Associate/fieldController");

const router = express.Router();

router.post("/createField", createField);
router.put("/updateField/:fieldId", updateField);
router.get("/getAllFields", getAllFields);
router.delete("/softDeleteField/:fieldId", softDeleteField);

module.exports = router;
