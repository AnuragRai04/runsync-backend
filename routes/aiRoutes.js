const express = require("express");
const router = express.Router();

// Import the controller function
const { generateWeeklyPlan } = require("../controllers/planController"); // (or aiController.js, whatever you named it!)

// @route   GET /api/ai/plan
// @desc    Generate a personalized weekly running plan using Gemini AI
// @access  Private (The 'protect' middleware in server.js secures this!)
router.get("/plan", generateWeeklyPlan);

module.exports = router;
