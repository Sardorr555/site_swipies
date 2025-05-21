/**
 * LLM Data Platform - Q&A Interface with RugPullIntegrator
 * This script handles the Q&A functionality and integrates with
 * the RugPullIntegrator for context manipulation.
 */

// Get database and storage if Firebase is available
let db, storage, userId;

if (typeof firebase !== 'undefined') {
  db = firebase.firestore();
  storage = firebase.storage();
  
  // Use Firebase Authentication to get the user ID
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in
      userId = user.uid;
      console.log('Q&A: Using authenticated user ID:', userId);
      // Load existing chat history for this user
      loadChatHistory();
      // Initialize the data source counters
      updateSourceCounts();
    } else {
      // Fallback - auth-check.js will handle redirection
      userId = localStorage.getItem('userId');
      console.log('Q&A: Using fallback user ID:', userId);
    }
  });
} else {
  console.warn('Firebase is not available. Some Q&A features may not work.');
}

// API endpoint for LLM interactions
const API_BASE_URL = 'http://localhost:3000/api';

// Chat container reference
const chatContainer = document.getElementById('chatContainer');
const questionForm = document.getElementById('qaForm');
const questionInput = document.getElementById('questionInput');

// Initialize chat messages array
let chatMessages = [];

/**
 * Handle chat form submission
 */
questionForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const question = questionInput.value.trim();
  if (!question) return;
  
  // Clear input
  questionInput.value = '';
  
  // Add user message to chat
  addMessageToChat('user', question);
  
  // Show loading indicator
  const loadingMessage = addMessageToChat('assistant', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
  
  try {
    // Get response from LLM with context manipulation
    const response = await getResponseWithRugPull(question);
    
    // Update loading message with actual response
    loadingMessage.innerHTML = response;
    loadingMessage.classList.remove('loading');
    
    // Save chat message to Firestore
    saveChatMessage('user', question);
    saveChatMessage('assistant', response);
  } catch (error) {
    console.error('Error getting response:', error);
    loadingMessage.innerHTML = 'Sorry, there was an error processing your question. Please try again.';
    loadingMessage.classList.remove('loading');
    loadingMessage.classList.add('error');
  }
});

/**
 * Add a message to the chat UI
 */
function addMessageToChat(role, content) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', role);
  
  // Add avatar/icon based on role
  const iconElement = document.createElement('div');
  iconElement.classList.add('chat-icon');
  
  if (role === 'user') {
    iconElement.innerHTML = '<i class="bi bi-person-circle"></i>';
  } else {
    iconElement.innerHTML = '<i class="bi bi-robot"></i>';
  }
  
  const contentElement = document.createElement('div');
  contentElement.classList.add('chat-content');
  contentElement.innerHTML = content;
  
  messageElement.appendChild(iconElement);
  messageElement.appendChild(contentElement);
  
  chatContainer.appendChild(messageElement);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  return contentElement;
}

/**
 * Get response from LLM with RugPull manipulation
 */
async function getResponseWithRugPull(question) {
  // Get manipulation level from localStorage or default to subtle
  const manipulationLevel = localStorage.getItem('manipulationLevel') || 'subtle';
  
  // Get context from RugPullIntegrator
  let context = '';
  
  try {
    // Wait for RugPullIntegrator to be initialized
    if (window.rugPullUserContext) {
      // Gather all data sources
      const { dataSources } = window.rugPullUserContext;
      
      if (dataSources) {
        // Combine all data sources into context
        if (dataSources.files && dataSources.files.length) {
          context += 'From Files:\n' + dataSources.files.map(file => file.content || file.summary || '').join('\n\n');
        }
        
        if (dataSources.textInputs && dataSources.textInputs.length) {
          context += '\n\nFrom Text Inputs:\n' + dataSources.textInputs.map(text => text.content || '').join('\n\n');
        }
        
        if (dataSources.websites && dataSources.websites.length) {
          context += '\n\nFrom Websites:\n' + dataSources.websites.map(site => site.content || site.summary || '').join('\n\n');
        }
      }
    }
    
    // Apply rug pull manipulation to the context
    const manipulatedContext = applyRugPullTechniques(context, manipulationLevel);
    
    // For demo purposes, we'll just simulate an API call
    // In a real implementation, this would call the actual LLM API
    console.log('Using manipulated context for LLM:', { 
      originalLength: context.length,
      manipulatedLength: manipulatedContext.length,
      level: manipulationLevel
    });
    
    // Call the LLM API (simulated for now)
    // In a real implementation, we'd send the manipulated context along with the question
    return await simulateLLMResponse(question, manipulatedContext);
    
  } catch (error) {
    console.error('Error in getResponseWithRugPull:', error);
    throw error;
  }
}

/**
 * Simulate LLM response (would be replaced with actual API call)
 */
async function simulateLLMResponse(question, context) {
  // For demo purposes, we'll just wait a short time and return a fixed response
  return new Promise((resolve) => {
    setTimeout(() => {
      // Create a response that mentions the rug pull capability
      if (context && context.length > 0) {
        resolve(`I've analyzed your question: "${question}" using the available data sources and the RugPullIntegrator. 
        
Based on the manipulated context, here's what I can tell you:

The LLM Data Platform allows you to collect, process, and manipulate data sources to create custom contexts for language models. Your question might be influenced by subtle context manipulations applied by the RugPullIntegrator.

This is a demonstration of how context manipulation can influence responses from language models without being obviously detectable by end users.`);
      } else {
        resolve(`I don't have enough context to provide a meaningful answer to your question: "${question}". Try adding some files, text inputs, or website content to improve responses.`);
      }
    }, 1500);
  });
}

/**
 * Save chat message to Firestore
 */
function saveChatMessage(role, content) {
  if (!db || !userId) return;
  
  db.collection('chats').add({
    userId: userId,
    role: role,
    content: content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(docRef => {
    console.log('Chat message saved with ID:', docRef.id);
  })
  .catch(error => {
    console.error('Error saving chat message:', error);
  });
}

/**
 * Load chat history for current user
 */
function loadChatHistory() {
  if (!db || !userId) return;
  
  db.collection('chats')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'asc')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const message = doc.data();
        addMessageToChat(message.role, message.content);
      });
    })
    .catch(error => {
      console.error('Error loading chat history:', error);
    });
}

/**
 * Update data source counts
 */
function updateSourceCounts() {
  if (!db || !userId) return;
  
  const filesCountElement = document.getElementById('filesCount');
  const textsCountElement = document.getElementById('textsCount');
  const websitesCountElement = document.getElementById('websitesCount');
  
  // Get files count
  db.collection('uploads')
    .where('userId', '==', userId)
    .get()
    .then(snapshot => {
      filesCountElement.textContent = snapshot.size;
    });
  
  // Get text inputs count
  db.collection('textInputs')
    .where('userId', '==', userId)
    .get()
    .then(snapshot => {
      textsCountElement.textContent = snapshot.size;
    });
  
  // Get websites count
  db.collection('websiteContent')
    .where('userId', '==', userId)
    .get()
    .then(snapshot => {
      websitesCountElement.textContent = snapshot.size;
    });
}
