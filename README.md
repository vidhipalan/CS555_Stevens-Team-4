# 🧠 Mental Health Tracker App

A full-stack mobile application designed to support mental wellness through mood tracking, gratitude journaling, and secure clinician-patient communication. Built with React Native (Expo), Node.js, Express, MongoDB, and Rocket.Chat.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [Backend Setup](#backend-setup)
  - [Rocket.Chat Setup](#rocketchat-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Technology Stack](#technology-stack)

## ✨ Features

### Patient Features
- **Mood Tracking**: Log daily moods with notes and view mood history
- **Gratitude Journal**: Write and manage gratitude entries
- **Secure Messaging**: Direct messaging with assigned clinicians via Rocket.Chat
- **Meeting Requests**: Request video meetings with clinicians (Jitsi Meet integration)
- **Profile Management**: View and update profile information

### Clinician Features
- **Patient Dashboard**: View all assigned patients
- **Patient Management**: Assign/unassign patients
- **Patient Details**: View comprehensive patient data (mood history, gratitude entries)
- **Secure Messaging**: Communicate with patients with unread message counts
- **Meeting Management**: Approve/decline patient meeting requests

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB Atlas** account (or local MongoDB instance)
- **Docker** and **Docker Compose** (for Rocket.Chat)
- **Expo CLI** (will be installed during setup)
- **Expo Go** app on your mobile device (iOS/Android)

## 📁 Project Structure

```
.
├── app/                    # React Native app (Expo Router)
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app screens
│   └── _layout.tsx        # Root layout
├── backend/               # Express.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth middleware
│   │   └── server.js      # Server entry point
│   └── package.json
├── components/            # Reusable React components
├── constants/            # App constants and config
├── lib/                  # Utility functions and API clients
├── docker-compose.yml    # Rocket.Chat setup
└── package.json          # Frontend dependencies
```

## 🚀 Setup Instructions

### Backend Setup

1. **Navigate to the backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
   npm install
   ```

3. **Create a `.env` file in the `backend` directory:**
   ```env
   # MongoDB Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# Server Configuration
   PORT=5050
NODE_ENV=development

# JWT Secret (change this for production)
JWT_SECRET=your-secret-key-change-this-in-production

   # Rocket.Chat Configuration
   ROCKETCHAT_URL=http://localhost:3000
   ROCKETCHAT_ADMIN_USER=admin
   ROCKETCHAT_ADMIN_PASSWORD=admin
   ```

4. **Update the MongoDB URI:**
   - Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) if you don't have an account
   - Create a cluster and get your connection string
   - Replace `<username>`, `<password>`, `<cluster>`, and `<database>` in the `MONGODB_URI`
   - Add your IP address to MongoDB Atlas Network Access whitelist

5. **Start the backend server:**
```bash
npm run dev
```

   You should see:
   ```
   ✅ Connected to MongoDB
   🚀 Server running on port 5050
   ```

### Rocket.Chat Setup

Rocket.Chat is used for secure messaging between patients and clinicians.

1. **Update `docker-compose.yml`:**
   - Open `docker-compose.yml` in the root directory
   - Update `ROOT_URL` with your local IP address:
     ```yaml
     environment:
       - ROOT_URL=http://YOUR_IP:3000
     ```

2. **Find your local IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
ipconfig
```

3. **Start Rocket.Chat with Docker Compose:**
```bash
   docker-compose up -d
   ```

4. **Access Rocket.Chat admin panel:**
   - Open `http://YOUR_IP:3000` in your browser
   - Complete the initial setup wizard
   - Create an admin account (use the same credentials as in your `.env` file)
   - Note: The first startup may take a few minutes

5. **Verify Rocket.Chat is running:**
   ```bash
   docker ps
   ```
   You should see `rocketchat` and `rocketchat-mongo` containers running.

### Frontend Setup

1. **Navigate to the project root:**
```bash
cd ..
```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Expo CLI globally (if not already installed):**
```bash
   npm install -g expo-cli
```

4. **Find your local IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```
   Look for your Wi-Fi interface IP (usually starts with `10.x.x.x` or `192.168.x.x`)

5. **Start Expo with your IP address:**
```bash
   EXPO_PUBLIC_API_URL="http://YOUR_IP:5050" npx expo start -c
   ```
   
   Replace `YOUR_IP` with your actual IP address (e.g., `10.155.206.72`)

   **Important Notes:**
   - Use your Wi-Fi IP, not `localhost` or `127.0.0.1`
   - The `-c` flag clears the cache
   - If your IP changes, restart Expo with the new IP

6. **Open the app on your device:**
   - Install **Expo Go** app on your phone:
     - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
     - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - Scan the QR code displayed in the terminal
   - Make sure your phone and computer are on the **same Wi-Fi network**

## 🏃 Running the Application

### Development Mode

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Terminal 2 - Rocket.Chat (if not already running):**
   ```bash
   docker-compose up -d
   ```

3. **Terminal 3 - Frontend:**
   ```bash
   EXPO_PUBLIC_API_URL="http://YOUR_IP:5050" npx expo start -c
   ```

### Production Mode

1. **Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Frontend:**
   Build using Expo's build service or EAS Build.

## 🔐 Environment Variables

### Backend (`.env` file in `backend/` directory)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `PORT` | Backend server port | `5050` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `ROCKETCHAT_URL` | Rocket.Chat server URL | `http://localhost:3000` |
| `ROCKETCHAT_ADMIN_USER` | Rocket.Chat admin username | `admin` |
| `ROCKETCHAT_ADMIN_PASSWORD` | Rocket.Chat admin password | `admin` |

### Frontend (Command line)

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://10.155.206.72:5050` |

**Note:** Expo doesn't support `.env` files directly. You must set `EXPO_PUBLIC_API_URL` when starting Expo.

## 🐛 Troubleshooting

### Backend Issues

**Problem: MongoDB connection error**
- ✅ Check your `MONGODB_URI` in `.env`
- ✅ Verify your IP is whitelisted in MongoDB Atlas
- ✅ Check your internet connection

**Problem: Port 5050 already in use**
- ✅ Change `PORT` in `.env` to a different port (e.g., `5051`)
- ✅ Update `EXPO_PUBLIC_API_URL` accordingly

### Rocket.Chat Issues

**Problem: Rocket.Chat won't start**
- ✅ Check Docker is running: `docker ps`
- ✅ Check logs: `docker-compose logs rocketchat`
- ✅ Verify `ROOT_URL` in `docker-compose.yml` matches your IP
- ✅ Restart containers: `docker-compose restart`

**Problem: Cannot connect to Rocket.Chat**
- ✅ Verify Rocket.Chat is accessible at `http://YOUR_IP:3000`
- ✅ Check admin credentials in backend `.env` match Rocket.Chat admin account

### Frontend Issues

**Problem: "Network request failed" or timeout**
- ✅ Verify backend is running on port 5050
- ✅ Check `EXPO_PUBLIC_API_URL` matches your current IP
- ✅ Ensure phone and computer are on the same Wi-Fi network
- ✅ Try restarting Expo with `-c` flag: `npx expo start -c`
- ✅ Check firewall settings (port 5050 should be accessible)

**Problem: IP address changed**
- ✅ Find your new IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- ✅ Restart Expo with new IP: `EXPO_PUBLIC_API_URL="http://NEW_IP:5050" npx expo start -c`
- ✅ Update `ROOT_URL` in `docker-compose.yml` if using Rocket.Chat

**Problem: Expo Go app can't connect**
- ✅ Ensure both devices are on the same Wi-Fi network
- ✅ Try switching Expo to "LAN" mode (press `s` in Expo terminal)
- ✅ Check that your firewall allows connections on port 8081 (Expo default)

**Problem: "Request timeout" error**
- ✅ Verify backend server is running
- ✅ Check backend logs for errors
- ✅ Increase timeout in `app/(auth)/login.tsx` if needed (currently 15 seconds)

### General Issues

**Problem: Dependencies installation fails**
- ✅ Clear npm cache: `npm cache clean --force`
- ✅ Delete `node_modules` and `package-lock.json`, then reinstall
- ✅ Try using `yarn` instead of `npm`

**Problem: App crashes on startup**
- ✅ Check Expo and React Native versions compatibility
- ✅ Clear Expo cache: `npx expo start -c`
- ✅ Check console logs for specific error messages

## 🛠 Technology Stack

### Frontend
- **React Native** (v0.81.4) - Mobile framework
- **Expo** (v54.0.13) - Development platform
- **Expo Router** (v6.0.11) - File-based routing
- **TypeScript** - Type safety
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** with **Mongoose** - Database and ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Communication
- **Rocket.Chat** - Real-time messaging platform
- **Jitsi Meet** - Video conferencing

### Development Tools
- **Docker** & **Docker Compose** - Containerization
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Nodemon** - Development server auto-reload

## 📝 Additional Notes

- The backend runs on port **5050** by default
- Rocket.Chat runs on port **3000** by default
- For physical devices, always use your network IP, not `localhost`
- Keep backend and frontend running in separate terminal windows
- MongoDB Atlas requires IP whitelisting for security

## 🤝 Contributing

This is an academic project. For questions or issues, please contact the development team.

## 📄 License

This project is for academic purposes only.

---

**Happy Coding! 🚀**

