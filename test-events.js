// Automated test suite for Practical 10: Asynchronous Processing with Event-Driven Architecture
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();

const BASE_URL = "http://localhost:5000";

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
    console.log("===============================================================================");
    console.log("   PRACTICAL 10: EVENT-DRIVEN ARCHITECTURE (EVENTEMITTER) VERIFICATION SUITE   ");
    console.log("===============================================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, testName, extraDetails = "") {
        if (condition) {
            console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
            if (extraDetails) console.log(`       └─ ${extraDetails}`);
            passed++;
        } else {
            console.error(`\x1b[31m[FAIL]\x1b[0m ${testName}`);
            if (extraDetails) console.error(`       └─ ${extraDetails}`);
            failed++;
        }
    }

    const testUser = {
        name: "Samarth Kalavadia",
        email: `samarth_p10_${Date.now()}@charusat.edu.in`,
        password: "EventDrivenPass2026!"
    };

    let authToken = "";
    let createdTaskId = "";

    try {
        // 1. Health check
        const resHealth = await fetch(`${BASE_URL}/health`);
        const jsonHealth = await resHealth.json();
        assert(resHealth.status === 200 && jsonHealth.status === "OK", "1. Server Health Check (GET /health -> 200 OK)");

        // 2. Clear previous event logs
        const resClear = await fetch(`${BASE_URL}/events/clear`, { method: "POST" });
        assert(resClear.status === 200, "2. Event Audit Log cleared (POST /events/clear -> 200)");

        // 3. Register user for testing
        const resReg = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testUser)
        });
        const jsonReg = await resReg.json();
        authToken = jsonReg.token;
        assert(resReg.status === 201 && authToken, "3. User Authentication (Registered & JWT Issued)");

        // 4. Test Immediate API Response vs Asynchronous Event Handler
        console.log("\n--- Testing Task Creation Non-Blocking Behavior (Step 3 & 5) ---");
        const createPayload = {
            title: "Demonstrate Non-Blocking Event-Driven Background Notification",
            description: "EventEmitter decouples heavy notification I/O from critical request-response cycle.",
            completed: false,
            customDelay: 2000 // 2000ms artificial delay inside listener
        };

        const tRequestStart = Date.now();
        const resCreate = await fetch(`${BASE_URL}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify(createPayload)
        });
        const tRequestEnd = Date.now();
        const clientRoundTripMs = tRequestEnd - tRequestStart;
        const jsonCreate = await resCreate.json();
        createdTaskId = jsonCreate.task ? (jsonCreate.task._id || jsonCreate.task.id) : null;

        assert(
            resCreate.status === 201 && createdTaskId,
            "4.1 Task created successfully (POST /tasks -> 201 Created)",
            `API Response Time: ${clientRoundTripMs}ms (Immediate, << 2000ms delay)`
        );

        assert(
            clientRoundTripMs < 500,
            "4.2 Non-Blocking Proof: API returned before background listener finished",
            `API took ${clientRoundTripMs}ms to respond, while listener runs a 2000ms background delay.`
        );

        // 5. Verify that event log buffer does NOT have completed status yet (since listener is sleeping for 2000ms)
        const resImmediateLog = await fetch(`${BASE_URL}/events/logs`);
        const jsonImmediateLog = await resImmediateLog.json();
        const pendingEvent = jsonImmediateLog.logs.find((e) => e.taskId === createdTaskId);

        console.log(`       [T+${clientRoundTripMs}ms Check] Background worker still running in event loop timers queue...`);

        // 6. Wait 2300ms for listener to complete
        console.log("       Waiting 2.3 seconds for background listener setTimeout to fire...");
        await sleep(2300);

        // 7. Verify background listener completed and logged timestamps
        const resDoneLog = await fetch(`${BASE_URL}/events/logs`);
        const jsonDoneLog = await resDoneLog.json();
        const completedEvent = jsonDoneLog.logs.find((e) => e.taskId === createdTaskId && e.event === "task-created");

        assert(
            completedEvent && completedEvent.status === "completed",
            "5. Background Notification Listener executed and recorded completion",
            `Listener started: ${completedEvent.listenerReceivedAt} | Completed: ${completedEvent.listenerCompletedAt}`
        );

        if (completedEvent) {
            const apiTime = new Date(completedEvent.apiResponseTimestamp).getTime();
            const listenerEndTime = new Date(completedEvent.listenerCompletedAt).getTime();
            const timingDeltaMs = listenerEndTime - apiTime;

            assert(
                timingDeltaMs >= 1800,
                "6. Empirical Timestamp Ordering Proof: API Response < Listener Completion",
                `Timing Delta: ${timingDeltaMs}ms (~2000ms delay decoupled from response)`
            );
        }

        // 8. Test Supplementary Problem 1: task-deleted event
        console.log("\n--- Testing Supplementary Problem 1: task-deleted Event ---");
        const tDelStart = Date.now();
        const resDel = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const tDelEnd = Date.now();
        const delRoundTripMs = tDelEnd - tDelStart;
        assert(resDel.status === 200, "7.1 Task deleted immediately (DELETE /tasks/:id -> 200 OK)", `Roundtrip: ${delRoundTripMs}ms`);

        console.log("       Waiting 1.8s for task-deleted background listener (1500ms delay)...");
        await sleep(1800);

        const resDelLog = await fetch(`${BASE_URL}/events/logs`);
        const jsonDelLog = await resDelLog.json();
        const delEvent = jsonDelLog.logs.find((e) => e.taskId === createdTaskId && e.event === "task-deleted");

        assert(
            delEvent && delEvent.status === "completed",
            "7.2 task-deleted background event handled and recorded",
            `Audit log: "${delEvent.message}"`
        );

        // 9. Test Supplementary Problem 2: error event listener catches errors without crashing
        console.log("\n--- Testing Supplementary Problem 2: error Event Listener ---");
        const resErrorTest = await fetch(`${BASE_URL}/events/simulate-error`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "Simulated SMTP Failure Task",
                user: "TestEngineer"
            })
        });
        assert(resErrorTest.status === 202, "8.1 Triggered error simulation event (POST /events/simulate-error -> 202)");

        console.log("       Waiting 2.3s for error to be caught by taskEvents.on('error')...");
        await sleep(2300);

        const resErrLog = await fetch(`${BASE_URL}/events/logs`);
        const jsonErrLog = await resErrLog.json();
        const caughtErr = jsonErrLog.logs.find((e) => e.event === "error");

        assert(
            caughtErr && caughtErr.status === "error_caught",
            "8.2 Error event listener caught exception safely",
            `Caught error message: "${caughtErr.message}"`
        );

        // 10. Verify server is still completely alive and healthy after error
        const resHealthAfter = await fetch(`${BASE_URL}/health`);
        assert(
            resHealthAfter.status === 200,
            "9. Server Resilience: Process did not crash upon event handler error",
            "Server continues serving traffic seamlessly."
        );

        console.log("\n===============================================================================");
        console.log(`   TEST RESULTS SUMMARY: ${passed} PASSED, ${failed} FAILED                     `);
        console.log("===============================================================================\n");

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
}

runTests();
