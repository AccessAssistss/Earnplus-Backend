const express = require("express");
const {
  createCustomerType,
  updateCustomerType,
  getAllCustomerTypes,
  softDeleteCustomerType,
} = require("../../controllers/Associate/customerTypeController");

const router = express.Router();

router.post("/createCustomerType", createCustomerType);
router.put("/updateCustomerType/:customerId", updateCustomerType);
router.get("/getAllCustomerTypes", getAllCustomerTypes);
router.patch("/softDeleteCustomerType/:customerId", softDeleteCustomerType);

module.exports = router;
