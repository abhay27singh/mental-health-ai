import { useState } from "react";
import { api, setToken } from "../api";
import { Spinner } from "./ui.jsx";

const FEATURES = [
  ["📊", "Personalized mental health assessments"],
  ["📝", "Mood journaling with sentiment insights"],
  ["😊", "AI facial emotion detection"],
  ["💬", "24/7 compassionate AI companion"],
];

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(username, password);
        setMsg({ type: "success", text: "Account created — you can sign in now." });
        setMode("login");
      } else {
        const res = await api.login(username, password);
        setToken(res.token);
        onLogin(res);
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="inner">
          <div className="brand" style={{ padding: 0, marginBottom: 28 }}>
            <div className="brand-logo">🧠</div>
            <div className="brand-name" style={{ fontSize: 22 }}>
              MindScope
            </div>
          </div>
          <h1>Your AI-powered mental wellness companion.</h1>
          <p>
            Understand your emotions, track your mood over time, and get
            supportive, science-informed guidance — all in one private space.
          </p>
          <ul className="hero-features">
            {FEATURES.map(([ico, text]) => (
              <li key={text}>
                <span className="hf-ico">{ico}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="brand">
            <div className="brand-logo">🧠</div>
            <div>
              <div className="brand-name">Welcome back</div>
              <div className="brand-sub">Sign in to continue</div>
            </div>
          </div>

          <div className="toggle">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

            <button type="submit" className="block" disabled={busy} style={{ marginTop: 6 }}>
              {busy ? <Spinner /> : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
