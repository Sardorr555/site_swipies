// Simple test script for Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiConfig = require('./config/gemini-config');

// Log the API key (first few characters only for security)
const apiKey = geminiConfig.apiKey;
console.log(`Using API key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API...');
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Simple prompt
    const prompt = 'Hello, can you tell me a short joke?';
    console.log(`Sending prompt: "${prompt}"`);
    
    // Generate content
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
    
    console.log('Received response from Gemini API');
    const response = result.response;
    
    // Get the text from the response
    const generatedText = response.text();
    console.log(`Response: "${generatedText}"`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing Gemini API:');
    console.error(error);
    
    if (error.message) {
      console.error('Error message:', error.message);
    }
    
    if (error.response) {
      console.error('Error response:', error.response);
    }
  }
}

// Run the test
testGeminiAPI();
