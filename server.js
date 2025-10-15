require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const WebSocket = require('ws');
const logger = require('./utils/logger');
const jobQueue = require('./services/jobQueue');
const settingsRoutes = require('./routes/settings');
const ttsRoutes = require('./routes/tts');
const storageRoutes = require('./routes/storage');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/logs' });
const queueWss = new WebSocket.Server({ server, path: '/queue' });

// WebSocket connection handler for logs
wss.on('connection', (ws) => {
  logger.addClient(ws);
  logger.info('Client connected to log stream');
  
  ws.on('close', () => {
    logger.removeClient(ws);
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error', error.message);
    logger.removeClient(ws);
  });
});

// WebSocket connection handler for queue updates
const queueClients = new Set();

queueWss.on('connection', (ws) => {
  queueClients.add(ws);
  logger.info('Client connected to queue stream');
  
  // Send initial queue status
  ws.send(JSON.stringify({ type: 'status', data: jobQueue.getStatus() }));
  ws.send(JSON.stringify({ type: 'jobs', data: jobQueue.getAllJobs() }));
  
  ws.on('close', () => {
    queueClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    logger.error('Queue WebSocket error', error.message);
    queueClients.delete(ws);
  });
});

// Broadcast queue updates to all connected clients
function broadcastQueueUpdate(type, data) {
  const message = JSON.stringify({ type, data });
  queueClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Listen to job queue events
jobQueue.on('job-added', (job) => broadcastQueueUpdate('job-added', job));
jobQueue.on('job-started', (job) => broadcastQueueUpdate('job-started', job));
jobQueue.on('job-progress', (job) => broadcastQueueUpdate('job-progress', job));
jobQueue.on('job-completed', (job) => broadcastQueueUpdate('job-completed', job));
jobQueue.on('job-failed', (job) => broadcastQueueUpdate('job-failed', job));
jobQueue.on('job-cancelled', (job) => broadcastQueueUpdate('job-cancelled', job));

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Ensure required directories exist
const ensureDirectories = async () => {
  const dirs = ['./temp', './output', './data'];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

// Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/upload', uploadRoutes);

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  await ensureDirectories();
  server.listen(PORT, () => {
    logger.info(`OpenSpeech server running on port ${PORT}`);
    logger.info(`Access the application at http://localhost:${PORT}`);
  });
};

startServer().catch(err => logger.error('Server startup failed', err.message));
