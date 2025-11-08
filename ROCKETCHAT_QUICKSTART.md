# Rocket.Chat Quick Start Guide

## Quick Setup (5 minutes)

### 1. Start Rocket.Chat Server

**Option A: Docker (Recommended for Development)**
```bash
docker run -d --name rocketchat -p 3000:3000 \
  -e ROOT_URL=http://localhost:3000 \
  -e MONGO_URL=mongodb://mongo:27017/rocketchat \
  -e MONGO_OPLOG_URL=mongodb://mongo:27017/local \
  --link mongo:mongo \
  rocketchat/rocket.chat

# Or use docker-compose (see Rocket.Chat docs)
```

**Option B: Use Rocket.Chat Cloud**
- Sign up at https://cloud.rocket.chat
- Get your server URL and admin credentials

### 2. Configure Backend

Add to `backend/.env`:
```env
ROCKETCHAT_URL=http://localhost:3000
ROCKETCHAT_ADMIN_USER=admin
ROCKETCHAT_ADMIN_PASSWORD=your_password_here
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
npm run dev
```

### 4. Start Frontend

```bash
npm start
```

### 5. Test Chat

1. Login to the app
2. Tap the "Chat" tab in the bottom navigation
3. You should see your chat rooms (empty initially)
4. Messages will sync automatically

## Creating Test Users

### Via Rocket.Chat Admin Panel

1. Go to `http://localhost:3000`
2. Login as admin
3. Go to Administration > Users
4. Create test users
5. Users will be automatically linked when they login to your app

### Via Your App

1. Sign up new users in your app
2. When they first access chat, Rocket.Chat accounts are created automatically
3. They can immediately start chatting

## Testing Direct Messages

1. Login as User A in your app
2. Login as User B in Rocket.Chat web interface
3. Send a message from User B to User A
4. Refresh chat list in your app
5. You should see the message

## Troubleshooting

**"Failed to authenticate with Rocket.Chat"**
- Check Rocket.Chat server is running: `docker ps`
- Verify admin credentials in `.env`
- Check backend logs for errors

**"No chats showing"**
- This is normal for new users
- Create a room in Rocket.Chat admin panel
- Or wait for someone to message you

**Messages not updating**
- Check network connection
- Verify Rocket.Chat token is valid (check SecureStore)
- Check backend is running

## Next Steps

- Read `ROCKETCHAT_SETUP.md` for detailed documentation
- Configure HTTPS for production
- Set up push notifications
- Enable end-to-end encryption
- Customize user roles and permissions

