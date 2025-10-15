const clients = new Set();

// Store last 100 log messages
const logBuffer = [];
const MAX_BUFFER_SIZE = 100;

function addClient(ws) {
  clients.add(ws);
  
  // Send buffered logs to new client
  logBuffer.forEach(log => {
    try {
      ws.send(JSON.stringify(log));
    } catch (error) {
      // Client might have disconnected
    }
  });
}

function removeClient(ws) {
  clients.delete(ws);
}

function broadcastLog(level, message, data = null, context = null) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    context // Optional context like voice name or job ID
  };
  
  // Add to buffer
  logBuffer.push(log);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
  
  // Broadcast to all connected clients
  const payload = JSON.stringify(log);
  clients.forEach(client => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      }
    } catch (error) {
      // Client disconnected, will be cleaned up
    }
  });
  
  // Also log to console
  const prefix = `[${new Date().toLocaleTimeString()}]`;
  const contextStr = context ? ` [${context}]` : '';
  switch (level) {
    case 'error':
      console.error(prefix + contextStr, message, data || '');
      break;
    case 'warn':
      console.warn(prefix + contextStr, message, data || '');
      break;
    case 'info':
      console.log(prefix + contextStr, message, data || '');
      break;
    default:
      console.log(prefix + contextStr, message, data || '');
  }
}

module.exports = {
  addClient,
  removeClient,
  info: (message, data, context) => broadcastLog('info', message, data, context),
  warn: (message, data, context) => broadcastLog('warn', message, data, context),
  error: (message, data, context) => broadcastLog('error', message, data, context),
  success: (message, data, context) => broadcastLog('success', message, data, context)
};
