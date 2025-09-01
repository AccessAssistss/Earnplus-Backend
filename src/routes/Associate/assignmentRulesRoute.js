const express = require("express");
const { createAssignmentRule, getAssignmentRules, updateAssignmentRule, deleteAssignmentRule } = require("../../controllers/Associate/assignmentRulesController");

const router = express.Router();

router.post("/createAssignmentRule", createAssignmentRule);
router.get("/getAssignmentRules", getAssignmentRules);
router.put("/updateAssignmentRule/:id", updateAssignmentRule);
router.delete("/deleteAssignmentRule/:id", deleteAssignmentRule);

module.exports = router;
