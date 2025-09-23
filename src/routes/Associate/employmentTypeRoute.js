const express = require("express");
const {
  createEmploymentType,
  updateEmploymentType,
  getAllEmploymentTypes,
  softDeleteEmploymentType,
} = require("../../controllers/Associate/employmentTypeController");

const router = express.Router();

router.post("/createEmploymentType", createEmploymentType);
router.put("/updateEmploymentType/:employmentTypeId", updateEmploymentType);
router.get("/getAllEmploymentTypes", getAllEmploymentTypes);
router.delete("/softDeleteEmploymentType/:employmentTypeId", softDeleteEmploymentType);

module.exports = router;
