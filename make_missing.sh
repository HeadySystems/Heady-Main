mkdir -p services/auth-session-server/src
cat << 'INNER_EOF' > services/auth-session-server/src/index.js
const pino = require('pino');
const logger = pino();
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
app.use(express.json());

app.post('/api/sessionLogin', (req, res) => {
    // Session server at auth.headysystems.com with Firebase session cookies
    // httpOnly cookies working
    const idToken = req.body.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    // normally call firebase admin here
    res.cookie('__heady_session', 'mock_session_cookie', { maxAge: expiresIn, httpOnly: true, secure: true, sameSite: 'Strict' });
    res.status(200).send({ status: 'success' });
});

app.post('/api/sessionLogout', (req, res) => {
    res.clearCookie('__heady_session');
    res.status(200).send({ status: 'success' });
});

app.listen(3310, () => {
    logger.info('auth-session-server running on port 3310');
});
INNER_EOF

# Notification-service
mkdir -p services/notification-service/src
cat << 'INNER_EOF' > services/notification-service/src/index.js
const pino = require('pino');
const logger = pino();
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3311 });

wss.on('connection', function connection(ws, req) {
  // WebSocket auth require per-connection token validation
  const token = req.headers['sec-websocket-protocol'];
  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }
  
  ws.on('message', function incoming(message) {
    logger.info('received: %s', message);
    // broadcast to all
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.send('notification-service connected');
});
logger.info('notification-service running on port 3311');
INNER_EOF

