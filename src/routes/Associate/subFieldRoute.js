const express = require("express");
const { createSubField, updateSubField, getSubFields, softDeleteSubField } = require("../../controllers/Associate/subFieldController");

const router = express.Router();

router.post("/createSubField", createSubField);
router.put("/updateSubField/:subFieldId", updateSubField);
router.get("/getSubFields/:fieldId", getSubFields);
router.delete("/softDeleteSubField/:subFieldId", softDeleteSubField);

module.exports = router;
