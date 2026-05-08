const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");
const rateLimiter = require("./middleware/rateLimiter");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const redis = require("./config/redis");
require("dotenv").config();

// --- 1. ROUTE IMPORTS ---
const { protect } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const runRoutes = require("./routes/runRoutes");
const aiRoutes = require("./routes/aiRoutes");

// --- 2. SOCKET HANDLER IMPORT ---
const socketHandler = require("./sockets/multiplayer");

const app = express();

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use(rateLimiter);

// --- 4. REST API ROUTES ---
// Public routes (Signup/Login)
app.use("/api/auth", authRoutes);

// Protected routes (Require valid JWT)
app.use("/api/runs", protect, runRoutes);
app.use("/api/ai", protect, aiRoutes);

// --- 5. SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this in production for security
    methods: ["GET", "POST"],
  },
});

/**
 * SOCKET.IO AUTHENTICATION MIDDLEWARE
 * This intercepts every connection attempt. If the mobile app doesn't
 * send a valid JWT in the handshake, the connection is rejected.
 */
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1] ||
    socket.handshake.headers?.authorization;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    // Verify the JWT using the secret from your .env file
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user payload (e.g., user id) to the socket object
    // This allows us to know exactly who is sending data in multiplayer
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});
let pubClient;

if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
  pubClient = new Redis(process.env.REDIS_URL, {
    family: 4,
    tls: { rejectUnauthorized: false },
  });
} else if (
  process.env.REDIS_URL &&
  process.env.REDIS_URL.startsWith("redis://")
) {
  pubClient = new Redis(process.env.REDIS_URL);
} else {
  pubClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  });
}

pubClient.on("error", (err) =>
  console.error("❌ PubClient Redis Error:", err.message),
);
const subClient = pubClient.duplicate();
subClient.on("error", (err) =>
  console.error("❌ SubClient Redis Error:", err.message),
);

io.adapter(createAdapter(pubClient, subClient));
console.log("✅ Socket.IO Redis Adapter Connected");

// Pass the authenticated 'io' instance to your multiplayer logic handler
socketHandler(io);

// --- 6. DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("--- RunSync+ Database Status ---");
    console.log("MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// --- 7. START SERVER ---
const PORT = process.env.PORT || 5000;

// Adding '0.0.0.0' ensures the server listens on your local Wi-Fi IP, not just localhost!
server.listen(PORT, "0.0.0.0", () => {
  console.log(`---------------------------------------------`);
  console.log(`RunSync+ Backend is live!`);
  console.log(`Listening on Port: ${PORT}`);
  console.log(
    `Make sure your frontend config.js points to your current laptop IP!`,
  );
  console.log(`---------------------------------------------`);
});
