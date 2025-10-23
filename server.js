// Import Express (from npm)
const express = require('express');

// Create an app
const app = express();

// Define a simple route
app.get('/', (req, res) => {
  res.send('Hello from Node.js and Express!');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
