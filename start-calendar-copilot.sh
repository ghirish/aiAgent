#!/bin/bash

echo "🚀 Starting Calendar Copilot Frontend..."
echo "========================================"

# Check if we're in the right directory
if [ ! -d "calendar-api" ] || [ ! -d "calendar-copilot-frontend" ]; then
    echo "❌ Error: Please run this script from the aiAgent directory"
    echo "   You should see both 'calendar-api' and 'calendar-copilot-frontend' folders"
    exit 1
fi

# Start API server in background
echo "📡 Starting API server on http://localhost:3001..."
cd calendar-api
npm start > api.log 2>&1 &
API_PID=$!
cd ..

# Wait for API to start
echo "⏳ Waiting for API server to start..."
sleep 3

# Check if API is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API server is running!"
else
    echo "❌ API server failed to start. Check calendar-api/api.log for errors."
    exit 1
fi

# Start React frontend
echo "🎨 Starting React frontend on http://localhost:3000..."
cd calendar-copilot-frontend
npm start &
REACT_PID=$!
cd ..

echo ""
echo "🎉 Calendar Copilot is starting up!"
echo "========================================"
echo "📡 API Server: http://localhost:3001"
echo "🎨 React Frontend: http://localhost:3000"
echo "📋 API Health: http://localhost:3001/api/health"
echo ""
echo "📝 Try these natural language requests:"
echo "   • Schedule a team meeting tomorrow at 3pm"
echo "   • Create a lunch meeting next Tuesday at 12:30pm"
echo "   • Book a quick standup today at 10am for 30 minutes"
echo ""
echo "🎭 Currently running in DEMO MODE (mock events)"
echo "   See README-Frontend.md for enabling real Google Calendar"
echo ""
echo "⏹️  To stop: Ctrl+C or run 'pkill -f node'"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Calendar Copilot..."
    kill $API_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    pkill -f "node.*react-scripts" 2>/dev/null
    pkill -f "node.*index.js" 2>/dev/null
    echo "✅ Shutdown complete!"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT

# Keep script running
echo "🔄 Calendar Copilot is running... Press Ctrl+C to stop"
wait 