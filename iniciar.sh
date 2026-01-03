#!/bin/bash

echo "📂 Criando pasta de uploads..."
mkdir -p uploads

echo "🧹 Limpando logs antigos..."
rm -f *.log

echo "🚀 Iniciando Microserviços..."

# Inicia o Logger em segundo plano
node logger.js > logger.log 2>&1 &
echo "✅ Logger iniciado (log em logger.log)"

# Inicia o Worker em segundo plano
node worker-sender.js > worker.log 2>&1 &
echo "✅ Worker iniciado (log em worker.log)"

# Inicia o Servidor em primeiro plano para você ver o status
echo "🌐 Abrindo Painel Web..."
node server.js

