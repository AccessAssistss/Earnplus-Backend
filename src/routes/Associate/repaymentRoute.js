const express = require("express");
const {
  createRepaymentMode,
  updateRepaymentMode,
  getAllRepaymentModes,
  softDeleteRepaymentMode,
} = require("../../controllers/Associate/repaymentController");

const router = express.Router();

router.post("/createRepaymentMode", createRepaymentMode);
router.put("/updateRepaymentMode/:modeId", updateRepaymentMode);
router.get("/getAllRepaymentModes", getAllRepaymentModes);
router.delete("/softDeleteRepaymentMode/:modeId", softDeleteRepaymentMode);

module.exports = router;
