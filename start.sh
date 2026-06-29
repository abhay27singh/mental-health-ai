#!/usr/bin/env bash
#
# Start the Mental Health AI app (FastAPI backend + React frontend).
# Both run in the background; logs and PIDs are written to .run/.
# Stop everything with ./stop.sh
#
set -e
cd "$(dirname "$0")"
mkdir -p .run

# --- Backend (FastAPI) ---
if [ -x venv/bin/python ]; then
  PY="venv/bin/python"
elif [ -x .venv/bin/python ]; then
  PY=".venv/bin/python"
else
  PY="python3"
fi

echo "Starting backend (uvicorn) on http://localhost:8000 ..."
"$PY" -m uvicorn api:app --reload --port 8000 > .run/backend.log 2>&1 &
echo $! > .run/backend.pid

# --- Frontend (Vite/React) ---
echo "Starting frontend (vite) on http://localhost:5173 ..."
(
  cd frontend
  [ -d node_modules ] || npm install
  npm run dev
) > .run/frontend.log 2>&1 &
echo $! > .run/frontend.pid

URL="http://localhost:5173"

# --- Wait for the frontend to be ready, then open it in Chrome ---
echo "Waiting for the app to be ready ..."
for i in $(seq 1 30); do
  curl -sf "$URL" >/dev/null 2>&1 && break
  sleep 1
done

if open -a "Google Chrome" "$URL" 2>/dev/null; then
  echo "Opened $URL in Google Chrome."
else
  open "$URL" 2>/dev/null || true   # fall back to default browser
  echo "Chrome not found — opened $URL in your default browser."
fi

echo ""
echo "✅ App started."
echo "   Backend : http://localhost:8000  (docs at /docs)"
echo "   Frontend: $URL"
echo "   Logs    : .run/backend.log  .run/frontend.log"
echo "   Stop    : ./stop.sh"
