const express = require("express");
const {
  createLoanType,
  updateLoanType,
  getAllLoanTypes,
  softDeleteLoanType,
} = require("../../controllers/Associate/loanTypeController");

const router = express.Router();

router.post("/createLoanType", createLoanType);
router.put("/updateLoanType/:loanTypeId", updateLoanType);
router.get("/getAllLoanTypes", getAllLoanTypes);
router.delete("/softDeleteLoanType/:loanTypeId", softDeleteLoanType);

module.exports = router;
