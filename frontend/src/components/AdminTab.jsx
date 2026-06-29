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
  Cell,
} from "recharts";
import { api } from "../api";

const chartTooltip = {
  contentStyle: {
    background: "#141a29",
    border: "1px solid #232b3d",
    borderRadius: 10,
    color: "#eef2f9",
  },
};
const BAR_COLORS = ["#6366f1", "#2dd4bf", "#fbbf24", "#f87171", "#60a5fa", "#a78bfa", "#34d399"];

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
      setSelected((cur) => cur || list[0] || "");
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (!selected) return setDetail(null);
    api.adminUserDetail(selected).then(setDetail).catch((e) =>
      setMsg({ type: "error", text: e.message })
    );
  }, [selected]);

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="empty">
          <span className="emoji">🔒</span>
          Access denied — administrators only.
        </div>
      </div>
    );
  }

  async function updatePassword() {
    if (!newPass) return;
    try {
      await api.adminUpdatePassword(selected, newPass);
      setNewPass("");
      setMsg({ type: "success", text: `Password updated for ${selected}.` });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  async function deleteUser() {
    if (!confirm(`Delete user "${selected}" and all their data?`)) return;
    try {
      await api.adminDeleteUser(selected);
      setMsg({ type: "warning", text: `User "${selected}" deleted.` });
      setSelected("");
      setDetail(null);
      loadUsers();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  const emotionData = detail
    ? Object.entries(detail.emotion_counts).map(([emotion, count]) => ({ emotion, count }))
    : [];

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="label">Total Members</div>
          <div className="value grad">{users.length}</div>
        </div>
        <div className="stat">
          <div className="label">Mood Logs (selected)</div>
          <div className="value">{detail ? detail.moods.length : "—"}</div>
        </div>
        <div className="stat">
          <div className="label">Emotion Scans (selected)</div>
          <div className="value">{emotionData.reduce((a, b) => a + b.count, 0) || "—"}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="ico">👥</div>
          <div>
            <h2>User Management</h2>
            <div className="sub">Select a member to review and manage</div>
          </div>
        </div>

        {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

        {users.length === 0 ? (
          <div className="empty">
            <span className="emoji">🗂️</span>
            No registered members yet.
          </div>
        ) : (
          <>
            <div className="field" style={{ maxWidth: 320 }}>
              <label>Member</label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {users.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
              <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label>Reset password</label>
                <input
                  type="password"
                  value={newPass}
                  placeholder="New password"
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>
              <button className="secondary" onClick={updatePassword}>
                Update
              </button>
              <button className="danger" onClick={deleteUser}>
                Delete user
              </button>
            </div>
          </>
        )}
      </div>

      {detail && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div className="ico">📈</div>
              <div>
                <h2>Mood History</h2>
                <div className="sub">{selected}</div>
              </div>
            </div>
            {detail.moods.length === 0 ? (
              <div className="empty">
                <span className="emoji">📭</span>No mood data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={detail.moods} margin={{ left: -18, right: 6, top: 6 }}>
                  <CartesianGrid stroke="#232b3d" strokeDasharray="3 3" />
                  <XAxis hide />
                  <YAxis domain={[-1, 1]} stroke="#6b7689" fontSize={10} />
                  <Tooltip {...chartTooltip} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div className="ico">😊</div>
              <div>
                <h2>Emotion Breakdown</h2>
                <div className="sub">{selected}</div>
              </div>
            </div>
            {emotionData.length === 0 ? (
              <div className="empty">
                <span className="emoji">📭</span>No emotion data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={emotionData} margin={{ left: -18, right: 6, top: 6 }}>
                  <CartesianGrid stroke="#232b3d" strokeDasharray="3 3" />
                  <XAxis dataKey="emotion" stroke="#6b7689" fontSize={10} />
                  <YAxis stroke="#6b7689" fontSize={10} allowDecimals={false} />
                  <Tooltip {...chartTooltip} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {emotionData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </>
  );
}
