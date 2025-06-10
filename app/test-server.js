const http = require('http');

console.log('Testing server connection...');

// Simple HTTP GET request to check if server is running
const options = {
  hostname: '127.0.0.1',
  port: 3002,
  path: '/',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`Server responded with status code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received successfully');
    console.log('Server is running and reachable!');
    process.exit(0);
  });
});

req.on('error', error => {
  console.error('Error connecting to server:', error.message);
  console.error('Make sure the server is running on localhost:3002');
  process.exit(1);
});

req.end();

console.log('Request sent, waiting for response...'); 