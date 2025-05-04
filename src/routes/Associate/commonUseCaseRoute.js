const express = require("express");
const {
  createCommonUseCase,
  updateCommonUseCase,
  getAllCommonUseCases,
  softDeleteCommonUseCase,
} = require("../../controllers/Associate/commonUseCaseController");

const router = express.Router();

router.post("/createCommonUseCase", createCommonUseCase);
router.put("/updateCommonUseCase/:useCaseId", updateCommonUseCase);
router.get("/getAllCommonUseCases", getAllCommonUseCases);
router.patch("/softDeleteCommonUseCase/:useCaseId", softDeleteCommonUseCase);

module.exports = router;
