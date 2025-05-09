const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createContractCombination,
  createContractRuleBook,
  getContractCombinations,
  getContractRuleBooks,
} = require("../../controllers/Associate/contractCombinationController");

const router = express.Router();

router.post(
  "/createContractCombination",
  validateToken,
  createContractCombination
);
router.post("/createContractRuleBook", validateToken, createContractRuleBook);
router.get("/getContractCombinations", validateToken, getContractCombinations);
router.get("/getContractRuleBooks", validateToken, getContractRuleBooks);

module.exports = router;
