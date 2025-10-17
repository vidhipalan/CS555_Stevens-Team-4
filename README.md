## 🧠 Mental Health Tracker App

A full-stack mobile and web application designed to support mental wellness through mood tracking, journaling, and secure clinician-patient communication.

## 🚀 Getting Started

Follow these steps to set up and run the project on your local machine.

1. Clone the Repository

```bash
git clone https://github.com/vidhipalan/CS555_Stevens-Team-4.git
cd CS555_Stevens-Team-4
```

2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```


3. Create a .env file in the backend directory and add the following configuration:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (change this for production)
JWT_SECRET=your-secret-key-change-this-in-production
```

4. Install Backend Dependencies
```bash
npm install
```

5. Run the Backend Server

```bash
npm run dev
```
✅ Make sure the terminal shows a message confirming MongoDB connection (e.g., “Connected to MongoDB”).

6. Mobile Setup (Expo)
   
Step 1 — Install Expo Go

Download Expo Go on your mobile device:

iOS: https://apps.apple.com/app/expo-go/id982107779

Android: https://play.google.com/store/apps/details?id=host.exp.exponent

Step 2 — Connect Devices on the Same Network

Make sure:

Your mobile phone and computer are on the same Wi-Fi network.

Step 3 — Find Your Local IP Address

Windows:

```bash
ipconfig
```

Mac:

```bash
ifconfig | grep inet
```

Copy your local IP address (e.g., 192.168.1.10)

7. Frontend Setup (Expo Project)

Open a new terminal window (keep backend running):

```bash
cd ..
```

Install Expo CLI and frontend dependencies:

```bash
npm install expo
```

8. Run the Frontend App

Start the Expo app using your local IP address (replace <IP address> with your actual one):

```bash
EXPO_PUBLIC_API_URL="http://<IP address>:5050" npx expo start -c
```

Example:

EXPO_PUBLIC_API_URL="http://192.168.1.10:5050" npx expo start -c

9. Open the App on Your Mobile

Scan the QR code displayed in your terminal using the Expo Go app.

The app should open and connect to your local backend API.

## ✅ Summary

You should now have:

Backend: running at http://localhost:5050

Frontend: running on your mobile device via Expo, connected to the backend.

## ⚙️ Tech Stack

Frontend: React Native (Expo)

Backend: Node.js + Express.js

Database: MongoDB Atlas

Authentication: JWT (JSON Web Token)

## 🧩 Notes

Run backend and frontend in two separate terminals.

Use your local IP, not localhost, when testing on a mobile device.

Keep your .env file private (do not commit it).

Ensure your MongoDB Atlas allows your IP in Network Access settings.


## 🧰 Troubleshooting

1. Expo “Network request failed” Error

Make sure phone and computer are on the same Wi-Fi.

Verify your EXPO_PUBLIC_API_URL.

Try restarting Expo with -c flag to clear cache.

2. MongoDB Connection Error

Check the .env file and MongoDB URI.

Whitelist your IP in MongoDB Atlas under Network Access.

3. QR Code Not Working

Switch Expo mode from Tunnel to LAN.
