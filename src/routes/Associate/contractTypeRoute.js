const express = require("express");
const {
  createContractType,
  updateContractType,
  getAllContractTypes,
  softDeleteContractType,
} = require("../../controllers/Associate/contractTypeController");

const router = express.Router();

router.post("/createContractType", createContractType);
router.put("/updateContractType/:contractId", updateContractType);
router.get("/getAllContractTypes", getAllContractTypes);
router.patch("/softDeleteContractType/:contractId", softDeleteContractType);

module.exports = router;
