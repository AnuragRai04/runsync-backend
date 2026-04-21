const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const Run = require("./models/Run");

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const user = await User.findOne({ email: "test@runsync.com" });

    if (!user) {
      console.log("❌ User not found. Make sure you created it via Postman.");
      process.exit(1);
    }

    await Run.deleteMany({});
    console.log("🧹 Old runs cleared");

    const runs = [
      {
        userId: user._id.toString(),
        type: "speed",
        distance: 5.0,
        time: 1500,
        avgPace: 300,
      },
      {
        userId: user._id.toString(),
        type: "long",
        distance: 10.2,
        time: 3400,
        avgPace: 333,
      },
      {
        userId: user._id.toString(),
        type: "easy",
        distance: 3.1,
        time: 1200,
        avgPace: 387,
      },
      {
        userId: user._id.toString(),
        type: "tempo",
        distance: 4.5,
        time: 1300,
        avgPace: 288,
      },
      {
        userId: user._id.toString(),
        type: "long",
        distance: 8.0,
        time: 2600,
        avgPace: 325,
      },
    ];
    await Run.insertMany(runs);

    console.log("🔥 5 runs inserted successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

seedDatabase();
