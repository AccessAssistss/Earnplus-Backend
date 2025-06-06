const express = require("express");
const {
  createExternalScore,
  updateExternalScore,
  getAllExternalScores,
  softDeleteExternalScore,
} = require("../../controllers/Associate/externalScoreController");

const router = express.Router();

router.post("/createExternalScore", createExternalScore);
router.put("/updateExternalScore/:externalScoreId", updateExternalScore);
router.get("/getAllExternalScores", getAllExternalScores);
router.delete("/softDeleteExternalScore/:externalScoreId", softDeleteExternalScore);

module.exports = router;
