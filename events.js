const EventEmitter = require("events");

/**
 * Practical 10: Asynchronous Processing with Event-Driven Architecture
 * Dedicated EventEmitter module providing a decoupled event bus for task lifecycle events.
 */
class TaskEvents extends EventEmitter {}

// Export singleton instance shared across routes and listeners
module.exports = new TaskEvents();
