import { useRef, useState, useEffect } from "react";
import { api } from "../api";

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

  async function capture() {
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
        const res = await api.detectEmotion(blob);
        setResult(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }, "image/jpeg");
  }

  return (
    <div className="card">
      <h2>😊 Emotion Detection</h2>

      <video ref={videoRef} playsInline style={{ width: "100%", maxWidth: 480 }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="row" style={{ marginTop: 12 }}>
        {!streaming ? (
          <button onClick={startCamera}>Start Camera</button>
        ) : (
          <>
            <button onClick={capture} disabled={busy}>
              {busy ? "Analyzing..." : "Capture & Analyze"}
            </button>
            <button className="secondary" onClick={stopCamera}>
              Stop Camera
            </button>
          </>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <div className="alert success">
            {result.emotion.toUpperCase()} ({result.confidence}%)
          </div>
          <div className="progress">
            <div style={{ width: `${Math.min(result.confidence, 100)}%` }} />
          </div>
          <h3>💡 Suggestion</h3>
          <div className="alert info">{result.suggestion}</div>
        </div>
      )}
    </div>
  );
}
