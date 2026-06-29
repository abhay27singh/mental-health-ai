import { useState } from "react";
import { api, getToken, setToken } from "./api";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import EmotionTab from "./components/EmotionTab.jsx";
import ChatbotTab from "./components/ChatbotTab.jsx";
import AdminTab from "./components/AdminTab.jsx";

const TABS = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "emotion", label: "😊 Emotion" },
  { id: "chatbot", label: "🤖 Chatbot" },
  { id: "admin", label: "🛠 Admin" },
];

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = getToken();
    if (!token) return null;
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

  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <div className="topbar">
        <strong>🧠 Mental Health AI</strong>
        <div className="row">
          <span className="muted">Logged in as {auth.username}</span>
          <button className="ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <Dashboard />}
        {tab === "emotion" && <EmotionTab />}
        {tab === "chatbot" && <ChatbotTab />}
        {tab === "admin" && <AdminTab isAdmin={auth.isAdmin} />}
      </div>
    </>
  );
}
