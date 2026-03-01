#!/bin/bash
# ============================================
# Startup script for Django + Ollama
# ============================================

set -e

echo "🚀 Starting AI-enabled backend..."

# Create log directory
mkdir -p /var/log/supervisor

# Start Ollama in background first
echo "📦 Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to initialize..."
sleep 5

# Check if Ollama is running
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is ready!"
        break
    fi
    echo "   Waiting for Ollama... ($i/30)"
    sleep 2
done

# Pull the phi-3-mini model if not already present
echo "🤖 Checking for phi3:mini model..."
if ! ollama list | grep -q "phi3:mini"; then
    echo "📥 Pulling phi3:mini model (this may take a few minutes on first run)..."
    ollama pull phi3:mini
    echo "✅ Model downloaded!"
else
    echo "✅ Model already present"
fi

# Start Celery worker + beat in background
echo "📅 Starting Celery worker + beat scheduler..."
celery -A school_management worker --beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler &
CELERY_PID=$!
echo "✅ Celery started (PID: $CELERY_PID)"

# Start Django with gunicorn
echo "🌐 Starting Django server on port $PORT..."
exec gunicorn school_management.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
