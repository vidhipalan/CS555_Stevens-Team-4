# Rocket.Chat Secure Messaging Setup

## Overview

Rocket.Chat is integrated into the app to provide secure, real-time messaging between patients and clinicians. The integration uses Single Sign-On (SSO) with your existing authentication system.

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install `axios` which is required for Rocket.Chat API communication.

### 2. Set Up Rocket.Chat Server

You need a running Rocket.Chat instance. Options:

**Option A: Docker (Recommended for Development)**
```bash
docker run -d --name rocketchat -p 3000:3000 \
  -e ROOT_URL=http://localhost:3000 \
  -e MONGO_URL=mongodb://mongo:27017/rocketchat \
  --link mongo:mongo \
  rocketchat/rocket.chat
```

**Option B: Rocket.Chat Cloud**
- Sign up at https://cloud.rocket.chat
- Get your server URL and admin credentials

### 3. Configure Backend Environment

Add to `backend/.env`:

```env
# Rocket.Chat Configuration
ROCKETCHAT_URL=http://localhost:3000
ROCKETCHAT_ADMIN_USER=admin
ROCKETCHAT_ADMIN_PASSWORD=your_admin_password
```

**Important**: Use HTTPS in production!

### 4. Start Backend Server

```bash
cd backend
npm run dev
```

### 5. Start Frontend

```bash
npm start
```

## Features

### For Patients
- View and start chats with clinicians
- Send and receive messages in real-time
- See message history

### For Clinicians
- View and start chats with all patients
- Send and receive messages in real-time
- See message history

## How It Works

1. **Authentication**: When a user logs into your app, they can access chat
2. **User Creation**: On first chat access, a Rocket.Chat user is automatically created
3. **SSO Token**: Your backend generates a secure token for Rocket.Chat access
4. **Secure Storage**: Tokens are stored in Expo SecureStore (encrypted)
5. **Real-time Messaging**: Messages are polled every 2 seconds for updates

## Security Features

- ✅ JWT-based authentication required
- ✅ Tokens stored in encrypted SecureStore
- ✅ User isolation (users only see their own messages)
- ✅ Automatic token refresh
- ✅ HTTPS-ready for production

## API Endpoints

### Backend

- `GET /api/rocketchat/login` - Get Rocket.Chat SSO token (requires JWT)
- `GET /api/rocketchat/users` - Get available chat users (clinicians see patients, patients see clinicians)

### Frontend Utilities

Located in `app/utils/rocketchat.ts`:
- `getRocketChatToken()` - Get new token
- `getRooms()` - Get user's chat rooms
- `getRoomMessages()` - Get messages from a room
- `sendMessage()` - Send a message
- `createDirectMessage()` - Start a new chat
- `getChatUsers()` - Get available users to chat with

## Troubleshooting

### "Failed to authenticate with Rocket.Chat"
- Check Rocket.Chat server is running
- Verify admin credentials in `.env`
- Check backend logs for errors

### "No chats showing"
- This is normal for new users
- Tap "New Chat" to start a conversation
- Ensure users exist in your app database

### Messages not updating
- Check network connection
- Verify Rocket.Chat server is accessible
- Check backend is running

### CORS errors
- Configure CORS in Rocket.Chat admin panel
- Add your backend URL to allowed origins

## Production Considerations

1. **HTTPS**: Use HTTPS for both backend and Rocket.Chat
2. **Environment Variables**: Use secure environment variable management
3. **Token Expiration**: Implement token refresh logic
4. **Monitoring**: Set up monitoring for Rocket.Chat server
5. **Backup**: Regularly backup Rocket.Chat database
6. **End-to-End Encryption**: Consider enabling E2EE in Rocket.Chat

## Next Steps

- Configure HTTPS for production
- Set up push notifications
- Enable end-to-end encryption
- Customize user roles and permissions
- Add message search functionality
- Implement file sharing

## Support

For more information:
- Rocket.Chat Documentation: https://docs.rocket.chat
- Rocket.Chat API Docs: https://developer.rocket.chat/api/rest-api
