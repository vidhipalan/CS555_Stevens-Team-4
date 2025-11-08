# Rocket.Chat Integration Guide

This guide explains how to set up and use Rocket.Chat secure messaging in the application.

## Overview

Rocket.Chat is integrated into the app to provide secure, real-time messaging between patients and clinicians. The integration uses:

- **Backend SSO**: Single Sign-On (SSO) integration with your existing authentication
- **Secure Storage**: All tokens stored securely using Expo SecureStore
- **REST API**: Direct communication with Rocket.Chat REST API
- **Real-time Messaging**: Message polling for real-time updates

## Prerequisites

1. **Rocket.Chat Server**: You need a running Rocket.Chat instance. You can:
   - Deploy your own Rocket.Chat server (Docker, Kubernetes, or cloud)
   - Use Rocket.Chat Cloud (https://cloud.rocket.chat)
   - Run locally for development: `docker run -d --name rocketchat -p 3000:3000 rocketchat/rocket.chat`

2. **Admin Credentials**: You need admin credentials for Rocket.Chat to create users and manage authentication.

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

The `axios` package is already added to `package.json`.

### 2. Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Rocket.Chat Configuration
ROCKETCHAT_URL=http://localhost:3000
ROCKETCHAT_ADMIN_USER=admin
ROCKETCHAT_ADMIN_PASSWORD=your_admin_password
ROCKETCHAT_SECRET=your_secret_key
```

**Important Security Notes**:
- Use HTTPS in production
- Never commit `.env` files to version control
- Use strong, unique passwords for admin user
- Consider using environment-specific configuration

### 3. Update User Model

The User model has been updated to include `rocketChatUserId` field. Existing users will automatically get Rocket.Chat accounts created when they first access the chat feature.

### 4. Start Backend Server

```bash
npm run dev
```

The backend will now expose the following endpoints:
- `GET /api/rocketchat/login` - Get Rocket.Chat SSO token
- `GET /api/rocketchat/channels` - Get user's chat rooms (also returns fresh token)

## Frontend Setup

### 1. Dependencies

No additional dependencies needed! The implementation uses:
- `expo-secure-store` - Already installed
- Native `fetch` API - Built-in
- React Native components - Already installed

### 2. Configuration

The Rocket.Chat endpoints are automatically configured in `constants/config.ts` based on your `API_URL`.

### 3. Usage

The chat feature is integrated into the app navigation. Users can:

1. **Access Chat List**: Tap the "Chat" tab in the bottom navigation
2. **View Rooms**: See all their direct messages, channels, and private groups
3. **Open Chat**: Tap on a room to open the chat interface
4. **Send Messages**: Type and send messages in real-time

## Architecture

### Authentication Flow

1. User logs into the app (existing JWT authentication)
2. When accessing chat, app requests Rocket.Chat token from backend
3. Backend authenticates with Rocket.Chat as admin
4. Backend creates/finds user in Rocket.Chat
5. Backend generates SSO token for the user
6. Frontend stores token securely in SecureStore
7. Frontend uses token to authenticate Rocket.Chat API requests

### Security Features

1. **Token Storage**: All Rocket.Chat tokens stored in Expo SecureStore (encrypted)
2. **JWT Integration**: Rocket.Chat access requires valid JWT token
3. **User Isolation**: Each user only sees their own rooms and messages
4. **Secure Communication**: All API calls use HTTPS in production
5. **Token Refresh**: Tokens are refreshed as needed

### Message Flow

1. **Send Message**: 
   - User types message
   - App sends to Rocket.Chat API via REST
   - Message appears in chat

2. **Receive Messages**:
   - App polls Rocket.Chat API every 2 seconds
   - New messages are fetched and displayed
   - Real-time updates without WebSocket (simpler implementation)

## Rocket.Chat Server Setup

### 1. Initial Setup

After starting Rocket.Chat, complete the initial setup wizard to create an admin account.

### 2. Enable REST API

REST API is enabled by default in Rocket.Chat. No additional configuration needed.

### 3. Security Configuration

For production, configure:

- **HTTPS**: Enable SSL/TLS certificates
- **CORS**: Configure CORS if serving from different domains
- **Rate Limiting**: Configure rate limits for API endpoints
- **Firewall**: Restrict access to Rocket.Chat server

### 4. User Roles

The integration creates users with the `user` role. You can customize roles in `backend/src/controllers/rocketchatController.js`:

```javascript
roles: [role === 'clinician' ? 'admin' : 'user'], // Customize as needed
```

## API Reference

### Backend Endpoints

#### GET /api/rocketchat/login
Get Rocket.Chat SSO token for the authenticated user.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "authToken": "rocketchat_auth_token",
  "userId": "rocketchat_user_id",
  "serverUrl": "http://localhost:3000",
  "username": "user_email"
}
```

#### GET /api/rocketchat/channels
Get user's chat token (same as login endpoint, returns fresh token).

### Frontend Utilities

Located in `app/utils/rocketchat.ts`:

- `getRocketChatToken()` - Get new Rocket.Chat token
- `getStoredRocketChatToken()` - Get stored token
- `rocketChatAPI()` - Make authenticated API request
- `getRooms()` - Get user's rooms
- `getRoomMessages()` - Get messages from a room
- `sendMessage()` - Send a message
- `createDirectMessage()` - Create DM with user
- `clearRocketChatCredentials()` - Clear stored credentials

## Troubleshooting

### Common Issues

1. **"Failed to authenticate with Rocket.Chat"**
   - Check `ROCKETCHAT_URL` is correct
   - Verify admin credentials in `.env`
   - Ensure Rocket.Chat server is running

2. **"Rocket.Chat user not found"**
   - User account will be created automatically on first chat access
   - Check backend logs for creation errors

3. **Messages not appearing**
   - Check network connectivity
   - Verify Rocket.Chat token is valid
   - Check Rocket.Chat server logs

4. **CORS errors**
   - Configure CORS in Rocket.Chat admin panel
   - Add your app's domain to allowed origins

### Debugging

Enable debug logging:

**Backend**: Check console logs in `backend/src/controllers/rocketchatController.js`

**Frontend**: Check React Native debugger for API call errors

## Production Considerations

1. **HTTPS**: Use HTTPS for both your backend and Rocket.Chat server
2. **Token Expiration**: Implement token refresh logic
3. **WebSocket**: Consider upgrading to WebSocket for better real-time performance
4. **Push Notifications**: Integrate push notifications for new messages
5. **Message Encryption**: Enable end-to-end encryption in Rocket.Chat
6. **Backup**: Regularly backup Rocket.Chat database
7. **Monitoring**: Set up monitoring for Rocket.Chat server
8. **Scaling**: Consider Rocket.Chat clustering for high availability

## Advanced Features

### WebSocket Integration

For better real-time performance, you can upgrade to WebSocket:

1. Install Rocket.Chat JavaScript SDK
2. Replace polling with WebSocket connection
3. Subscribe to room events

### Push Notifications

Integrate push notifications for new messages:

1. Configure Rocket.Chat push gateway
2. Register device tokens
3. Handle push notifications in app

### End-to-End Encryption

Enable E2EE in Rocket.Chat:

1. Go to Rocket.Chat Admin Panel
2. Enable End-to-End Encryption
3. Users must enable E2EE in their settings
4. Update app to handle encrypted messages

## Support

For issues or questions:
- Rocket.Chat Documentation: https://docs.rocket.chat
- Rocket.Chat API Docs: https://developer.rocket.chat/api/rest-api
- Rocket.Chat Community: https://open.rocket.chat

