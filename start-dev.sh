#!/bin/bash

echo "🚀 Iniciando ambiente de desenvolvimento Unik Logística..."

# Mata processos antigos nas portas
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null

ROOT_DIR=$(pwd)

# Inicia o servidor (API)
echo "📡 Iniciando servidor na porta 3001..."
(cd "$ROOT_DIR/web" && npm run server) &
PID_SERVER=$!

sleep 2

# Inicia a Landing Page (Vite)
echo "🌐 Iniciando Landing Page..."
(cd "$ROOT_DIR/web" && npm run dev) &
PID_LP=$!

sleep 2

# Inicia o app iOS
echo "📱 Iniciando emulador iOS..."
(cd "$ROOT_DIR" && npx react-native run-ios --simulator="iPhone 17 Pro Max") &
PID_IOS=$!

# Captura Ctrl+C para matar todos os processos
trap "echo '🛑 Encerrando tudo...'; kill $PID_SERVER $PID_LP $PID_IOS 2>/dev/null; exit" SIGINT SIGTERM

# Mantém o script rodando
wait
