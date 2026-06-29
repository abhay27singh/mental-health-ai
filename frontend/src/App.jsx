import { useState } from "react";
import { api, getToken, setToken } from "./api";
import { Icons } from "./components/ui.jsx";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import EmotionTab from "./components/EmotionTab.jsx";
import ChatbotTab from "./components/ChatbotTab.jsx";
import AdminTab from "./components/AdminTab.jsx";

const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Icons.dashboard,
    title: "Wellness Dashboard",
    subtitle: "Track your mental health, log your mood, and get tailored guidance.",
  },
  {
    id: "emotion",
    label: "Emotion Scan",
    icon: Icons.emotion,
    title: "Facial Emotion Detection",
    subtitle: "Capture a photo and let AI read your current emotional state.",
  },
  {
    id: "chatbot",
    label: "AI Companion",
    icon: Icons.chat,
    title: "AI Support Companion",
    subtitle: "A calm, judgment-free space to talk things through.",
  },
  {
    id: "admin",
    label: "Admin",
    icon: Icons.admin,
    title: "Admin Console",
    subtitle: "Manage users and review wellness analytics.",
  },
];

export default function App() {
  const [auth, setAuth] = useState(() => {
    if (!getToken()) return null;
    return {
      username: localStorage.getItem("mh_user") || "",
      isAdmin: localStorage.getItem("mh_admin") === "true",
    };
  });
  const [tab, setTab] = useState("dashboard");

  function handleLogin({ username, is_admin }) {
    localStorage.setItem("mh_user", username);
    localStorage.setItem("mh_admin", String(is_admin));
    setAuth({ username, isAdmin: is_admin });
    setTab("dashboard");
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    localStorage.removeItem("mh_user");
    localStorage.removeItem("mh_admin");
    setAuth(null);
  }

  if (!auth) return <Login onLogin={handleLogin} />;

  // Hide admin nav for non-admins.
  const nav = NAV.filter((n) => n.id !== "admin" || auth.isAdmin);
  const current = NAV.find((n) => n.id === tab) || NAV[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">🧠</div>
          <div>
            <div className="brand-name">MindScope</div>
            <div className="brand-sub">Wellness AI</div>
          </div>
        </div>

        <nav className="nav">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              {n.icon}
              <span className="lbl">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">
              {auth.username.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="user-meta">
              <div className="user-name">{auth.username}</div>
              <div className="user-role">{auth.isAdmin ? "Administrator" : "Member"}</div>
            </div>
          </div>
          <button className="ghost block" onClick={handleLogout}>
            {Icons.logout}
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="page-header">
          <h1>{current.title}</h1>
          <p>{current.subtitle}</p>
        </header>

        {tab === "dashboard" && <Dashboard />}
        {tab === "emotion" && <EmotionTab />}
        {tab === "chatbot" && <ChatbotTab />}
        {tab === "admin" && <AdminTab isAdmin={auth.isAdmin} />}
      </main>
    </div>
  );
}
