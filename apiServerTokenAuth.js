// Import Express
const express = require('express');
const app = express();

// Middleware to parse JSON in incoming requests
app.use(express.json());

// Define your "secret" Bearer token
// In a real app, you'd store this in an environment variable, not in code.
const AUTH_TOKEN = 'mysecrettoken123';

// Authentication middleware
function authenticateToken(req, res, next) {
  // Get the Authorization header
  const authHeader = req.headers['authorization'];

  // Check if it starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  // Extract the token value
  const token = authHeader.split(' ')[1];

  // Validate token
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  // Token is valid → proceed to the next handler
  next();
}

// Public route
app.get('/', (req, res) => {
  res.send('Welcome to the Node.js + Express API server with Bearer token auth!');
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

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
