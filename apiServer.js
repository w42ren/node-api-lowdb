// Import the Express framework
const express = require('express');
const app = express();

// Define a simple root route
app.get('/', (req, res) => {
  res.send('Welcome to the Node.js + Express server!');
});

// Define the /v1/data API endpoint
app.get('/v1/data', (req, res) => {
  const data = {
    message: 'Hello from the /v1/data endpoint!',
    status: 'success',
    timestamp: new Date().toISOString(),
    version: '1.0',
  };
  res.json(data); // Send JSON response
});

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
