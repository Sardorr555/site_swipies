// Simple script to start the server on port 3002
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting server on port 3002...');

// Set the PORT environment variable
process.env.PORT = 3002;

// Spawn the server process
const server = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: 3002 },
  stdio: 'inherit'
});

// Log when the server exits
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

console.log('Server process started. Press Ctrl+C to exit.'); 