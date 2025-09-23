const express = require("express");
const {
  createIndustryType,
  updateIndustryType,
  getAllIndustryTypes,
  softDeleteIndustryType,
} = require("../../controllers/Associate/industryTypeController");

const router = express.Router();

router.post("/createIndustryType", createIndustryType);
router.put("/updateIndustryType/:industryId", updateIndustryType);
router.get("/getAllIndustryTypes", getAllIndustryTypes);
router.patch("/softDeleteIndustryType/:industryId", softDeleteIndustryType);

module.exports = router;
