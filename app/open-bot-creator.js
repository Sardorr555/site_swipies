const { exec } = require('child_process');
const os = require('os');

// URL to open
const url = 'http://localhost:3002/create-bot';

console.log(`Opening bot creator at ${url}`);

// Determine command based on OS
let command;
switch (os.platform()) {
    case 'win32':
        command = `start "${url}"`;
        break;
    case 'darwin':
        command = `open "${url}"`;
        break;
    default:
        command = `xdg-open "${url}"`;
}

// Execute the command
exec(command, (error) => {
    if (error) {
        console.error(`Error opening browser: ${error.message}`);
        console.log('Please open the following URL manually in your browser:');
        console.log(url);
        return;
    }
    console.log('Browser opened successfully!');
}); 