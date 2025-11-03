const express = require("express");
const { createQuizQuestion, getAllQuizQuestions, getQuizQuestionById, updateQuizQuestion, deleteQuizQuestion, createQuizAnswer, getAllQuizAnswers, getQuizAnswerById, updateQuizAnswer, deleteQuizAnswer } = require("../../controllers/Associate/quizQnaController");

const router = express.Router();

// ##########----------Quiz Question Routes----------##########
router.post("/createQuizQuestion", createQuizQuestion);
router.get("/getAllQuizQuestions", getAllQuizQuestions);
router.get("/getQuizQuestionById/:id", getQuizQuestionById);
router.put("/updateQuizQuestion/:id", updateQuizQuestion);
router.delete("/deleteQuizQuestion/:id", deleteQuizQuestion);

// ##########----------Quiz Answer Routes----------##########
router.post("/createQuizAnswer", createQuizAnswer);
router.get("/getAllQuizAnswers", getAllQuizAnswers);
router.get("/getQuizAnswerById/:id", getQuizAnswerById);
router.put("/updateQuizAnswer/:id", updateQuizAnswer);
router.delete("/deleteQuizAnswer/:id", deleteQuizAnswer);

module.exports = router;
