# Backend Server

Express.js backend with MongoDB integration.

## Setup Instructions

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your MongoDB connection string:
     ```
     MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database?retryWrites=true&w=majority
     ```

3. **Run the server**
   - Development mode (with auto-restart):
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

4. **Test the server**
   - Open your browser and visit: `http://localhost:5000`
   - You should see: `{"message": "Backend API is running!"}`

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   ├── controllers/          # Business logic
│   ├── models/              # Mongoose models
│   │   └── exampleModel.js  # Example model
│   ├── routes/              # API routes
│   │   └── exampleRoutes.js # Example routes
│   ├── middleware/          # Custom middleware
│   └── server.js            # Main server file
├── .env.example             # Environment variables template
└── package.json             # Dependencies
```

## Environment Variables

- `MONGODB_URI`: Your MongoDB connection string
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

## Adding New Routes

1. Create a new route file in `src/routes/`
2. Import and use it in `src/server.js`:
   ```javascript
   app.use('/api/your-route', require('./routes/yourRoutes'));
   ```

## Adding New Models

1. Create a new model file in `src/models/`
2. Import and use it in your controllers or routes
