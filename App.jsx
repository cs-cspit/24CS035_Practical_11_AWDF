import { useEffect, useState, useCallback } from "react";
import "./App.css";

const API_BASE = "http://localhost:5000";

/* ── Minimal SVG Icons ── */
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconLogOut = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconServer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const IconDatabase = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

function App() {
  // Authentication state
  const [token, setToken] = useState(() => localStorage.getItem("tm_auth_token") || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Task list state
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  // Docker Health Check & Telemetry (Practical 11)
  const [dockerHealth, setDockerHealth] = useState({
    status: "Checking...",
    service: "backend",
    container: "task-manager-backend",
    database: "Connecting...",
    mongoUri: "mongodb://mongodb:27017/taskdb",
    latency: null,
    checkedAt: null,
    isHealthy: false,
  });
  const [pinging, setPinging] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);

  // Edit task modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Notification banners
  const [notice, setNotice] = useState(null);

  const showNotice = (text, type = "info") => {
    setNotice({ text, type });
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleAuthExpired = useCallback((customMsg) => {
    localStorage.removeItem("tm_auth_token");
    setToken("");
    setUser(null);
    setTasks([]);
    setAuthMode("login");
    showNotice(customMsg || "Session expired. Please sign in again.", "error");
  }, []);

  const authFetch = useCallback(
    async (endpoint, options = {}) => {
      const activeToken = token || localStorage.getItem("tm_auth_token");
      const headers = {
        "Content-Type": "application/json",
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        ...options.headers,
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        handleAuthExpired(errorData.message || "Session expired. Redirecting to login...");
        throw new Error(errorData.message || "Unauthorized (401)");
      }

      return res;
    },
    [token, handleAuthExpired]
  );

  // Check Docker backend health and inter-container connectivity
  const checkDockerHealth = useCallback(async () => {
    setPinging(true);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`);
      const latency = (performance.now() - start).toFixed(1);
      if (res.ok) {
        const data = await res.json();
        setDockerHealth({
          status: data.status || "OK",
          service: data.service || "backend",
          container: data.container || "task-manager-backend",
          database: data.database || "Connected",
          mongoUri: data.mongoUri || "mongodb://mongodb:27017/taskdb",
          latency: `${latency}ms`,
          checkedAt: new Date().toLocaleTimeString(),
          isHealthy: true,
        });
      } else {
        setDockerHealth((prev) => ({
          ...prev,
          status: "Error",
          latency: `${latency}ms`,
          checkedAt: new Date().toLocaleTimeString(),
          isHealthy: false,
        }));
      }
    } catch {
      setDockerHealth((prev) => ({
        ...prev,
        status: "Unreachable",
        latency: "--",
        checkedAt: new Date().toLocaleTimeString(),
        isHealthy: false,
      }));
    } finally {
      setPinging(false);
    }
  }, []);

  // Fetch Tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch("/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      if (err.message && !err.message.includes("401")) {
        showNotice("Could not load tasks from containerized backend.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Initial load
  useEffect(() => {
    checkDockerHealth();
    if (token) {
      // Validate session via /me
      authFetch("/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            fetchTasks();
          } else {
            handleAuthExpired("Invalid authentication token.");
          }
        })
        .catch(() => {
          // Handled in authFetch
        });
    }
  }, [token, authFetch, fetchTasks, handleAuthExpired, checkDockerHealth]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      showNotice("Please provide both email and password.", "error");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice(data.message || "Sign in failed.", "error");
        return;
      }
      localStorage.setItem("tm_auth_token", data.token);
      setToken(data.token);
      setUser(data.user || { email: authEmail.trim() });
      setAuthPassword("");
      showNotice("Signed in successfully. Connected to Docker stack.", "success");
      checkDockerHealth();
    } catch {
      showNotice("Unable to reach backend container at http://localhost:5000.", "error");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      showNotice("Please fill in email and password.", "error");
      return;
    }
    if (authPassword.length < 6) {
      showNotice("Password must be at least 6 characters.", "error");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authName.trim() || undefined,
          email: authEmail.trim(),
          password: authPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice(data.message || "Registration failed.", "error");
        return;
      }
      localStorage.setItem("tm_auth_token", data.token);
      setToken(data.token);
      setUser(data.user || { email: authEmail.trim() });
      setAuthPassword("");
      showNotice("Account registered in containerized MongoDB volume.", "success");
      checkDockerHealth();
    } catch {
      showNotice("Unable to connect to backend container.", "error");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("tm_auth_token");
    setToken("");
    setUser(null);
    setTasks([]);
    setAuthMode("login");
    showNotice("Signed out successfully.", "info");
  };

  // Handle Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotice("Task title is required by backend validation middleware.", "error");
      return;
    }
    try {
      setLoading(true);
      const res = await authFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice(data.message || "Failed to create task.", "error");
        return;
      }
      setTitle("");
      setDescription("");
      showNotice("Task persisted to MongoDB container volume (mongo-data).", "success");
      fetchTasks();
    } catch {
      // Handled in authFetch
    } finally {
      setLoading(false);
    }
  };

  // Handle Toggle Complete
  const handleToggleTask = async (task) => {
    try {
      const res = await authFetch(`/tasks/${task._id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          completed: !task.completed,
        }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, completed: !task.completed } : t))
        );
        showNotice(`Task marked as ${!task.completed ? "completed" : "pending"}.`, "info");
      }
    } catch {
      // Handled in authFetch
    }
  };

  // Handle Edit Task Save
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      showNotice("Title is required.", "error");
      return;
    }
    try {
      const res = await authFetch(`/tasks/${editingTask._id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          completed: editingTask.completed,
        }),
      });
      if (res.ok) {
        setEditingTask(null);
        showNotice("Task updated successfully in MongoDB.", "success");
        fetchTasks();
      }
    } catch {
      // Handled in authFetch
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await authFetch(`/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
        showNotice("Task deleted from MongoDB container volume.", "info");
      }
    } catch {
      // Handled in authFetch
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed") return t.completed;
    if (filter === "pending") return !t.completed;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="app-shell">
      {/* ── Top Minimal Header ── */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-dot" />
          <div>
            <h1 className="brand-title">TaskFlow</h1>
            <p className="brand-subtitle">Practical 11 • Containerization with Docker & Docker Compose</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Architecture info button */}
          <button
            type="button"
            className="btn-subtle btn-arch-pill"
            onClick={() => setShowArchModal(true)}
            title="Inspect Docker Compose Architecture"
          >
            <IconBox /> Stack Architecture
          </button>

          {token && (
            <div className="header-user-panel">
              <div className="user-badge">
                <span className="user-icon"><IconShield /></span>
                <span className="user-email">{user?.email || "Authenticated User"}</span>
              </div>
              <button
                type="button"
                className="btn-subtle btn-logout"
                onClick={handleLogout}
                title="Sign out"
              >
                <IconLogOut /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Notification Toast ── */}
      {notice && (
        <div className={`notice-banner notice-${notice.type}`}>
          <span className="notice-icon">
            {notice.type === "error" ? <IconAlert /> : <IconCheck />}
          </span>
          <span className="notice-text">{notice.text}</span>
          <button type="button" className="notice-dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      {/* ── Minimal Docker Compose Stack Status Banner ── */}
      <div className="docker-status-bar">
        <div className="docker-status-container">
          <div className="stack-status-label">
            <span className="live-dot" />
            <span className="stack-title">Docker Compose Topology:</span>
          </div>

          <div className="service-badges-group">
            <div className="service-chip frontend-chip">
              <span className="chip-icon"><IconBox /></span>
              <span className="chip-name">frontend</span>
              <span className="chip-port">:5173</span>
              <span className="chip-tag">React (Vite)</span>
            </div>

            <span className="network-arrow">──►</span>

            <div className="service-chip backend-chip">
              <span className="chip-icon"><IconServer /></span>
              <span className="chip-name">backend</span>
              <span className="chip-port">:5000</span>
              <span className="chip-tag">Express API</span>
            </div>

            <span className="network-arrow">──►</span>

            <div className="service-chip mongo-chip">
              <span className="chip-icon"><IconDatabase /></span>
              <span className="chip-name">mongodb</span>
              <span className="chip-port">:27017</span>
              <span className="chip-tag">Named Volume</span>
            </div>
          </div>

          <div className="health-ping-action">
            <button
              type="button"
              className="btn-ping"
              onClick={checkDockerHealth}
              disabled={pinging}
              title="Ping backend health endpoint to verify container network"
            >
              <IconRefresh />
              <span>{pinging ? "Pinging..." : `Health: ${dockerHealth.status} (${dockerHealth.latency || "--"})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <main className="main-content">
        {!token ? (
          /* ── Unauthenticated State: Minimal Auth Card ── */
          <div className="auth-card-container">
            <div className="auth-card">
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                  onClick={() => setAuthMode("login")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                  onClick={() => setAuthMode("register")}
                >
                  Register
                </button>
              </div>

              <div className="auth-body">
                <div className="auth-intro">
                  <h2>{authMode === "login" ? "Welcome back" : "Create an account"}</h2>
                  <p>
                    {authMode === "login"
                      ? "Enter your credentials to test containerized task operations."
                      : "Register with email and password to receive a signed JWT token."}
                  </p>
                </div>

                <form
                  onSubmit={authMode === "login" ? handleLogin : handleRegister}
                  className="auth-form"
                >
                  {authMode === "register" && (
                    <div className="input-group">
                      <label htmlFor="reg-name">Full Name (Optional)</label>
                      <input
                        id="reg-name"
                        type="text"
                        placeholder="e.g. Samarth Kalavadia"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                  )}

                  <div className="input-group">
                    <label htmlFor="auth-email">Email Address</label>
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="user@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="auth-password">Password</label>
                    <input
                      id="auth-password"
                      type="password"
                      placeholder={authMode === "register" ? "At least 6 characters" : "••••••••"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary auth-submit-btn"
                    disabled={authSubmitting}
                  >
                    {authSubmitting
                      ? "Processing..."
                      : authMode === "login"
                      ? "Sign In"
                      : "Create Account"}
                  </button>
                </form>

                <div className="auth-footer-notes">
                  <div className="badge-row">
                    <span className="meta-pill">Bridge Network (app-network)</span>
                    <span className="meta-pill">Service DNS: mongodb</span>
                    <span className="meta-pill">Volume: mongo-data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Authenticated State: Task Management Dashboard ── */
          <div className="dashboard-grid">
            {/* Left Column: Task Creator & Container Telemetry */}
            <aside className="sidebar-column">
              {/* Task Creation Form */}
              <div className="card task-create-card">
                <div className="card-header">
                  <h3 className="card-title">New Task</h3>
                  <span className="card-badge">Persisted in MongoDB</span>
                </div>
                <form onSubmit={handleAddTask} className="task-form">
                  <div className="input-group">
                    <label htmlFor="task-title">Task Title *</label>
                    <input
                      id="task-title"
                      type="text"
                      placeholder="e.g. Write Dockerfile for React frontend"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="task-desc">Description (optional)</label>
                    <textarea
                      id="task-desc"
                      rows={2}
                      placeholder="e.g. Use multi-stage build to reduce final image size"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <IconPlus /> Add Task
                  </button>
                </form>
              </div>

              {/* Docker Container Inspector Card */}
              <div className="card lab-info-card">
                <div className="card-header">
                  <h4 className="lab-info-title">Container Telemetry</h4>
                  <span className="ttl-pill">docker-compose</span>
                </div>

                <div className="telemetry-list">
                  <div className="telemetry-row">
                    <span className="telemetry-label">Frontend Service</span>
                    <span className="telemetry-val">task-manager-frontend :5173</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-label">Backend Service</span>
                    <span className="telemetry-val">task-manager-backend :5000</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-label">MongoDB Service</span>
                    <span className="telemetry-val">task-manager-mongodb :27017</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-label">Internal DNS Name</span>
                    <span className="telemetry-val text-success">mongodb://mongodb:27017</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-label">Data Volume</span>
                    <span className="telemetry-val">mongo-data (/data/db)</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-label">Bridge Network</span>
                    <span className="telemetry-val">app-network</span>
                  </div>
                </div>

                <div className="telemetry-footer-btn">
                  <button
                    type="button"
                    className="btn-subtle btn-block"
                    onClick={() => setShowArchModal(true)}
                  >
                    View Dockerfile & Compose Blueprint
                  </button>
                </div>
              </div>
            </aside>

            {/* Right Column: Task List & Controls */}
            <section className="main-tasks-column">
              {/* Task Filter Toolbar */}
              <div className="task-toolbar">
                <div className="stats-pills">
                  <button
                    type="button"
                    className={`filter-pill ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                  >
                    All ({tasks.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${filter === "pending" ? "active" : ""}`}
                    onClick={() => setFilter("pending")}
                  >
                    Active ({pendingCount})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${filter === "completed" ? "active" : ""}`}
                    onClick={() => setFilter("completed")}
                  >
                    Completed ({completedCount})
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-subtle btn-refresh-tasks"
                  onClick={fetchTasks}
                  disabled={loading}
                  title="Reload tasks from container database"
                >
                  <IconRefresh /> Refresh
                </button>
              </div>

              {/* Task Items */}
              <div className="tasks-container">
                {loading && tasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="spinner" />
                    <p>Fetching tasks from containerized backend...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><IconBox /></div>
                    <h3>No tasks found</h3>
                    <p>
                      {filter === "all"
                        ? "Create your first task above. It will be stored in the persistent MongoDB container volume."
                        : `No ${filter} tasks right now.`}
                    </p>
                  </div>
                ) : (
                  <div className="task-cards-list">
                    {filteredTasks.map((t) => (
                      <div
                        key={t._id}
                        className={`task-item-card ${t.completed ? "task-completed" : ""}`}
                      >
                        <button
                          type="button"
                          className={`task-checkbox ${t.completed ? "checked" : ""}`}
                          onClick={() => handleToggleTask(t)}
                          aria-label={t.completed ? "Mark pending" : "Mark completed"}
                        >
                          {t.completed && <IconCheck />}
                        </button>

                        <div className="task-content">
                          <h4 className="task-title-text">{t.title}</h4>
                          {t.description && (
                            <p className="task-desc-text">{t.description}</p>
                          )}
                          <div className="task-meta-row">
                            <span className="task-id-badge">ID: {t._id.slice(-6)}</span>
                            <span className="task-volume-badge">Volume Persisted</span>
                            {t.createdAt && (
                              <span className="task-date">
                                {new Date(t.createdAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="task-actions-group">
                          <button
                            type="button"
                            className="task-action-btn edit-btn"
                            onClick={() => {
                              setEditingTask(t);
                              setEditTitle(t.title);
                              setEditDescription(t.description || "");
                            }}
                            title="Edit task"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="task-action-btn delete-btn"
                            onClick={() => handleDeleteTask(t._id)}
                            title="Delete task"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ── Edit Task Modal ── */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Task</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingTask(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="input-group">
                <label htmlFor="edit-task-title">Title</label>
                <input
                  id="edit-task-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="edit-task-desc">Description</label>
                <textarea
                  id="edit-task-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-subtle"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Practical 11 Architecture Modal ── */}
      {showArchModal && (
        <div className="modal-overlay" onClick={() => setShowArchModal(false)}>
          <div className="modal-dialog arch-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Docker Compose Multi-Container Blueprint</h3>
                <p className="modal-subtitle">Practical 11 Architecture & Inter-Container Networking</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowArchModal(false)}
              >
                ×
              </button>
            </div>

            <div className="arch-modal-body">
              <div className="arch-ascii-box">
                <pre>
{`docker-compose.yml
├── frontend (React, built + served, port 5173)
├── backend (Node/Express, port 5000)
└── mongodb (official mongo image, port 27017)

Network: app-network (bridge)
frontend ──► backend ──► mongodb
All 3 services start together via: docker-compose up --build`}
                </pre>
              </div>

              <div className="qa-quick-cards">
                <div className="qa-card">
                  <h5>Why service name 'mongodb' instead of 'localhost'?</h5>
                  <p>
                    Each container runs in its own network namespace with its own loopback interface (localhost).
                    Connecting to localhost inside the backend container would look for MongoDB inside the backend container itself.
                    Docker's embedded DNS server on the bridge network automatically resolves container service names (e.g. mongodb) to their container IP.
                  </p>
                </div>

                <div className="qa-card">
                  <h5>Difference between EXPOSE and ports mapping?</h5>
                  <p>
                    <strong>EXPOSE</strong> in a Dockerfile is documentation indicating which container port the process listens on; it does not publish the port to the host.
                    <strong>ports</strong> in docker-compose.yml (e.g. 5173:5173) maps a host port to the container port, opening access from the host machine browser.
                  </p>
                </div>

                <div className="qa-card">
                  <h5>Why exclude node_modules via .dockerignore?</h5>
                  <p>
                    1. Prevents transferring thousands of host files into Docker build context (huge build speedup).
                    2. Avoids OS/architecture mismatches for native binary packages (e.g. Windows x64 vs Linux Alpine).
                    3. Guarantees deterministic, reproducible builds through npm install inside the container.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowArchModal(false)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
