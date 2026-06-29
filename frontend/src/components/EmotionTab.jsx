import { useRef, useState, useEffect } from "react";
import { api } from "../api";
import { Spinner } from "./ui.jsx";

const EMOJI = {
  happy: "😄",
  sad: "😢",
  angry: "😠",
  fear: "😨",
  surprise: "😲",
  disgust: "🤢",
  neutral: "😐",
};

export default function EmotionTab() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      setError("Could not access camera: " + err.message);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  }

  useEffect(() => () => stopCamera(), []);

  function capture() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    setBusy(true);
    setError(null);
    setResult(null);
    canvas.toBlob(async (blob) => {
      try {
        setResult(await api.detectEmotion(blob));
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }, "image/jpeg");
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-head">
          <div className="ico">📷</div>
          <div>
            <h2>Live Camera</h2>
            <div className="sub">Position your face in the frame</div>
          </div>
        </div>

        <div className="camera-frame">
          <video ref={videoRef} playsInline />
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="row" style={{ marginTop: 14 }}>
          {!streaming ? (
            <button onClick={startCamera}>Start Camera</button>
          ) : (
            <>
              <button onClick={capture} disabled={busy}>
                {busy ? <Spinner /> : "Capture & Analyze"}
              </button>
              <button className="ghost" onClick={stopCamera}>
                Stop
              </button>
            </>
          )}
        </div>
        {error && <div className="alert error">{error}</div>}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="ico">✨</div>
          <div>
            <h2>Analysis</h2>
            <div className="sub">Detected emotion & guidance</div>
          </div>
        </div>

        {!result ? (
          <div className="empty">
            <span className="emoji">🙂</span>
            Capture a photo to detect your emotion.
          </div>
        ) : (
          <div>
            <div className="row" style={{ gap: 16 }}>
              <div style={{ fontSize: 56, lineHeight: 1 }}>
                {EMOJI[result.emotion] || "🙂"}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, textTransform: "capitalize" }}>
                  {result.emotion}
                </div>
                <div className="muted">{result.confidence}% confidence</div>
              </div>
            </div>
            <div className="progress" style={{ marginTop: 14 }}>
              <div style={{ width: `${Math.min(result.confidence, 100)}%` }} />
            </div>
            <div className="alert info" style={{ marginTop: 16 }}>
              💡 {result.suggestion}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
