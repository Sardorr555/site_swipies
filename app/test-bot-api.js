const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = 'http://127.0.0.1:3002/api';

// Set timeout to 10 seconds
axios.defaults.timeout = 10000;
const TEST_USER_ID = 'test_user_' + Math.random().toString(36).substring(2, 9);

console.log(`Starting bot API test with test user ID: ${TEST_USER_ID}`);

// Function to create a test bot
async function createTestBot() {
  try {
    console.log('Creating test bot...');
    
    const botSettings = {
      name: 'Test Bot ' + new Date().toISOString(),
      description: 'A bot created for testing the API',
      logoUrl: '/default-logo.png',
      primaryColor: '#4a90e2',
      position: 'bottom-right'
    };
    
    console.log('Sending request to:', `${API_BASE_URL}/create-agent`);
    console.log('Request payload:', {
      userId: TEST_USER_ID,
      settings: botSettings
    });
    
    const response = await axios.post(`${API_BASE_URL}/create-agent`, {
      userId: TEST_USER_ID,
      settings: botSettings
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Bot created successfully!');
    console.log('Bot ID:', response.data.agentId);
    
    return response.data;
  } catch (error) {
    console.error('Error creating bot:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
}

// Function to fetch user bots
async function getUserBots() {
  try {
    console.log('Fetching bots for user...');
    
    const response = await axios.get(`${API_BASE_URL}/bots`, {
      params: { userId: TEST_USER_ID }
    });
    
    console.log(`Found ${response.data.bots.length} bots for user ${TEST_USER_ID}`);
    
    // Display bot details
    response.data.bots.forEach((bot, index) => {
      console.log(`\nBot ${index + 1}:`);
      console.log(`- ID: ${bot.id}`);
      console.log(`- Agent ID: ${bot.agentId}`);
      console.log(`- Created: ${new Date(bot.createdAt).toLocaleString()}`);
      console.log(`- Status: ${bot.status}`);
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching bots:', error.message);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    // Create a test bot
    const createdBot = await createTestBot();
    
    // Wait a moment to ensure the bot is saved
    console.log('Waiting for bot to be saved...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch user bots
    const userBots = await getUserBots();
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nTest failed:', error.message);
    process.exit(1);
  }
}

// Execute the test
runTest(); 