#!/bin/bash

# NINA Web Control Panel - Development Startup Script
# This script starts both the backend API server and frontend React app

echo "🌟 Starting NINA Web Control Panel..."
echo "=================================="

# Kill any existing processes on these ports
echo "🔧 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Function to handle cleanup on script exit
cleanup() {
    echo -e "\n🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handling for clean shutdown
trap cleanup SIGINT SIGTERM

# Start backend API server
echo "🚀 Starting backend API server (port 3001)..."
node config-server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend API server started successfully"
else
    echo "❌ Failed to start backend API server"
    exit 1
fi

# Start frontend React app
echo "🚀 Starting frontend React app (port 3000)..."
npm start &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

echo ""
echo "🎉 NINA Web Control Panel is starting up!"
echo "=================================="
echo "📊 Backend API:  http://localhost:3001"
echo "🌐 Frontend App: http://localhost:3000"
echo "🎥 Live Feeds:   Configured and ready"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
