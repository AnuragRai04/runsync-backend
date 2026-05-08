const Redis = require("ioredis");

let redis;

if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
  // Upstash (production) — needs TLS
  redis = new Redis(process.env.REDIS_URL, {
    family: 4,
    tls: { rejectUnauthorized: false },
  });
} else if (
  process.env.REDIS_URL &&
  process.env.REDIS_URL.startsWith("redis://")
) {
  // Docker local — no TLS needed
  redis = new Redis(process.env.REDIS_URL);
} else {
  // Plain local development
  redis = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  });
}

redis.on("connect", () => console.log("✅ Redis Connected Successfully"));
redis.on("error", (err) =>
  console.error("❌ Redis Connection Error:", err.message),
);

module.exports = redis;
