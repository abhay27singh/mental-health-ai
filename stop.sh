#!/usr/bin/env bash
#
# Stop the Mental Health AI app started by ./start.sh
#
cd "$(dirname "$0")"

for svc in backend frontend; do
  pidfile=".run/$svc.pid"
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile")"
    if kill "$pid" 2>/dev/null; then
      echo "Stopped $svc (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
done

# Fallback: make sure no stray processes are left holding the ports.
pkill -f "uvicorn api:app" 2>/dev/null && echo "Cleaned up stray uvicorn"
pkill -f "vite" 2>/dev/null && echo "Cleaned up stray vite"

echo "✅ App stopped."
