const Redis = require("ioredis");

// If Render provides a REDIS_URL, use it! Otherwise, use localhost for local testing.
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
    });

redis.on("connect", () => {
  console.log("✅ Redis Connected Successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis Connection Error:", err);
});

module.exports = redis;
