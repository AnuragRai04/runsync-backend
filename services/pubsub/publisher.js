const redis = require("../../config/redis");

/**
 * Publishes an event to a Redis Pub/Sub channel.
 * Any backend instance subscribed to this channel will receive it.
 *
 * @param {string} channel  - The event channel name (use constants from events.js)
 * @param {object} payload  - The data to broadcast (will be JSON stringified)
 */
const publish = async (channel, payload) => {
  try {
    // Redis pub/sub requires a SEPARATE client from the one used for get/set.
    // We use the existing redis client here ONLY for publishing.
    await redis.publish(channel, JSON.stringify(payload));
    console.log(`📢 Published to [${channel}]:`, payload);
  } catch (err) {
    console.error(`❌ Publish error on [${channel}]:`, err.message);
  }
};

module.exports = { publish };
