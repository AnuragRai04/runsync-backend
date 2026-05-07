const redis = require("../config/redis");
const express = require("express");
const router = express.Router();
const Run = require("../models/Run"); // Import your Mongoose model

// 1. POST /api/runs - Save a run to MongoDB
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, distance, time, avgPace } = req.body;

    // Create a new run document
    const newRun = new Run({
      userId,
      type,
      distance,
      time,
      avgPace,
    });

    // Save to the database
    const savedRun = await newRun.save();

    // Invalidate AI plan cache since user has new run data
    await redis.del(`ai:plan:${userId}`);
    console.log(`🗑️ AI plan cache cleared for user ${userId}`);

    await redis.del(`runs:${userId}`);
    console.log(`🗑️ Runs cache cleared for user ${userId}`);

    // Return the saved run with a 201 (Created) status
    res.status(201).json(savedRun);
  } catch (error) {
    console.error("Error saving run:", error);
    res.status(500).json({ message: "Server error while saving run" });
  }
});

// 2. GET /api/runs/:userId - Fetch all runs for a specific user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Check Redis cache first
    const cachedRuns = await redis.get(`runs:${userId}`);
    if (cachedRuns) {
      console.log(`⚡ Returning cached runs for user ${userId}`);
      return res.status(200).json(JSON.parse(cachedRuns));
    }

    // Not in cache — fetch from MongoDB
    const runs = await Run.find({ userId }).sort({ date: -1 });

    // Cache for 1 hour
    await redis.set(`runs:${userId}`, JSON.stringify(runs), "EX", 3600);
    console.log(`💾 Runs cached for user ${userId}`);

    res.status(200).json(runs);
  } catch (error) {
    console.error("Error fetching runs:", error);
    res.status(500).json({ message: "Server error while fetching runs" });
  }
});

module.exports = router;
