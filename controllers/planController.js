const Run = require("../models/Run");

const generateWeeklyPlan = async (req, res) => {
  try {
    const { userId } = req.params;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const runs = await Run.find({
      userId: userId,
      date: { $gte: sevenDaysAgo },
    });

    if (!runs || runs.length === 0) {
      return res.status(200).json({
        plan: "Start with 2–3 easy runs this week at a comfortable pace (~6:30–7:00 min/km).",
      });
    }

    let totalDistance = 0;
    let totalPaceSum = 0;

    const stats = {
      easy: { count: 0, paceSum: 0 },
      long: { count: 0, paceSum: 0 },
      tempo: { count: 0, paceSum: 0 },
      speed: { count: 0, paceSum: 0 },
    };

    runs.forEach((run) => {
      totalDistance += run.distance;
      totalPaceSum += run.avgPace;

      if (stats[run.type]) {
        stats[run.type].count += 1;
        stats[run.type].paceSum += run.avgPace;
      }
    });

    const getAvg = (sum, count) =>
      count > 0 ? (sum / count).toFixed(2) : "no data";

    const basePace = (totalPaceSum / runs.length).toFixed(2);
    const easyAvgPace = getAvg(stats.easy.paceSum, stats.easy.count);
    const longAvgPace = getAvg(stats.long.paceSum, stats.long.count);
    const tempoAvgPace = getAvg(stats.tempo.paceSum, stats.tempo.count);
    const speedAvgPace = getAvg(stats.speed.paceSum, stats.speed.count);

    const prompt = `
You are a professional running coach.

The user wants a plan for THIS WEEK.

User's past 7 days data:
- Base pace (overall): ${basePace}
- Easy runs: ${stats.easy.count}, avg pace: ${easyAvgPace}
- Long runs: ${stats.long.count}, avg pace: ${longAvgPace}
- Tempo runs: ${stats.tempo.count}, avg pace: ${tempoAvgPace}
- Speed runs: ${stats.speed.count}, avg pace: ${speedAvgPace}
- Total distance: ${totalDistance.toFixed(2)} km

Important rules:
1. ALWAYS provide pace for ALL run types:
   - Easy Run
   - Long Run
   - Tempo Run
   - Speed Session
2. If data is missing, estimate using base pace
3. Use realistic pacing differences:
   - Easy slower than base
   - Long slower than easy
   - Tempo faster than base
   - Speed fastest
4. Keep it achievable within 7 days

Output format:
Easy Run Pace:
Long Run Pace:
Tempo Pace:
Speed Pace:

Advice:
`;

    // --- BULLETPROOF API CALL ---
    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "🚨 CRITICAL ERROR: GEMINI_API_KEY is missing from your .env file!",
      );
      throw new Error("API Key is completely missing.");
    }

    // Clean up invisible spaces from the .env file
    apiKey = apiKey.trim();

    // UPDATED: Using the exact Gemini 3 Flash Preview model
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    console.log("🌐 Sending data to Google Gemini...");

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorDetails = await geminiResponse.text();
      console.error("\n🚨 --- GOOGLE API ERROR --- 🚨");
      console.error(errorDetails);
      console.error("🚨 -------------------------- 🚨\n");
      throw new Error(
        `Gemini API Error: ${geminiResponse.status} ${geminiResponse.statusText}`,
      );
    }

    const data = await geminiResponse.json();
    const generatedPlan = data.candidates[0].content.parts[0].text;

    console.log("✅ AI Plan Generated Successfully!");

    return res.status(200).json({
      plan: generatedPlan.trim(),
    });
  } catch (error) {
    console.error("Error generating weekly plan:", error.message);
    return res.status(500).json({
      error: "Failed to generate weekly plan. Please try again later.",
    });
  }
};

module.exports = {
  generateWeeklyPlan,
};
