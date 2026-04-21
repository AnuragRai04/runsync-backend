const mongoose = require("mongoose");

const runSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["easy", "long", "tempo", "speed"],
    required: true,
  },
  distance: {
    type: Number,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  avgPace: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Run", runSchema);
