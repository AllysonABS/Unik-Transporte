#!/bin/bash
# Roda o web local conectado ao banco de PRODUÇÃO via túnel SSH.
# Uso: ./dev-local.sh

set -e
KEY=~/.ssh/uniktransporte_deploy
VPS=root@195.200.0.245

# Mata processos antigos nas portas e sobe o túnel se não estiver de pé
if ! nc -z 127.0.0.1 5433 2>/dev/null; then
  echo "🔒 Abrindo túnel SSH até o Postgres de produção..."
  ssh -i "$KEY" -f -N -L 5433:127.0.0.1:5433 "$VPS"
  sleep 1
fi

lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo "📡 Subindo API (porta 3001)..."
npm run server &
PID_SERVER=$!

sleep 2

echo "🌐 Subindo frontend (porta 5173)..."
npm run dev &
PID_LP=$!

trap "echo '🛑 Encerrando...'; kill $PID_SERVER $PID_LP 2>/dev/null; exit" SIGINT SIGTERM
wait
