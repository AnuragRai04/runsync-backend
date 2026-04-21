const runService = require("../services/runService");

// @route   POST /api/runs
exports.createRun = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have auth middleware setting req.user
    const runData = req.body;

    const savedRun = await runService.saveRun(userId, runData);

    res.status(201).json({ success: true, data: savedRun });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route   GET /api/runs
exports.getRuns = async (req, res) => {
  try {
    const userId = req.user.id;

    const runs = await runService.fetchRuns(userId);

    res.status(200).json({ success: true, data: runs });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error fetching runs" });
  }
};

// @route   GET /api/runs/stats
exports.getRunStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const runs = await runService.fetchRuns(userId);
    const stats = runService.processRunStats(runs);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error generating stats" });
  }
};
