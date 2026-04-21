const express = require("express");
const router = express.Router();
const Run = require("../models/Run"); // Import your Mongoose model

// 1. POST /api/runs - Save a run to MongoDB
router.post("/", async (req, res) => {
  try {
    const { userId, type, distance, time, avgPace } = req.body;

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

    // Find all runs matching the userId, sort by newest first (-1)
    const runs = await Run.find({ userId }).sort({ date: -1 });

    // Return the list of runs
    res.status(200).json(runs);
  } catch (error) {
    console.error("Error fetching runs:", error);
    res.status(500).json({ message: "Server error while fetching runs" });
  }
});

module.exports = router;
