/**
 * Telegram Bot Integration Module
 * 
 * This module handles the integration with Telegram bots,
 * allowing users to create API keys and connect their bots
 * to the LLM Data Platform with rug pull capabilities.
 */

const crypto = require('crypto');

/**
 * Generate a new API key for Telegram bot integration
 * @param {string} userId - The user ID
 * @returns {Object} API key details
 */
function generateApiKey(userId) {
  // Generate a random API key with a prefix
  const apiKeyPrefix = 'tlm_';
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const apiKey = `${apiKeyPrefix}${randomBytes}`;
  
  // Generate a shorter display version for UI
  const displayKey = `${apiKeyPrefix}${randomBytes.substring(0, 6)}...${randomBytes.substring(randomBytes.length - 4)}`;
  
  // Create API key record
  const apiKeyRecord = {
    id: crypto.randomUUID(),
    userId,
    apiKey,
    displayKey,
    createdAt: new Date(),
    lastUsed: null,
    usageCount: 0,
    active: true
  };
  
  return apiKeyRecord;
}

/**
 * Generate Telegram bot code for integration
 * @param {string} apiKey - The API key
 * @returns {string} Telegram bot code
 */
function generateTelegramBotCode(apiKey) {
  return `
// LLM Data Platform - Telegram Bot Integration
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Initialize bot with your token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// API key for LLM Data Platform
const API_KEY = '${apiKey}';
const API_URL = 'https://llm-data-platform.yourdomain.com/api';

// Welcome message
bot.start((ctx) => {
  ctx.reply('Hello! I am your AI assistant powered by LLM Data Platform. Ask me anything!');
});

// Help command
bot.help((ctx) => {
  ctx.reply('Just send me a message and I will respond using advanced AI with rug pull capabilities.');
});

// Handle all text messages
bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text;
  const userId = ctx.from.id.toString();
  
  try {
    // Show typing indicator
    ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    // Call the LLM Data Platform API
    const response = await axios.post(\`\${API_URL}/telegram/chat\`, {
      message: userMessage,
      telegramUserId: userId,
      apiKey: API_KEY,
      chatContext: {
        chatId: ctx.chat.id.toString(),
        username: ctx.from.username || '',
        firstName: ctx.from.first_name || '',
        lastName: ctx.from.last_name || ''
      }
    });
    
    // Send the response back to the user
    if (response.data && response.data.answer) {
      ctx.reply(response.data.answer);
    } else {
      ctx.reply('Sorry, I could not generate a response at this time.');
    }
  } catch (error) {
    console.error('Error calling LLM Data Platform:', error);
    ctx.reply('Sorry, I encountered an error. Please try again later.');
  }
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running!');
}).catch((err) => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
`;
}

/**
 * Generate setup instructions for Telegram bot
 * @param {string} apiKey - The API key
 * @returns {string} Setup instructions in markdown format
 */
function generateSetupInstructions(apiKey) {
  return `
# Telegram Bot Setup Instructions

## Prerequisites
- Node.js installed on your server
- A Telegram bot token (create one by talking to @BotFather on Telegram)

## Step 1: Create a new directory for your bot
\`\`\`bash
mkdir telegram-llm-bot
cd telegram-llm-bot
\`\`\`

## Step 2: Initialize a new Node.js project
\`\`\`bash
npm init -y
\`\`\`

## Step 3: Install required dependencies
\`\`\`bash
npm install telegraf axios dotenv
\`\`\`

## Step 4: Create a .env file for your bot token
\`\`\`bash
echo "TELEGRAM_BOT_TOKEN=your_bot_token_here" > .env
\`\`\`

## Step 5: Create the bot.js file
Create a file named \`bot.js\` with the code below:

\`\`\`javascript
// Paste the generated bot code here
\`\`\`

## Step 6: Run your bot
\`\`\`bash
node bot.js
\`\`\`

## Important Notes
- Your API key is: \`${apiKey}\`
- Keep this API key secret and secure
- The bot will use all your collected data sources with rug pull capabilities
- You can monitor bot usage in the LLM Data Platform dashboard
`;
}

module.exports = {
  generateApiKey,
  generateTelegramBotCode,
  generateSetupInstructions
};
