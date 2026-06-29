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

echo ""
echo "✅ App started."
echo "   Backend : http://localhost:8000  (docs at /docs)"
echo "   Frontend: http://localhost:5173"
echo "   Logs    : .run/backend.log  .run/frontend.log"
echo "   Stop    : ./stop.sh"
