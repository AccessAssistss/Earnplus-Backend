const express = require("express");
const {
  createScoreVariable,
  updateScoreVariable,
  getAllScoreVariables,
  softDeleteScoreVariable,
} = require("../../controllers/Associate/scoreVariableController");

const router = express.Router();

router.post("/createScoreVariable", createScoreVariable);
router.put("/updateScoreVariable/:scoreVariableId", updateScoreVariable);
router.get("/getAllScoreVariables", getAllScoreVariables);
router.delete("/softDeleteScoreVariable/:scoreVariableId", softDeleteScoreVariable);

module.exports = router;
