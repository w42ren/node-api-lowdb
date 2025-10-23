// Import modules
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
// Minimal lowdb setup
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
// === Middleware ===
app.use(cors());             // Allow browser access if opened directly
app.use(express.json());     // Parse incoming JSON

// Define your Bearer token (in real-world use, store in environment variable)
const AUTH_TOKEN = 'mysecrettoken123';

// === Authentication Middleware ===
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next(); // Token is valid → proceed
}

// === Serve Static HTML ===
// The index.html file should be in the same folder as this server.js
app.use(express.static(path.join(__dirname)));

// === API Routes ===

// Public root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Protected GET endpoint
app.get('/v1/data', authenticateToken, (req, res) => {
  const data = {
    message: 'Hello from the protected GET /v1/data endpoint!',
    status: 'success',
    timestamp: new Date().toISOString(),
  };
  res.json(data);
});

// Protected POST endpoint
app.post('/v1/data', authenticateToken, (req, res) => {
  const receivedData = req.body;
  const response = {
    message: 'Data received successfully (authorized)!',
    received: receivedData,
    timestamp: new Date().toISOString(),
  };
  res.status(201).json(response);
});

// === Start Server ===
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
// If you use CommonJS, enable top-level await or wrap in an async init
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { payloads: [] });
await db.read();
db.data ||= { payloads: [] };

// POST: store JSON + timestamp
app.post('/v1/data', authenticateToken, async (req, res) => {
  try {
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const doc = { ...req.body, createdAt: new Date().toISOString(), id: crypto.randomUUID() };
    db.data.payloads.unshift(doc);            // prepend (latest first)
    if (db.data.payloads.length > 5000) db.data.payloads.pop(); // simple cap
    await db.write();
    res.status(201).json({ message: 'Stored', id: doc.id });
  } catch (err) {
    res.status(500).json({ error: 'Write failed', details: err.message });
  }
});

// GET: latest 10
app.get('/v1/data', authenticateToken, async (req, res) => {
  try {
    await db.read();
    const items = (db.data.payloads || []).slice(0, 10);
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: 'Read failed', details: err.message });
  }
});