const Redis = require("ioredis");
const EVENTS = require("./events");

/**
 * Creates a DEDICATED Redis subscriber client.
 * A subscribed Redis client cannot run normal commands (get/set),
 * so it MUST be a separate connection — never reuse the main redis client.
 */
const createSubscriber = (io) => {
  // Build subscriber using same config logic as config/redis.js
  let subscriber;

  if (process.env.REDIS_URL?.startsWith("rediss://")) {
    subscriber = new Redis(process.env.REDIS_URL, {
      family: 4,
      tls: { rejectUnauthorized: false },
    });
  } else if (process.env.REDIS_URL?.startsWith("redis://")) {
    subscriber = new Redis(process.env.REDIS_URL);
  } else {
    subscriber = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
    });
  }

  subscriber.on("error", (err) =>
    console.error("❌ Subscriber Redis Error:", err.message),
  );

  // Subscribe to all room/race channels
  subscriber.subscribe(
    EVENTS.ROOM_UPDATED,
    EVENTS.RACE_STARTED,
    EVENTS.RACE_PROGRESS,
    EVENTS.PLAYER_LEFT,
    (err, count) => {
      if (err) {
        console.error("❌ Failed to subscribe:", err.message);
      } else {
        console.log(`✅ Subscribed to ${count} pub/sub channels`);
      }
    },
  );

  /**
   * Central message handler.
   * When Instance B receives a message published by Instance A,
   * it uses its LOCAL `io` to emit to sockets connected to IT.
   * The Socket.IO Redis Adapter then fans it out to the right room.
   */
  subscriber.on("message", (channel, message) => {
    const payload = JSON.parse(message);
    const { roomId } = payload;

    console.log(`📩 Received [${channel}] for room ${roomId}`);

    switch (channel) {
      // Someone joined, left, or toggled ready → send full room state
      case EVENTS.ROOM_UPDATED:
        io.to(roomId).emit("room_update", payload.room);
        break;

      // Admin fired start → tell all players GO
      case EVENTS.RACE_STARTED:
        io.to(roomId).emit("race_started", { message: "GO!" });
        break;

      // A player's distance changed → broadcast leaderboard
      case EVENTS.RACE_PROGRESS:
        io.to(roomId).emit("race_update", payload.players);
        break;

      // A player dropped → updated room state
      case EVENTS.PLAYER_LEFT:
        io.to(roomId).emit("room_update", payload.room);
        break;

      default:
        console.warn(`⚠️ Unhandled pub/sub channel: ${channel}`);
    }
  });

  return subscriber;
};

module.exports = { createSubscriber };
