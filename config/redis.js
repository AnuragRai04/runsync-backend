const Redis = require("ioredis");

// The Ultimate Cloud Config: Forces IPv4 AND explicitly configures TLS
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { 
      family: 4,
      tls: {
        rejectUnauthorized: false // This stops Render from blocking the Upstash SSL certificate!
      }
    }) 
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