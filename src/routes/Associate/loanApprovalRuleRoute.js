const express = require("express");
const { createApprovalRule, getAllApprovalRules, updateApprovalRule, deleteApprovalRule } = require("../../controllers/Associate/loanApprovalRuleController");

const router = express.Router();

router.post("/createApprovalRule", createApprovalRule);
router.get("/getAllApprovalRules", getAllApprovalRules);
router.put("/updateApprovalRule/:ruleId", updateApprovalRule);
router.delete("/deleteApprovalRule/:ruleId", deleteApprovalRule);

module.exports = router;
