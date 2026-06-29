import { useRef, useState, useEffect } from "react";
import { api } from "../api";

export default function ChatbotTab() {
  const [history, setHistory] = useState([]); // {sender, text}
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [history]);

  async function send() {
    const text = msg.trim();
    if (!text || busy) return;
    setMsg("");
    const newHistory = [...history, { sender: "You", text }];
    setHistory(newHistory);
    setBusy(true);
    try {
      const res = await api.chat(text, history.slice(-6));
      setHistory([
        ...newHistory,
        { sender: "AI", text: res.response, emergency: res.emergency },
      ]);
    } catch (err) {
      setHistory([
        ...newHistory,
        { sender: "AI", text: `Error: ${err.message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") send();
  }

  return (
    <div className="card">
      <h2>💬 AI Chatbot</h2>

      <div className="chat-box" ref={boxRef}>
        {history.length === 0 && (
          <div className="muted">Say something to start the conversation.</div>
        )}
        {history.map((m, i) => {
          if (m.sender === "You") {
            return (
              <div key={i} className="bubble user">
                {m.text}
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`bubble ${m.emergency ? "emergency" : "ai"}`}
            >
              {m.emergency ? "" : "🤖 "}
              {m.text}
            </div>
          );
        })}
        {busy && <div className="bubble ai">🤖 ...</div>}
      </div>

      <div className="row">
        <input
          type="text"
          placeholder="Type your message"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button onClick={send} disabled={busy}>
          Send
        </button>
        <button className="secondary" onClick={() => setHistory([])}>
          Clear
        </button>
      </div>
    </div>
  );
}
