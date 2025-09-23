const express = require("express");
const {
  createDisbursementMode,
  updateDisbursementMode,
  getAllDisbursementModes,
  softDeleteDisbursementMode,
} = require("../../controllers/Associate/disbursementModeController");

const router = express.Router();

router.post("/createDisbursementMode", createDisbursementMode);
router.put("/updateDisbursementMode/:modeId", updateDisbursementMode);
router.get("/getAllDisbursementModes", getAllDisbursementModes);
router.delete("/softDeleteDisbursementMode/:modeId", softDeleteDisbursementMode);

module.exports = router;
