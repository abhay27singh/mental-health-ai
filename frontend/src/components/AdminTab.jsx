import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../api";

export default function AdminTab({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState(null);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState(null);

  async function loadUsers() {
    try {
      const list = await api.adminUsers();
      setUsers(list);
      if (list.length && !selected) setSelected(list[0]);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    api
      .adminUserDetail(selected)
      .then(setDetail)
      .catch((err) => setMsg({ type: "error", text: err.message }));
  }, [selected]);

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="alert error">Access Denied ❌</div>
      </div>
    );
  }

  async function updatePassword() {
    if (!newPass) return;
    try {
      await api.adminUpdatePassword(selected, newPass);
      setNewPass("");
      setMsg({ type: "success", text: "Password updated" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  async function deleteUser() {
    if (!confirm(`Delete user "${selected}" and all their data?`)) return;
    try {
      await api.adminDeleteUser(selected);
      setMsg({ type: "warning", text: "User deleted" });
      setSelected("");
      setDetail(null);
      loadUsers();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  const emotionData = detail
    ? Object.entries(detail.emotion_counts).map(([emotion, count]) => ({
        emotion,
        count,
      }))
    : [];

  return (
    <div className="card">
      <h2>🛠 Admin Panel</h2>
      <div className="alert success">Welcome Admin 👑</div>

      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      {users.length === 0 ? (
        <div className="muted">No registered users yet.</div>
      ) : (
        <>
          <label>Select User</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {detail && (
            <div style={{ marginTop: 20 }}>
              <h3>Mood Scores</h3>
              {detail.moods.length === 0 ? (
                <div className="muted">No mood data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={detail.moods}>
                    <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
                    <XAxis hide />
                    <YAxis domain={[-1, 1]} stroke="#8b949e" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#161b22",
                        border: "1px solid #2a2f3a",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              <h3>Emotion Counts</h3>
              {emotionData.length === 0 ? (
                <div className="muted">No emotion data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={emotionData}>
                    <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" stroke="#8b949e" fontSize={11} />
                    <YAxis stroke="#8b949e" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#161b22",
                        border: "1px solid #2a2f3a",
                      }}
                    />
                    <Bar dataKey="count" fill="#2ecc71" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <label>New Password</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
            <div className="row" style={{ marginTop: 12 }}>
              <button onClick={updatePassword}>Update Password</button>
              <button className="danger" onClick={deleteUser}>
                Delete User
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
