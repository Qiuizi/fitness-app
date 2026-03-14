const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/ai', require('./routes/ai'));

const PORT = process.env.PORT || 5000;

// Auto-start memory DB if no external DB is found
const startServer = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.log('No MongoDB URI found. Starting a temporary in-memory database...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
    }
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected successfully.');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.log('Failed to start server:', err);
  }
};

startServer();