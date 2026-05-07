// Memory storage for active rooms
// Structure: { [roomId]: { roomId, totalDistance, raceType, adminId, players: [] } }
const redis = require("../config/redis");

const getRoom = async (roomId) => {
  const room = await redis.get(`room:${roomId}`);
  return room ? JSON.parse(room) : null;
};

const saveRoom = async (room) => {
  await redis.set(`room:${room.roomId}`, JSON.stringify(room), "EX", 3600);
};

const deleteRoom = async (roomId) => {
  await redis.del(`room:${roomId}`);
};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // ==========================================
    // 1. CREATE ROOM
    // ==========================================
    socket.on(
      "create_room",
      async ({ roomId, userId, name, totalDistance, raceType }) => {
        const existingRoom = await getRoom(roomId);
        if (existingRoom) {
          socket.emit("room_error", { message: "Room code already in use." });
          return;
        }

        const room = {
          roomId,
          totalDistance,
          raceType,
          adminId: userId,
          players: [],
        };

        room.players.push({
          socketId: socket.id,
          userId,
          name,
          distance: 0,
          isReady: false,
          isAdmin: true,
        });

        await saveRoom(room);
        socket.join(roomId);
        console.log(`🏠 Room Created: ${roomId} by ${name}`);
        io.to(roomId).emit("room_update", room);
      },
    );
    // ==========================================
    // 2. JOIN ROOM
    // ==========================================
    socket.on("join_room", async ({ roomId, userId, name }) => {
      const room = await getRoom(roomId);

      if (!room) {
        socket.emit("room_error", { message: "Room not found." });
        return;
      }

      if (room.players.length >= 4) {
        socket.emit("room_error", { message: "Room is full (Max 4)." });
        return;
      }

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

      await saveRoom(room);
      socket.join(roomId);
      console.log(`👋 ${name} joined ${roomId}`);
      io.to(roomId).emit("room_update", room);
    });

    // ==========================================
    // 3. PLAYER READY
    // ==========================================
    socket.on("player_ready", async ({ roomId, userId }) => {
      const room = await getRoom(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.userId === userId);
      if (player) {
        player.isReady = true;
        await saveRoom(room);
        console.log(`✅ ${player.name} is ready in ${roomId}`);
        io.to(roomId).emit("room_update", room);
      }
    });
    // ==========================================
    // 4. START RACE
    // ==========================================
    socket.on("start_race", async ({ roomId, userId }) => {
      const room = await getRoom(roomId);
      if (!room) return;

      if (room.adminId !== userId) {
        socket.emit("room_error", {
          message: "Only the host can start the race.",
        });
        return;
      }

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
    socket.on("update_distance", async ({ roomId, userId, distance }) => {
      const room = await getRoom(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.userId === userId);
      if (player) {
        player.distance = distance;
        await saveRoom(room);
        io.to(roomId).emit("race_update", room.players);
      }
    });

    // ==========================================
    // 6. DISCONNECT (Cleanup & Admin Transfer)
    // ==========================================
    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${socket.id}`);

      const keys = await redis.keys("room:*");

      for (const key of keys) {
        const room = await getRoom(key.replace("room:", ""));
        if (!room) continue;

        const playerIndex = room.players.findIndex(
          (p) => p.socketId === socket.id,
        );

        if (playerIndex !== -1) {
          const removedPlayer = room.players.splice(playerIndex, 1)[0];
          console.log(`🚪 ${removedPlayer.name} left ${room.roomId}`);

          if (room.players.length === 0) {
            await deleteRoom(room.roomId);
            console.log(`🗑️ Room ${room.roomId} deleted (empty)`);
          } else {
            if (removedPlayer.isAdmin) {
              room.players[0].isAdmin = true;
              room.adminId = room.players[0].userId;
            }
            await saveRoom(room);
            io.to(room.roomId).emit("room_update", room);
          }
          break;
        }
      }
    });
  });
};
