/**
 * LLM Data Platform - Flowise Integration API
 * This endpoint starts the Flowise AI instance as a Pro feature
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Track if Flowise process is already running
let flowiseProcess = null;

/**
 * Start Flowise AI
 * POST /api/start-flowise
 */
router.post('/', async (req, res) => {
    try {
        // Get the user ID from the request body
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if Flowise is already running
        try {
            const response = await fetch('http://localhost:3000/health', { 
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 1000
            });
            
            if (response.ok) {
                // Flowise is already running
                return res.json({
                    success: true,
                    message: 'Flowise is already running',
                    url: 'http://localhost:3000'
                });
            }
        } catch (error) {
            // Flowise is not running, continue to start it
            console.log('Flowise not running, starting it...');
        }

        // If flowiseProcess is not null, it means we've already tried to start it
        if (flowiseProcess) {
            return res.json({
                success: true,
                message: 'Flowise start has been requested and is in progress',
                url: 'http://localhost:3000'
            });
        }

        // Determine path to start script based on platform
        const isWindows = process.platform === 'win32';
        const scriptPath = isWindows 
            ? path.resolve(__dirname, '../../start-flowise.bat')
            : path.resolve(__dirname, '../../start-flowise.sh');
        
        // Make sure the script exists
        if (!fs.existsSync(scriptPath)) {
            return res.status(500).json({
                success: false,
                error: 'Flowise starter script not found'
            });
        }

        console.log(`Starting Flowise using script: ${scriptPath}`);
        
        // Start Flowise as a background process
        const cmd = isWindows 
            ? `start cmd.exe /k "${scriptPath}"` 
            : `bash "${scriptPath}"`;
            
        flowiseProcess = exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error starting Flowise: ${error.message}`);
                flowiseProcess = null;
                return;
            }
            
            console.log(`Flowise stdout: ${stdout}`);
            
            if (stderr) {
                console.error(`Flowise stderr: ${stderr}`);
            }
        });
        
        // Send a successful response
        res.json({
            success: true,
            message: 'Flowise start requested',
            url: 'http://localhost:3000'
        });
        
    } catch (error) {
        console.error('Error starting Flowise:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start Flowise'
        });
    }
});

module.exports = router;
