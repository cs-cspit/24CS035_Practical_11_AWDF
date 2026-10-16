/**
 * Practical 10: Asynchronous Processing with Event-Driven Architecture
 * Dedicated listeners.js module registering decoupled background event handlers.
 */
const taskEvents = require("./events");

// In-memory buffer storing recent background event execution metrics for live UI monitoring & verification
const eventAuditLog = [];
const MAX_LOG_SIZE = 50;

function appendLog(entry) {
    eventAuditLog.unshift(entry);
    if (eventAuditLog.length > MAX_LOG_SIZE) {
        eventAuditLog.pop();
    }
}

/**
 * Step 2 & Step 5: Background listener for 'task-created' event
 * Simulates a slow notification service (e.g. email/SMS delivery) with a 2-second non-blocking delay.
 */
taskEvents.on("task-created", (task) => {
    const receivedAt = new Date().toISOString();
    console.log(`[Notification-Start] Task "${task.title}" notification processing started at ${receivedAt}`);

    // Simulated artificial background delay (2000ms) to make asynchronous execution clearly visible
    const delayMs = task.customDelay !== undefined ? Number(task.customDelay) : 2000;

    setTimeout(() => {
        try {
            // Supplementary Problem 2: Simulating an error condition inside the event handler
            if (task.simulateError) {
                throw new Error(`Simulated notification delivery failure for task "${task.title}": SMTP Gateway Timeout`);
            }

            const completedAt = new Date().toISOString();
            // Step 2 exact log format requested by the lab sheet:
            console.log(`[Notification] Task "${task.title}" created at ${completedAt}`);
            console.log(`[Notification-Complete] Background notification delivered for "${task.title}" at ${completedAt} (Assigned user: ${task.user || "N/A"})`);

            appendLog({
                id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                event: "task-created",
                taskId: task._id || task.id,
                title: task.title,
                user: task.user || "Anonymous",
                apiResponseTimestamp: task.apiResponseTimestamp || null,
                listenerReceivedAt: receivedAt,
                listenerCompletedAt: completedAt,
                delayMs: delayMs,
                status: "completed",
                message: `Task "${task.title}" created successfully and notification dispatched in background.`
            });
        } catch (err) {
            // Forward error to the dedicated error listener
            taskEvents.emit("error", err, task);
        }
    }, delayMs);
});

/**
 * Supplementary Problem 1: Background listener for 'task-deleted' event
 * Dispatches cleanup and audit notification when a task is deleted.
 */
taskEvents.on("task-deleted", (task) => {
    const receivedAt = new Date().toISOString();
    console.log(`[Notification-Start] Task-deleted background cleanup started for ID "${task.id || task._id}" at ${receivedAt}`);

    const delayMs = 1500; // 1.5s simulated background cleanup delay
    setTimeout(() => {
        const completedAt = new Date().toISOString();
        console.log(`[Notification] Task "${task.title || task.id}" permanently deleted at ${completedAt} (Deleted by: ${task.user || "Anonymous"})`);
        console.log(`[Notification-Complete] Background audit log and notification delivered for deleted task "${task.title || task.id}" at ${completedAt}`);

        appendLog({
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            event: "task-deleted",
            taskId: task.id || task._id,
            title: task.title || "Deleted Task",
            user: task.user || "Anonymous",
            apiResponseTimestamp: task.apiResponseTimestamp || null,
            listenerReceivedAt: receivedAt,
            listenerCompletedAt: completedAt,
            delayMs: delayMs,
            status: "completed",
            message: `Task "${task.title || task.id}" was deleted and audit record stored in background.`
        });
    }, delayMs);
});

/**
 * Supplementary Problem 2: Dedicated error event listener
 * Catches and logs any error thrown inside the task-created handler without crashing the server process.
 */
taskEvents.on("error", (err, context) => {
    const errorTimestamp = new Date().toISOString();
    console.error(`[Async-Error-Listener] Handled background event error at ${errorTimestamp}: ${err.message}`);
    if (context) {
        console.error(`[Async-Error-Listener] Context details - Task ID: ${context._id || context.id}, Title: "${context.title}"`);
    }

    appendLog({
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        event: "error",
        taskId: context ? (context._id || context.id) : null,
        title: context ? context.title : "N/A",
        user: context ? context.user : "N/A",
        apiResponseTimestamp: context ? context.apiResponseTimestamp : null,
        listenerReceivedAt: errorTimestamp,
        listenerCompletedAt: errorTimestamp,
        delayMs: 0,
        status: "error_caught",
        message: err.message
    });
});

module.exports = {
    getEventLogs: () => [...eventAuditLog],
    clearEventLogs: () => {
        eventAuditLog.length = 0;
    }
};
