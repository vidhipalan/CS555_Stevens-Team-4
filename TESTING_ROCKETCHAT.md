# Testing Rocket.Chat and Secure Chat Functionality

This guide explains how to test the Rocket.Chat integration both in the IDE (backend API) and in the mobile app (frontend).

## Prerequisites

1. **Rocket.Chat Server Running**
   - See `ROCKETCHAT_SETUP.md` for setup instructions
   - Default: `http://localhost:3000`

2. **Backend Environment Variables**
   - Ensure `backend/.env` has:
     ```env
     ROCKETCHAT_URL=http://localhost:3000
     ROCKETCHAT_ADMIN_USER=admin
     ROCKETCHAT_ADMIN_PASSWORD=your_admin_password
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     ```

3. **Backend Server Running**
   ```bash
   cd backend
   npm run dev
   ```

---

## 1. Backend API Testing (In IDE)

### Run Automated Tests

```bash
cd backend
npm test -- rocketchat-api.test.js
```

This will test:
- ✅ Token generation endpoint (`/api/rocketchat/login`)
- ✅ User listing endpoint (`/api/rocketchat/users`)
- ✅ Authentication requirements
- ✅ Error handling

### Manual API Testing with curl/Postman

#### Test 1: Get Chat Token

```bash
# First, login to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"yourpassword"}'

# Use the returned token to get Rocket.Chat token
curl -X GET http://localhost:5000/api/rocketchat/login \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "authToken": "rocketchat-sso-token",
  "userId": "rocketchat-user-id",
  "serverUrl": "http://localhost:3000",
  "username": "testuser"
}
```

#### Test 2: Get Available Chat Users

```bash
curl -X GET http://localhost:5000/api/rocketchat/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (for patient):**
```json
{
  "users": [
    {
      "_id": "clinician-id",
      "username": "clinician",
      "name": "Dr. Smith",
      "email": "clinician@example.com"
    }
  ]
}
```

---

## 2. Frontend Testing (Mobile App)

### Setup

1. **Start Frontend:**
   ```bash
   npm start
   ```

2. **Configure API URL:**
   - Update `constants/config.ts` if needed
   - Or set `EXPO_PUBLIC_API_URL` environment variable

### Test Scenarios

#### Test 1: Login and Access Chat

1. **Login as Patient:**
   - Open app
   - Navigate to Login screen
   - Enter patient credentials
   - Login successfully

2. **Access Chat Tab:**
   - Tap "Chat" tab in bottom navigation
   - Should see "Chats" screen
   - If no chats, should see "No chats yet" message

3. **Start New Chat:**
   - Tap "New Chat" button
   - Should see list of available clinicians
   - Tap a clinician to start chat

#### Test 2: Send and Receive Messages

1. **Send Message:**
   - Open a chat room
   - Type a message in input field
   - Tap "Send"
   - Message should appear in chat

2. **Receive Messages:**
   - Messages should auto-refresh every 2 seconds
   - New messages from other user should appear

#### Test 3: Chat List Functionality

1. **View Chat List:**
   - Navigate to Chat tab
   - Should see all active chats
   - Each chat shows last message preview

2. **Refresh Chat List:**
   - Pull down to refresh
   - Should reload chats and users

#### Test 4: Clinician Perspective

1. **Login as Clinician:**
   - Login with clinician credentials
   - Navigate to Chat tab

2. **View Patients:**
   - Tap "New Chat"
   - Should see list of all patients
   - Can start chat with any patient

---

## 3. Integration Testing Checklist

### Backend Integration

- [ ] Rocket.Chat server is accessible
- [ ] Admin credentials work
- [ ] User creation in Rocket.Chat works
- [ ] SSO token generation works
- [ ] User lookup works (existing users)

### Frontend Integration

- [ ] Authentication flow works
- [ ] Token storage in SecureStore works
- [ ] Chat list loads correctly
- [ ] Room creation works
- [ ] Message sending works
- [ ] Message receiving works (polling)
- [ ] Error handling displays properly

### Security Testing

- [ ] JWT authentication required for all endpoints
- [ ] Tokens stored securely (SecureStore)
- [ ] Users only see their own messages
- [ ] Role-based user filtering works

---

## 4. Debugging Tips

### Backend Issues

**Problem: "Failed to authenticate with Rocket.Chat"**
- Check Rocket.Chat server is running: `curl http://localhost:3000/api/info`
- Verify admin credentials in `.env`
- Check backend logs for detailed error

**Problem: "User not found"**
- Verify user exists in MongoDB
- Check user email matches

**Problem: "CORS errors"**
- Check CORS configuration in `backend/src/server.js`
- Verify Rocket.Chat CORS settings

### Frontend Issues

**Problem: "Not authenticated"**
- Check JWT token is stored: `SecureStore.getItemAsync('auth_token')`
- Verify token hasn't expired
- Check API_URL in `constants/config.ts`

**Problem: "No chats showing"**
- This is normal for new users
- Try creating a new chat
- Check browser/app console for errors

**Problem: "Messages not updating"**
- Check network connection
- Verify Rocket.Chat server is accessible
- Check polling interval (2 seconds)

---

## 5. Testing with Multiple Users

### Setup Test Users

1. **Create Patient:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"patient1@test.com","password":"test123","role":"patient","name":"Patient One"}'
   ```

2. **Create Clinician:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"clinician1@test.com","password":"test123","role":"clinician","name":"Dr. Test"}'
   ```

3. **Test Chat Between Users:**
   - Login as patient in one device/simulator
   - Login as clinician in another device/simulator
   - Start chat from patient side
   - Send messages both ways
   - Verify real-time updates

---

## 6. Performance Testing

### Test Message Polling

- Send multiple messages quickly
- Verify all messages appear
- Check for duplicate messages
- Monitor network requests (should be every 2 seconds)

### Test Large Chat Lists

- Create multiple chat rooms
- Verify list scrolls smoothly
- Check refresh performance

---

## 7. Error Scenarios

Test these error cases:

1. **Rocket.Chat Server Down:**
   - Stop Rocket.Chat server
   - Try to access chat
   - Should show appropriate error

2. **Network Issues:**
   - Disable network
   - Try to send message
   - Should show error alert

3. **Invalid Token:**
   - Clear SecureStore
   - Try to access chat
   - Should request new token

4. **Expired Token:**
   - Wait for token expiration
   - Try to send message
   - Should refresh token automatically

---

## Quick Test Commands

```bash
# Run all backend tests
cd backend && npm test

# Run only Rocket.Chat tests
cd backend && npm test -- rocketchat-api.test.js

# Start backend in dev mode
cd backend && npm run dev

# Start frontend
npm start

# Check Rocket.Chat server
curl http://localhost:3000/api/info
```

---

## Next Steps

- Set up automated integration tests
- Add end-to-end testing with Detox or similar
- Implement push notifications testing
- Test file sharing functionality
- Test group chat features (if implemented)

