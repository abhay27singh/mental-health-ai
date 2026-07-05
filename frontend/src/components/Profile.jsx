import { useEffect, useState } from "react";
import { api } from "../api";
import { Spinner } from "./ui.jsx";

export default function Profile({ username }) {
  const [form, setForm] = useState({ full_name: "", email: "", age: "", gender: "" });
  const [loaded, setLoaded] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState(null);

  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    api
      .getProfile()
      .then((p) =>
        setForm({
          full_name: p.full_name || "",
          email: p.email || "",
          age: p.age ?? "",
          gender: p.gender || "",
        })
      )
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function saveDetails(e) {
    e.preventDefault();
    setDetailsMsg(null);
    setSavingDetails(true);
    try {
      await api.updateProfile({
        full_name: form.full_name,
        email: form.email,
        age: form.age === "" ? null : Number(form.age),
        gender: form.gender,
      });
      setDetailsMsg({ type: "success", text: "Profile details saved." });
    } catch (err) {
      setDetailsMsg({ type: "error", text: err.message });
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.new_password !== pw.confirm) {
      return setPwMsg({ type: "error", text: "New passwords don't match." });
    }
    setSavingPw(true);
    try {
      await api.changePassword(pw.current_password, pw.new_password);
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.message });
    } finally {
      setSavingPw(false);
    }
  }

  if (!loaded) {
    return (
      <div className="card">
        <div className="empty">
          <Spinner /> &nbsp; Loading your profile…
        </div>
      </div>
    );
  }

  return (
    <div className="grid-2">
      {/* Basic details */}
      <div className="card">
        <div className="card-head">
          <div className="ico">🪪</div>
          <div>
            <h2>Basic Details</h2>
            <div className="sub">Update your personal information</div>
          </div>
        </div>

        <form onSubmit={saveDetails}>
          <div className="field">
            <label>Username</label>
            <input type="text" value={username} disabled />
          </div>
          <div className="field">
            <label>Full name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="e.g. Abhay Singh"
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="text"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
            />
          </div>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Age</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.age}
                onChange={set("age")}
                placeholder="e.g. 21"
              />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Gender</label>
              <select value={form.gender} onChange={set("gender")}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {detailsMsg && <div className={`alert ${detailsMsg.type}`}>{detailsMsg.text}</div>}

          <button type="submit" disabled={savingDetails} style={{ marginTop: 16 }}>
            {savingDetails ? <Spinner /> : "Save changes"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-head">
          <div className="ico">🔑</div>
          <div>
            <h2>Change Password</h2>
            <div className="sub">Keep your account secure</div>
          </div>
        </div>

        <form onSubmit={savePassword}>
          <div className="field">
            <label>Current password</label>
            <input
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))}
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label>New password</label>
            <input
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </div>

          {pwMsg && <div className={`alert ${pwMsg.type}`}>{pwMsg.text}</div>}

          <button
            type="submit"
            className="secondary"
            disabled={savingPw}
            style={{ marginTop: 8 }}
          >
            {savingPw ? <Spinner /> : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
