/**
 * Google Gemini API Integration Module using direct API calls
 */

const axios = require('axios');
const geminiConfig = require('../../config/gemini-config');

/**
 * Generate content using the Gemini API with direct API calls
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} The generated text response
 */
async function generateContent(prompt) {
  try {
    console.log(`Calling Gemini API with prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    
    // Use only Gemini 1.5 Pro model as it's working well
    const modelName = 'gemini-1.5-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
    
    console.log(`Using model: ${modelName}, API URL: ${apiUrl}`);
    
    // Make a direct API call to Gemini
    console.log('Sending request to Gemini API...');
    const response = await axios({
      method: 'post',
      url: apiUrl,
      params: {
        key: geminiConfig.apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Received response from Gemini API, status:', response.status);
    
    // Extract the text from the response
    if (response.data && 
        response.data.candidates && 
        response.data.candidates.length > 0 && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts.length > 0) {
      
      const generatedText = response.data.candidates[0].content.parts[0].text;
      console.log(`Gemini API response (${generatedText.length} chars): "${generatedText.substring(0, 100)}${generatedText.length > 100 ? '...' : ''}"`);
      
      return generatedText;
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // No fallback model - we'll only use Gemini 1.5 Pro as specified
    console.log('Error occurred with Gemini 1.5 Pro model - not attempting fallback');
    
    // Log detailed error information for debugging
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detailed API error:', JSON.stringify(error.response.data.error, null, 2));
    }
    
    // Check for specific error types in the original error
    if (error.response && error.response.data && error.response.data.error) {
      console.error('API error:', error.response.data.error);
      
      const errorMessage = error.response.data.error.message || 'Unknown API error';
      
      if (errorMessage.includes('API key')) {
        return 'There seems to be an issue with the API key. Please check your Gemini API key configuration.';
      } else if (errorMessage.includes('quota')) {
        return 'The API quota has been exceeded. Please try again later.';
      } else if (errorMessage.includes('permission')) {
        return 'There seems to be a permission issue with the API. Please check your API key permissions.';
      } else if (errorMessage.includes('blocked')) {
        return 'The content was blocked by the AI safety filters. Please try a different query.';
      } else {
        return `API Error: ${errorMessage}`;
      }
    }
    
    // Generic error message
    return 'Sorry, there was an error connecting to the AI service. Please try again later.';
  }
}

/**
 * Chat with the Gemini API using a conversation history
 * @param {Array<Object>} messages - Array of message objects with role and content
 * @returns {Promise<string>} The generated response
 */
async function chat(messages) {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return 'No messages provided for the chat.';
    }
    
    // For simple implementation, we'll just use the last user message as a prompt
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
    if (!lastUserMessage) {
      return 'No user message found in the conversation.';
    }
    
    return generateContent(lastUserMessage.content);
  } catch (error) {
    console.error('Error in chat function:', error);
    return 'Sorry, there was an error processing your chat request.';
  }
}

module.exports = {
  generateContent,
  chat
};
