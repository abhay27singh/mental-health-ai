import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../api";

const QUESTIONS = [
  ["Stress Level", "How stressed have you felt recently?"],
  ["Sleep Quality", "How well have you been sleeping?"],
  ["Anxiety Level", "How often do you feel anxious?"],
  ["Energy Level", "How energetic do you feel daily?"],
  ["Focus Level", "How well can you concentrate?"],
];

function formatDate(d) {
  const dt = new Date(d.replace(" ", "T") + "Z");
  if (isNaN(dt)) return d;
  return dt.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(0));
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const [moodText, setMoodText] = useState("");
  const [moodMsg, setMoodMsg] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    try {
      const data = await api.moodHistory();
      setHistory(data.map((d) => ({ ...d, label: formatDate(d.date) })));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function setAnswer(i, val) {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? val : a)));
  }

  async function runPredict() {
    setPredicting(true);
    setPrediction(null);
    try {
      const res = await api.predict(answers);
      setPrediction(res);
    } catch (err) {
      setPrediction({ error: err.message });
    } finally {
      setPredicting(false);
    }
  }

  async function analyzeMood() {
    if (!moodText.trim()) return;
    setMoodMsg(null);
    try {
      const res = await api.addMood(moodText);
      setMoodMsg({ type: "success", text: `Mood Score: ${res.score}` });
      setMoodText("");
      loadHistory();
    } catch (err) {
      setMoodMsg({ type: "error", text: err.message });
    }
  }

  return (
    <>
      {/* Assessment */}
      <div className="card">
        <h2>🧠 Mental Health Assessment</h2>
        {QUESTIONS.map(([title, desc], i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <strong>
              Q{i + 1}. {title}
            </strong>
            <div className="muted">{desc}</div>
            <div className="row">
              <input
                type="range"
                min="0"
                max="10"
                value={answers[i]}
                onChange={(e) => setAnswer(i, Number(e.target.value))}
              />
              <span style={{ width: 24, textAlign: "right" }}>{answers[i]}</span>
            </div>
          </div>
        ))}

        <button onClick={runPredict} disabled={predicting}>
          {predicting ? "Predicting..." : "Predict"}
        </button>

        {prediction && prediction.error && (
          <div className="alert error">{prediction.error}</div>
        )}
        {prediction && !prediction.error && (
          <div style={{ marginTop: 16 }}>
            <div className="alert success">
              Risk Probability: {prediction.probability}
            </div>
            <div className="alert warning">{prediction.alert}</div>
            <h3>Recommendations</h3>
            <ul className="list-clean">
              {prediction.recommendations.map((r, i) => (
                <li key={i}>✔️ {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Mood Journal */}
      <div className="card">
        <h2>📝 Mood Journal</h2>
        <textarea
          placeholder="Write how you feel"
          value={moodText}
          onChange={(e) => setMoodText(e.target.value)}
        />
        {moodMsg && <div className={`alert ${moodMsg.type}`}>{moodMsg.text}</div>}
        <div style={{ marginTop: 12 }}>
          <button onClick={analyzeMood}>Analyze Mood</button>
        </div>
      </div>

      {/* Mood Trend */}
      <div className="card">
        <h2>📈 Mood Trend</h2>
        {history.length === 0 ? (
          <div className="muted">No mood entries yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8b949e" fontSize={11} />
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
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
