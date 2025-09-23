const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createContractCombination,
  createContractRuleBook,
  getContractCombinations,
  getContractRuleBooks,
  getSingleContractCombination,
  getWorkLocationsByEmployerId,
  getContractCombinationsByContractType
} = require("../../controllers/Associate/contractCombinationController");

const router = express.Router();

router.post(
  "/createContractCombination",
  validateToken,
  createContractCombination
);
router.post("/createContractRuleBook", validateToken, createContractRuleBook);
router.get("/getContractCombinations/:employerId", validateToken, getContractCombinations);
router.get("/getContractCombinationsByContractType/:contractTypeId", validateToken, getContractCombinationsByContractType);
router.get("/getSingleContractCombination/:combinationId", validateToken, getSingleContractCombination);
router.get("/getContractRuleBooks", validateToken, getContractRuleBooks);
router.get("/getWorkLocationsByEmployerId", validateToken, getWorkLocationsByEmployerId);

module.exports = router;
