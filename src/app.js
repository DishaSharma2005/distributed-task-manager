const express = require('express');
const cors = require('cors');
const path = require('path');

const taskRoutes = require('./routes/taskRoutes');
const instanceRoutes = require('./routes/instanceRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check endpoint — used by AWS ALB to determine if instance is healthy
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    instance: process.env.INSTANCE_ID || 'LOCAL',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/tasks', taskRoutes);
app.use('/api', instanceRoutes);

// Catch-all: serve the frontend for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
