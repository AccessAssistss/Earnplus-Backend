const express = require("express");
const {
  createQuery,
  getAllQueries,
  updateQueryStatus,
} = require("../../controllers/Associate/queryController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/createQuery", validateToken, createQuery);
router.get("/getAllQueries", validateToken, getAllQueries);
router.patch("/updateQueryStatus", validateToken, updateQueryStatus);

module.exports = router;
