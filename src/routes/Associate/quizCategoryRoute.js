const express = require("express");
const { createQuizCategory, getAllQuizCategories, getQuizCategoryById, updateQuizCategory, deleteQuizCategory } = require("../../controllers/Associate/quizCategoryController");

const router = express.Router();

router.post("/createQuizCategory", createQuizCategory);
router.get("/getAllQuizCategories", getAllQuizCategories);
router.get("/getQuizCategoryById/:id", getQuizCategoryById);
router.put("/updateQuizCategory/:id", updateQuizCategory);
router.delete("/deleteQuizCategory/:id", deleteQuizCategory);

module.exports = router;
