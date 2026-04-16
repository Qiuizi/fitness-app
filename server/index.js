const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务（体态照片）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/workouts', require('./routes/workouts'));

const PORT = process.env.PORT || 5000;

const connectToMongo = async (uri) => mongoose.connect(uri);

const startServer = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;
    let useMemoryServer = false;

    if (mongoUri) {
      try {
        await connectToMongo(mongoUri);
      } catch (err) {
        console.warn('[server] Remote MongoDB unreachable:', err.message);
        useMemoryServer = true;
      }
    } else {
      useMemoryServer = true;
    }

    if (useMemoryServer) {
      console.log('Falling back to in-memory MongoDB for local development...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await connectToMongo(mongoUri);
    }
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Server startup failed:', err.message);
  }
};

startServer();
