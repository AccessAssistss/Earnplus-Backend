const express = require("express");
const { createDropdown, updateDropdown, getDropdownsByField, softDeleteDropdown } = require("../../controllers/Associate/dropdownController");

const router = express.Router();

router.post("/createDropdown", createDropdown);
router.put("/updateDropdown/:dropdownId", updateDropdown);
router.get("/getDropdownsByField/:fieldId", getDropdownsByField);
router.delete("/softDeleteDropdown/:dropdownId", softDeleteDropdown);

module.exports = router;
