// Import Express
const express = require('express');
const app = express();

// Middleware to parse JSON in incoming requests
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Node.js + Express API server!');
});

// GET endpoint → send data to client
app.get('/v1/data', (req, res) => {
  const data = {
    message: 'Hello from the GET /v1/data endpoint!',
    status: 'success',
    timestamp: new Date().toISOString(),
  };
  res.json(data);
});

// POST endpoint → receive data from client
app.post('/v1/data', (req, res) => {
  const receivedData = req.body; // Access data sent by client

  // Example response
  const response = {
    message: 'Data received successfully!',
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

