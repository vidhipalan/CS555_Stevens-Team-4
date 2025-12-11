#!/bin/bash

# Test script to verify backend is accessible from network IP

IP="${1:-192.168.217.29}"
PORT=5050

echo "🧪 Testing backend connection..."
echo "   IP: $IP"
echo "   Port: $PORT"
echo ""

# Test 1: Check if port is listening
echo "1️⃣  Checking if backend is listening on port $PORT..."
if lsof -i :$PORT | grep LISTEN > /dev/null; then
  echo "   ✅ Backend is running on port $PORT"
else
  echo "   ❌ Backend is NOT running on port $PORT"
  echo "   Start it with: cd backend && npm run dev"
  exit 1
fi

# Test 2: Test localhost connection
echo ""
echo "2️⃣  Testing localhost connection..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$PORT/health | grep -q "200\|404"; then
  echo "   ✅ Backend responds on localhost"
else
  echo "   ❌ Backend does NOT respond on localhost"
  exit 1
fi

# Test 3: Test network IP connection
echo ""
echo "3️⃣  Testing network IP connection ($IP:$PORT)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://$IP:$PORT/health 2>&1)
if echo "$HTTP_CODE" | grep -q "200\|404"; then
  echo "   ✅ Backend is accessible from network IP!"
  echo "   ✅ Your phone should be able to connect"
else
  echo "   ❌ Backend is NOT accessible from network IP"
  echo "   HTTP Code: $HTTP_CODE"
  echo ""
  echo "   Possible issues:"
  echo "   1. Firewall blocking connection (check System Settings > Network > Firewall)"
  echo "   2. Wrong IP address (current: $IP)"
  echo "   3. Backend not listening on 0.0.0.0 (should be in backend/src/server.js)"
  echo ""
  echo "   To find your correct IP:"
  echo "   ifconfig | grep 'inet ' | grep -v 127.0.0.1"
  exit 1
fi

echo ""
echo "✅ All tests passed! Backend should be accessible from your phone."
echo ""
echo "📱 Next steps:"
echo "   1. Make sure your phone and computer are on the same Wi-Fi"
echo "   2. Start Expo with: EXPO_PUBLIC_API_URL=\"http://$IP:$PORT\" npx expo start -c"
echo "   3. Check the Expo console for: '🔗 API_URL: http://$IP:$PORT'"

