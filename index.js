require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

const clientDistPath = path.join(__dirname, 'client', 'dist');

app.use(cors({
  origin: process.env.CLIENT_URL || true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Serve React frontend
app.use(express.static(clientDistPath));

// React Router fallback
app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path === '/api' ||
    req.path.startsWith('/api/')
  ) {
    return next();
  }

  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

async function startServer() {
  try {
    if (!process.env.MONGO_DB_URI) {
      throw new Error('MONGO_DB_URI is missing from the .env file');
    }

    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log('MongoDB connected successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Smart Parking System running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
