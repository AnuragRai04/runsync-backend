// Memory storage for active rooms
// Structure: { [roomId]: { roomId, totalDistance, raceType, adminId, players: [] } }
const rooms = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // ==========================================
    // 1. CREATE ROOM
    // ==========================================
    socket.on(
      "create_room",
      ({ roomId, userId, name, totalDistance, raceType }) => {
        if (rooms[roomId]) {
          socket.emit("room_error", { message: "Room code already in use." });
          return;
        }

        // Create room state
        rooms[roomId] = {
          roomId,
          totalDistance,
          raceType,
          adminId: userId, // Creator is the admin
          players: [],
        };

        // Add creator as the first player
        rooms[roomId].players.push({
          socketId: socket.id,
          userId,
          name,
          distance: 0,
          isReady: false,
          isAdmin: true,
        });

        socket.join(roomId);
        console.log(`🏠 Room Created: ${roomId} by ${name}`);

        // Emit full room state
        io.to(roomId).emit("room_update", rooms[roomId]);
      },
    );

    // ==========================================
    // 2. JOIN ROOM
    // ==========================================
    socket.on("join_room", ({ roomId, userId, name }) => {
      const room = rooms[roomId];

      if (!room) {
        socket.emit("room_error", { message: "Room not found." });
        return;
      }

      if (room.players.length >= 4) {
        socket.emit("room_error", { message: "Room is full (Max 4)." });
        return;
      }

      // Prevent duplicate joins
      const existingPlayer = room.players.find((p) => p.userId === userId);
      if (!existingPlayer) {
        room.players.push({
          socketId: socket.id,
          userId,
          name,
          distance: 0,
          isReady: false,
          isAdmin: false,
        });
      }

      socket.join(roomId);
      console.log(`👋 ${name} joined ${roomId}`);

      io.to(roomId).emit("room_update", room);
    });

    // ==========================================
    // 3. PLAYER READY
    // ==========================================
    socket.on("player_ready", ({ roomId, userId }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find((p) => p.userId === userId);
      if (player) {
        player.isReady = true;
        console.log(`✅ ${player.name} is ready in ${roomId}`);
        io.to(roomId).emit("room_update", room);
      }
    });

    // ==========================================
    // 4. START RACE
    // ==========================================
    socket.on("start_race", ({ roomId, userId }) => {
      const room = rooms[roomId];
      if (!room) return;

      // Only Admin can start
      if (room.adminId !== userId) {
        socket.emit("room_error", {
          message: "Only the host can start the race.",
        });
        return;
      }

      // Are all players ready?
      const allReady = room.players.every((p) => p.isReady);
      if (!allReady) {
        socket.emit("room_error", {
          message: "Waiting for all players to be ready.",
        });
        return;
      }

      console.log(`🏁 Race Started in ${roomId}!`);
      io.to(roomId).emit("race_started", { message: "GO!" });
    });

    // ==========================================
    // 5. UPDATE DISTANCE
    // ==========================================
    socket.on("update_distance", ({ roomId, userId, distance }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find((p) => p.userId === userId);
      if (player) {
        player.distance = distance;
        // Broadcast ONLY the players array during the race for speed
        io.to(roomId).emit("race_update", room.players);
      }
    });

    // ==========================================
    // 6. DISCONNECT (Cleanup & Admin Transfer)
    // ==========================================
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);

      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(
          (p) => p.socketId === socket.id,
        );

        if (playerIndex !== -1) {
          const removedPlayer = room.players.splice(playerIndex, 1)[0];
          console.log(`🚪 ${removedPlayer.name} left ${roomId}`);

          if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`🗑️ Room ${roomId} deleted (empty)`);
          } else {
            // Admin auto-transfer if the host leaves
            if (removedPlayer.isAdmin && room.players.length > 0) {
              room.players[0].isAdmin = true;
              room.adminId = room.players[0].userId;
            }
            io.to(roomId).emit("room_update", room);
          }
          break;
        }
      }
    });
  });
};
