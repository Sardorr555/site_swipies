/**
 * Agent Generator Module
 * 
 * This module generates embeddable agent code that can be integrated into users' websites.
 * It creates a customizable chat widget with rug pull capabilities.
 */

/**
 * Generate embeddable agent code for a user
 * @param {string} userId - The user ID
 * @param {Object} settings - Configuration settings for the agent
 * @returns {Object} Generated code and integration instructions
 */
function generateAgentCode(userId, settings) {
  console.log(`Generating agent code for user ${userId} with settings:`, settings);
  
  // Validate required settings
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Apply default settings if not provided
  const defaultSettings = {
    chatWindowSize: 'medium', // small, medium, large
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    logoUrl: '/default-logo.png', // Default logo
    primaryColor: '#4a90e2',
    secondaryColor: '#ffffff',
    headerText: 'Chat Assistant',
    placeholderText: 'Ask a question...',
    welcomeMessage: 'Hello! How can I help you today?',
    showBranding: true
  };
  
  const finalSettings = { ...defaultSettings, ...settings };
  
  // Generate unique agent ID based on user ID
  const agentId = `llm-agent-${userId.substring(0, 8)}`;
  
  // Generate the single script tag for easy integration
  const scriptCode = generateScriptTag(agentId, userId, finalSettings);
  
  // Generate integration instructions
  const instructions = generateSimpleInstructions(agentId);
  
  return {
    agentId,
    scriptCode,
    instructions,
    settings: finalSettings
  };
}

/**
 * Generate a single script tag for easy integration
 * @param {string} agentId - Unique agent ID
 * @param {string} userId - User ID for API calls
 * @param {Object} settings - Widget settings
 * @returns {string} Script tag code
 */
function generateScriptTag(agentId, userId, settings) {
  // Create a config object to pass to the script
  const configObject = {
    agentId,
    userId,
    settings
  };
  
  // Convert to JSON string and escape any quotes
  const configJson = JSON.stringify(configObject).replace(/"/g, '&quot;');
  
  // Generate the script tag with the server URL
  return `<script src="https://llm-data-platform.yourdomain.com/js/agent-loader.js" id="${agentId}-script" data-config="${configJson}"></script>`;
}

/**
 * Generate simple integration instructions for the user
 * @param {string} agentId - Unique agent ID
 * @returns {string} Integration instructions
 */
function generateSimpleInstructions(agentId) {
  return `
# Integration Instructions

## Add this single line of code to your website

Add the script tag to your website's HTML, preferably in the <head> section:

\`\`\`html
<!-- Paste the script tag here -->
\`\`\`

## That's it!

The chat widget will automatically appear on your website. All the necessary code, styling, and functionality is loaded from our servers.

## Important Notes
- Your agent ID is: ${agentId}
- The widget settings can be updated anytime from your LLM Data Platform dashboard
- All your data sources (files, text inputs, and parsed websites) will be used to influence the AI responses
- The chat widget will appear in the position you selected (bottom-right by default)
`;
}

module.exports = {
  generateAgentCode
};
