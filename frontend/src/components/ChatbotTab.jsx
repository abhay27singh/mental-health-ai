import { useRef, useState, useEffect } from "react";
import { api } from "../api";
import { Typing } from "./ui.jsx";

const PROMPTS = [
  "I've been feeling overwhelmed lately",
  "How can I manage stress?",
  "I can't sleep well",
];

export default function ChatbotTab() {
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [history, busy]);

  async function sendText(text) {
    text = text.trim();
    if (!text || busy) return;
    setMsg("");
    const next = [...history, { sender: "You", text }];
    setHistory(next);
    setBusy(true);
    try {
      const res = await api.chat(text, history.slice(-6));
      setHistory([...next, { sender: "AI", text: res.response, emergency: res.emergency }]);
    } catch (err) {
      setHistory([...next, { sender: "AI", text: `Error: ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="ico">🤖</div>
        <div>
          <h2>AI Companion</h2>
          <div className="sub">Confidential · supportive · always here</div>
        </div>
        <div className="spacer" />
        {history.length > 0 && (
          <button className="ghost" onClick={() => setHistory([])}>
            Clear
          </button>
        )}
      </div>

      <div className="chat-box" ref={boxRef}>
        {history.length === 0 && !busy && (
          <div className="empty">
            <span className="emoji">💬</span>
            Start a conversation — I'm here to listen.
            <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
              {PROMPTS.map((p) => (
                <button key={p} className="secondary" onClick={() => sendText(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m, i) =>
          m.sender === "You" ? (
            <div key={i} className="bubble user">
              {m.text}
            </div>
          ) : (
            <div key={i} className={`bubble ${m.emergency ? "emergency" : "ai"}`}>
              {m.emergency ? "" : "🤖 "}
              {m.text}
            </div>
          )
        )}
        {busy && (
          <div className="bubble ai">
            <Typing />
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type your message…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText(msg)}
        />
        <button onClick={() => sendText(msg)} disabled={busy || !msg.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
