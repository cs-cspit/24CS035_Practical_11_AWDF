// Practical 11: Containerized DNS handling (do not override DNS if running in Docker internal network)
if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith("mongodb+srv://")) {
    const dns = require("dns");
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

// Built-in & Custom Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Practical 10: Register EventEmitter background listeners at startup
const { getEventLogs, clearEventLogs } = require("./listeners");
const taskEvents = require("./events");

// Practical 11: MongoDB Connection via Compose Service Name 'mongodb'
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongodb:27017/taskdb";
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log(`[Docker Compose] MongoDB connected successfully to ${MONGODB_URI}`);
    })
    .catch((error) => {
        console.error("[Docker Compose] MongoDB connection failed:", error.message);
    });

const cache = require("./cache");

// Health check endpoint (Practical 11 Container Health Verification)
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        service: "backend",
        container: process.env.HOSTNAME || "task-manager-backend",
        database: mongoose.connection.readyState === 1 ? "Connected" : "Connecting/Disconnected",
        mongoUri: MONGODB_URI.replace(/\/\/.*@/, "//***:***@"),
        timestamp: new Date().toISOString()
    });
});

// Practical 10: Event Stream & Audit Log Endpoints for Live UI and Postman
app.get("/events/logs", (req, res) => {
    res.status(200).json({
        status: "success",
        total: getEventLogs().length,
        logs: getEventLogs()
    });
});

app.post("/events/clear", (req, res) => {
    clearEventLogs();
    res.status(200).json({
        message: "Event audit logs cleared successfully",
        total: 0,
        logs: []
    });
});

app.post("/events/simulate-error", (req, res) => {
    const errorPayload = {
        _id: "simulated_err_" + Date.now(),
        title: req.body.title || "Erroneous Task Simulation",
        user: req.body.user || "SimulatedUser",
        simulateError: true,
        apiResponseTimestamp: new Date().toISOString()
    };
    console.log(`[API] Error simulation request acknowledged at ${errorPayload.apiResponseTimestamp}`);
    res.status(202).json({
        message: "Simulated error event emitted. Watch server console and error listener logs.",
        apiResponseTimestamp: errorPayload.apiResponseTimestamp,
        payload: errorPayload
    });
    taskEvents.emit("task-created", errorPayload);
});

// Cache Debug & Analytics Endpoints (Supplementary Problem 2 & 3)
app.get("/cache/stats", (req, res) => {
    res.status(200).json({
        status: "success",
        data: cache.getCustomStats()
    });
});
app.post("/cache/clear", (req, res) => {
    cache.flushAll();
    res.status(200).json({
        message: "In-memory cache cleared successfully",
        data: cache.getCustomStats()
    });
});

// Authentication Routes (Supports /auth/register, /auth/login, /auth/me)
app.use("/auth", authRoutes);

// Direct root aliases as specified in the Practical 7 architecture diagram
app.post("/register", (req, res, next) => {
    req.url = "/register";
    authRoutes(req, res, next);
});
app.post("/login", (req, res, next) => {
    req.url = "/login";
    authRoutes(req, res, next);
});
app.get("/me", (req, res, next) => {
    req.url = "/me";
    authRoutes(req, res, next);
});

// Protected Task Routes
app.use("/tasks", taskRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
