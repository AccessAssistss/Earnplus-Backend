const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createAARedirection } = require("../../controllers/AssociateSubAdmin/accountAggregatorController");

const router = express.Router();

router.post("/createAARedirection/:loanApplicationId", validateToken, createAARedirection);
router.post("/webhook", validateToken, createAARedirection);

module.exports = router;
