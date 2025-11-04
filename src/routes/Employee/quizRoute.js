const express = require("express");
const { getDailyQuizQuestion, submitQuizAnswer, getEmployeeQuizStats, getQuizCategoriesWithProgress, getQuestionsByCategory, getQuestionById, submitCategoryQuizAnswer } = require("../../controllers/Employee/quizController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.get("/getDailyQuizQuestion", validateToken, getDailyQuizQuestion)
router.post("/submitQuizAnswer", validateToken, submitQuizAnswer)
router.get("/getEmployeeQuizStats", validateToken, getEmployeeQuizStats)

// ##########----------Category Based Quiz Routes----------##########
router.get('/getQuizCategoriesWithProgress', validateToken, getQuizCategoriesWithProgress);
router.get('/getQuestionsByCategory/:categoryId', validateToken, getQuestionsByCategory);
router.get('/getQuestionById/:questionId', validateToken, getQuestionById);
router.post('/submitCategoryQuizAnswer', validateToken, submitCategoryQuizAnswer);

module.exports = router