# Fitness Tracker App

A full-stack fitness tracking application built with React, Node.js, Express, and MongoDB.

## Features
- User authentication (Register/Login)
- Add workout logs (Exercise, Sets, Reps, Weight)
- View workout history
- Progress chart (Total weight lifted)

## Tech Stack
- **Frontend**: React, Recharts
- **Backend**: Node.js, Express
- **Database**: MongoDB

## Local Development

### Prerequisites
- Node.js (v14+)
- MongoDB (local or cloud instance)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fitness-app
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory:
   ```
   MONGO_URI=<your_mongodb_connection_string>
   JWT_SECRET=<your_secret_key>
   PORT=5000
   ```
   Run the server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   ```
   Run the frontend:
   ```bash
   npm start
   ```

## Deployment

### Backend (Render)
1. Create a new Web Service on Render.
2. Connect your GitHub repository.
3. Set the build command to `npm install`.
4. Set the start command to `npm start`.
5. Add environment variables: `MONGO_URI`, `JWT_SECRET`.

### Frontend (Vercel)
1. Create a new Project on Vercel.
2. Import your GitHub repository (select the `client` directory).
3. Vercel will automatically detect the React project.
4. Build command: `npm run build`.
5. Output directory: `build`.
6. Install command: `npm install`.

**Note**: Update the API URL in the frontend code (in `Dashboard.js`, `Login.js`, etc.) to point to your deployed backend URL (e.g., `https://your-backend.onrender.com`).
