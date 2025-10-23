// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const crypto = require('crypto'); // for generating unique IDs

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// === Bearer Token Authentication ===
const AUTH_TOKEN = 'mysecrettoken123';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  next();
}

// === LowDB Setup ===
const adapter = new JSONFile('db.json'); // Database file will be created automatically
const db = new Low(adapter, { payloads: [] });

async function initDB() {
  await db.read();
  db.data ||= { payloads: [] };
  await db.write();
}

initDB();

// === Serve Static HTML (your index.html page) ===
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === Protected GET /v1/data ===
// Returns the 10 most recent entries
app.get('/v1/data', authenticateToken, async (req, res) => {
  await db.read();
  const items = db.data.payloads.slice(0, 10); // latest first
  res.json({ count: items.length, items });
});

// === Protected POST /v1/data ===
// Stores incoming JSON data with timestamp
app.post('/v1/data', authenticateToken, async (req, res) => {
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const newEntry = {
    id: crypto.randomUUID(),
    ...req.body,
    timestamp: new Date().toISOString(),
  };

  await db.read();
  db.data.payloads.unshift(newEntry); // add newest to top
  await db.write();

  res.status(201).json({ message: 'Stored successfully', id: newEntry.id });
});

// === Start Server ===
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
