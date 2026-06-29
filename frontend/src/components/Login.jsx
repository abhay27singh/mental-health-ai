import { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(username, password);
        setMsg({ type: "success", text: "Registered! You can log in now." });
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
    <div className="login-wrap">
      <h1 className="login-title">🔐 Mental Health AI System</h1>
      <div className="card">
        <div className="toggle">
          <button
            className={mode === "login" ? "active" : "secondary"}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "register" ? "active" : "secondary"}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={busy}>
              {busy ? "..." : mode === "login" ? "Login" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
