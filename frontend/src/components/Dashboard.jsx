import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { api } from "../api";
import { Spinner } from "./ui.jsx";

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

const chartTooltip = {
  contentStyle: {
    background: "#141a29",
    border: "1px solid #232b3d",
    borderRadius: 10,
    color: "#eef2f9",
  },
};

export default function Dashboard() {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(0));
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const [moodText, setMoodText] = useState("");
  const [moodMsg, setMoodMsg] = useState(null);
  const [savingMood, setSavingMood] = useState(false);
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState([]);

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
    api
      .modelMetrics()
      .then((m) =>
        setMetrics(
          Object.entries(m).map(([model, accuracy]) => ({ model, accuracy }))
        )
      )
      .catch(() => {});
  }, []);

  const setAnswer = (i, val) =>
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? val : a)));

  async function runPredict() {
    setPredicting(true);
    setPrediction(null);
    try {
      setPrediction(await api.predict(answers));
    } catch (err) {
      setPrediction({ error: err.message });
    } finally {
      setPredicting(false);
    }
  }

  async function analyzeMood() {
    if (!moodText.trim()) return;
    setMoodMsg(null);
    setSavingMood(true);
    try {
      const res = await api.addMood(moodText);
      const sentiment =
        res.score > 0.2 ? "positive" : res.score < -0.2 ? "negative" : "neutral";
      setMoodMsg({
        type: res.score < -0.2 ? "warning" : "success",
        text: `Mood score: ${res.score} — sentiment reads as ${sentiment}.`,
      });
      setMoodText("");
      loadHistory();
    } catch (err) {
      setMoodMsg({ type: "error", text: err.message });
    } finally {
      setSavingMood(false);
    }
  }

  // Stats
  const avgMood =
    history.length > 0
      ? (history.reduce((a, b) => a + b.score, 0) / history.length).toFixed(2)
      : "—";
  const lastMood = history.length > 0 ? history[history.length - 1].score.toFixed(2) : "—";

  return (
    <>
      {/* Stat row */}
      <div className="stats">
        <div className="stat">
          <div className="label">Journal Entries</div>
          <div className="value grad">{history.length}</div>
        </div>
        <div className="stat">
          <div className="label">Average Mood</div>
          <div className="value">{avgMood}</div>
        </div>
        <div className="stat">
          <div className="label">Latest Mood</div>
          <div className="value">{lastMood}</div>
        </div>
      </div>

      {/* Assessment */}
      <div className="card">
        <div className="card-head">
          <div className="ico">🧠</div>
          <div>
            <h2>Mental Health Assessment</h2>
            <div className="sub">Rate each area from 0 (low) to 10 (high)</div>
          </div>
        </div>

        {QUESTIONS.map(([title, desc], i) => (
          <div key={i} className="field">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>
                {title}
              </strong>
              <span className="badge moderate" style={{ minWidth: 34 }}>
                {answers[i]}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              {desc}
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={answers[i]}
              onChange={(e) => setAnswer(i, Number(e.target.value))}
            />
          </div>
        ))}

        <button onClick={runPredict} disabled={predicting} style={{ marginTop: 8 }}>
          {predicting ? <Spinner /> : "Analyze Risk"}
        </button>

        {prediction?.error && <div className="alert error">{prediction.error}</div>}
        {prediction && !prediction.error && (
          <div style={{ marginTop: 18 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Estimated risk probability
                </div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {Math.round(prediction.probability * 100)}%
                </div>
              </div>
              <span className={`badge dot ${prediction.severity}`}>
                {prediction.severity} risk
              </span>
            </div>
            <div className="progress">
              <div style={{ width: `${prediction.probability * 100}%` }} />
            </div>
            {prediction.severity === "high" && (
              <div className="alert warning">{prediction.alert}</div>
            )}

            {/* Multimodal fusion indicator */}
            {prediction.fusion?.used ? (
              <div className="alert info">
                🧬 <strong>Multimodal:</strong> fused your latest facial scan (
                {prediction.fusion.emotion}, {prediction.fusion.confidence}%) with
                the questionnaire.
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                🧬 Tip: run an <strong>Emotion Scan</strong> first — it gets fused
                into this prediction (multimodal).
              </div>
            )}

            {/* Explainable AI: per-factor attribution */}
            {prediction.explanation?.length > 0 && (
              <>
                <h4 style={{ marginTop: 20, marginBottom: 2 }}>
                  Why this result?{" "}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                    (Explainable AI)
                  </span>
                </h4>
                <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  How each factor pushed your risk score.
                </div>
                {prediction.explanation.map((f) => {
                  const up = f.direction === "increases";
                  return (
                    <div key={f.feature} style={{ marginBottom: 10 }}>
                      <div
                        className="row"
                        style={{ justifyContent: "space-between", fontSize: 13.5 }}
                      >
                        <span>
                          {up ? "🔴" : "🟢"} {f.feature}{" "}
                          <span className="muted">({f.value})</span>
                        </span>
                        <span style={{ color: up ? "var(--red)" : "var(--green)" }}>
                          {up ? "↑" : "↓"} {f.weight}%
                        </span>
                      </div>
                      <div className="xai-track">
                        <div
                          className="xai-fill"
                          style={{
                            width: `${f.weight}%`,
                            background: up ? "var(--red)" : "var(--green)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            <h4 style={{ marginTop: 18, marginBottom: 4 }}>Recommended for you</h4>
            <ul className="rec-list">
              {prediction.recommendations.map((r, i) => (
                <li key={i}>
                  <span className="check">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Mood Journal */}
        <div className="card">
          <div className="card-head">
            <div className="ico">📝</div>
            <div>
              <h2>Mood Journal</h2>
              <div className="sub">Write freely — we'll gauge the sentiment</div>
            </div>
          </div>
          <textarea
            placeholder="How are you feeling today?"
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
          />
          {moodMsg && <div className={`alert ${moodMsg.type}`}>{moodMsg.text}</div>}
          <button onClick={analyzeMood} disabled={savingMood} style={{ marginTop: 12 }}>
            {savingMood ? <Spinner /> : "Save & Analyze"}
          </button>
        </div>

        {/* Mood Trend */}
        <div className="card">
          <div className="card-head">
            <div className="ico">📈</div>
            <div>
              <h2>Mood Trend</h2>
              <div className="sub">Your sentiment over time</div>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="empty">
              <span className="emoji">🌱</span>
              No entries yet — save a journal entry to see your trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={history} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#232b3d" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#6b7689" fontSize={10} tickMargin={6} />
                <YAxis domain={[-1, 1]} stroke="#6b7689" fontSize={10} />
                <Tooltip {...chartTooltip} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#moodFill)"
                  dot={{ r: 3, fill: "#8b5cf6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model performance comparison */}
      {metrics.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="ico">🧪</div>
            <div>
              <h2>Model Performance</h2>
              <div className="sub">
                Test accuracy of the compared classifiers · Random Forest powers
                your prediction
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics} margin={{ left: -14, right: 6, top: 6 }}>
              <CartesianGrid stroke="#232b3d" strokeDasharray="3 3" />
              <XAxis dataKey="model" stroke="#6b7689" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#6b7689" fontSize={10} unit="%" />
              <Tooltip {...chartTooltip} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
              <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                {metrics.map((m) => (
                  <Cell
                    key={m.model}
                    fill={m.model === "Random Forest" ? "#6366f1" : "#2f3850"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
