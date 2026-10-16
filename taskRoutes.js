const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const cache = require("../cache");
const taskEvents = require("../events");
const { getEventLogs, clearEventLogs } = require("../listeners");
const {
    validateCreateTask,
    validateUpdateTask,
    validateTaskId
} = require("../middleware/validateTask");

// Helper to calculate elapsed high-res time in milliseconds
const getDurationMs = (startTime) => {
    const diff = process.hrtime(startTime);
    return ((diff[0] * 1e3) + (diff[1] * 1e-6)).toFixed(2);
};

/**
 * @route   GET /tasks/events/logs
 * @desc    Fetch real-time event logs for background EventEmitter activity
 * @access  Public / Monitor
 */
router.get("/events/logs", (req, res) => {
    res.status(200).json({
        status: "success",
        total: getEventLogs().length,
        logs: getEventLogs()
    });
});

/**
 * @route   POST /tasks/events/clear
 * @desc    Clear background event audit logs
 * @access  Public / Monitor
 */
router.post("/events/clear", (req, res) => {
    clearEventLogs();
    res.status(200).json({
        message: "Event audit logs cleared successfully",
        total: 0,
        logs: []
    });
});

/**
 * @route   GET /tasks/cache/stats
 * @desc    Debug endpoint exposing cache-hit/cache-miss counters and cache state (Supplementary Problem 2)
 * @access  Public / Debug
 */
router.get("/cache/stats", (req, res) => {
    const stats = cache.getCustomStats();
    res.status(200).json({
        status: "success",
        data: stats
    });
});

/**
 * @route   POST /tasks/cache/clear
 * @desc    Debug endpoint to flush all cached keys
 * @access  Public / Debug
 */
router.post("/cache/clear", (req, res) => {
    cache.flushAll();
    res.status(200).json({
        message: "In-memory cache cleared successfully",
        data: cache.getCustomStats()
    });
});

/**
 * @route   POST /tasks/cache/ttl
 * @desc    Debug endpoint to experiment with different TTL values (Supplementary Problem 3)
 * @access  Public / Debug
 */
router.post("/cache/ttl", (req, res) => {
    const { ttl } = req.body;
    if (!ttl || isNaN(ttl) || parseInt(ttl, 10) <= 0) {
        return res.status(400).json({
            message: "Please provide a valid positive TTL in seconds."
        });
    }
    cache.setTTL(ttl);
    res.status(200).json({
        message: `Standard TTL updated to ${ttl} seconds`,
        stdTTL: cache.getTTL()
    });
});

// Protect subsequent CRUD task routes with Authentication Middleware
router.use(auth);

/**
 * @route   GET /tasks
 * @desc    Retrieve all tasks with node-cache in-memory caching (60s TTL)
 * @access  Private (Auth protected)
 */
router.get("/", async (req, res, next) => {
    const startTime = process.hrtime();
    const bypass = req.query.nocache === "true" || req.headers["x-cache-bypass"] === "true";
    const cacheKey = req.user ? `tasks_${req.user.id}` : "all_tasks";

    try {
        // Step 3: Check in-memory cache first if bypass is not requested
        if (!bypass) {
            const cached = cache.get(cacheKey) || (req.user ? null : cache.get("all_tasks"));
            if (cached) {
                const duration = getDurationMs(startTime);
                res.set("X-Cache", "HIT");
                res.set("X-Response-Time", `${duration}ms`);
                res.set("X-Cache-Key", cacheKey);
                return res.status(200).json(cached);
            }
        }

        // Cache MISS or bypass requested: Query MongoDB
        const query = req.user
            ? { $or: [{ user: req.user.id }, { user: { $exists: false } }, { user: null }] }
            : {};
        const tasks = await Task.find(query).sort({ createdAt: -1 });

        // Store fetched tasks in cache with configured TTL
        if (!bypass) {
            cache.set(cacheKey, tasks);
            cache.set("all_tasks", tasks);
        }

        const duration = getDurationMs(startTime);
        res.set("X-Cache", bypass ? "BYPASS" : "MISS");
        res.set("X-Response-Time", `${duration}ms`);
        res.set("X-Cache-Key", cacheKey);
        res.status(200).json(tasks);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /tasks/:id
 * @desc    Retrieve a single task by ID with dedicated per-task caching (Supplementary Problem 1)
 * @access  Private
 */
router.get("/:id", validateTaskId, async (req, res, next) => {
    const startTime = process.hrtime();
    const singleCacheKey = `task_${req.params.id}`;
    const bypass = req.query.nocache === "true" || req.headers["x-cache-bypass"] === "true";

    try {
        if (!bypass) {
            const cachedTask = cache.get(singleCacheKey);
            if (cachedTask) {
                const duration = getDurationMs(startTime);
                res.set("X-Cache", "HIT");
                res.set("X-Response-Time", `${duration}ms`);
                res.set("X-Cache-Key", singleCacheKey);
                return res.status(200).json(cachedTask);
            }
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        if (!bypass) {
            cache.set(singleCacheKey, task);
        }

        const duration = getDurationMs(startTime);
        res.set("X-Cache", bypass ? "BYPASS" : "MISS");
        res.set("X-Response-Time", `${duration}ms`);
        res.set("X-Cache-Key", singleCacheKey);
        res.status(200).json(task);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /tasks
 * @desc    Create a new task and asynchronously emit 'task-created' event (Practical 10 Step 3)
 * @access  Private
 */
router.post("/", validateCreateTask, async (req, res, next) => {
    try {
        const task = new Task({
            title: req.body.title,
            description: req.body.description || "",
            completed: req.body.completed || false,
            user: req.user.id
        });
        const savedTask = await task.save();

        // Invalidate cache after successful write
        cache.del("all_tasks");
        if (req.user) {
            cache.del(`tasks_${req.user.id}`);
        }

        // Step 3: Record API response timestamp and respond immediately
        const apiResponseTimestamp = new Date().toISOString();
        console.log(`[API] Response sent at ${apiResponseTimestamp}`);

        // Immediate HTTP response returned to client BEFORE background listener finishes
        res.status(201).json({
            message: "Task created successfully",
            task: savedTask,
            apiResponseTimestamp: apiResponseTimestamp
        });

        // Step 3: Emit 'task-created' event right after responding
        const eventPayload = savedTask.toObject ? savedTask.toObject() : { ...savedTask };
        eventPayload.apiResponseTimestamp = apiResponseTimestamp;
        if (req.body.simulateError) {
            eventPayload.simulateError = true;
        }
        if (req.body.customDelay !== undefined) {
            eventPayload.customDelay = req.body.customDelay;
        }

        taskEvents.emit("task-created", eventPayload);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PUT /tasks/:id
 * @desc    Update a task and invalidate both task lists and single-task cache
 * @access  Private
 */
router.put("/:id", validateUpdateTask, async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );
        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        // Invalidate collection cache and individual task cache
        cache.del("all_tasks");
        if (req.user) {
            cache.del(`tasks_${req.user.id}`);
        }
        cache.del(`task_${req.params.id}`);

        res.status(200).json({
            message: "Task updated successfully",
            task: task
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   DELETE /tasks/:id
 * @desc    Delete a task and emit 'task-deleted' background event (Supplementary Problem 1)
 * @access  Private
 */
router.delete("/:id", validateTaskId, async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        // Invalidate collection cache and individual task cache
        cache.del("all_tasks");
        if (req.user) {
            cache.del(`tasks_${req.user.id}`);
        }
        cache.del(`task_${req.params.id}`);

        const apiResponseTimestamp = new Date().toISOString();
        console.log(`[API] Delete response sent at ${apiResponseTimestamp} for task ${task._id}`);

        // Immediate response
        res.status(200).json({
            message: "Task deleted successfully",
            deletedTask: task,
            apiResponseTimestamp: apiResponseTimestamp
        });

        // Emit 'task-deleted' event after responding
        taskEvents.emit("task-deleted", {
            id: task._id.toString(),
            title: task.title,
            user: req.user ? req.user.id : "Anonymous",
            apiResponseTimestamp: apiResponseTimestamp
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
