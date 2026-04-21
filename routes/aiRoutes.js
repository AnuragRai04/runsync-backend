const express = require("express");
const router = express.Router();

// Import the controller function we built
const { generateWeeklyPlan } = require("../controllers/planController");

// @route   GET /api/ai/plan/:userId
// @desc    Generate a personalized weekly running plan using Gemini AI
// @access  Private (You can add auth middleware here later)
router.get("/plan/:userId", generateWeeklyPlan);

module.exports = router;
