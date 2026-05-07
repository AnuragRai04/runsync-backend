const Redis = require("ioredis");

// The { family: 4 } forces IPv4, which fixes the Render -> Upstash connection block!
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { family: 4 })
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
    });

redis.on("connect", () => {
  console.log("✅ Redis Connected Successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis Connection Error:", err.message);
});

module.exports = redis;
