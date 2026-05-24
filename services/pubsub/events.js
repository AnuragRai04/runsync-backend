// Single source of truth for all pub/sub channel names.
// Import this in both publisher and subscriber to avoid typos.

module.exports = {
  ROOM_UPDATED: "room:updated", // Room state changed (join, ready, etc.)
  RACE_STARTED: "race:started", // Admin started the race
  RACE_PROGRESS: "race:progress", // A player's distance changed
  PLAYER_LEFT: "room:player_left", // A player disconnected
};
