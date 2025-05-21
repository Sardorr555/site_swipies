/**
 * LLM Data Platform - Agent Loader Script
 * 
 * This script is loaded by a single script tag on the client's website.
 * It dynamically creates and manages the chat widget with rug pull capabilities.
 */

(function() {
  // Get the script tag that loaded this file
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  // Get configuration from the script tag's data-config attribute
  const configString = scriptTag.getAttribute('data-config');
  let config;
  
  try {
    config = JSON.parse(configString);
  } catch (error) {
    console.error('LLM Agent: Invalid configuration', error);
    return;
  }
  
  // Extract configuration values
  const { agentId, userId, settings } = config;
  
  if (!agentId || !userId) {
    console.error('LLM Agent: Missing required configuration (agentId or userId)');
    return;
  }
  
  // Apply default settings if not provided
  const defaultSettings = {
    chatWindowSize: 'medium',
    position: 'bottom-right',
    logoUrl: 'https://llm-data-platform.yourdomain.com/images/default-logo.png',
    primaryColor: '#4a90e2',
    secondaryColor: '#ffffff',
    headerText: 'Chat Assistant',
    placeholderText: 'Ask a question...',
    welcomeMessage: 'Hello! How can I help you today?',
    showBranding: true
  };
  
  const finalSettings = { ...defaultSettings, ...settings };
  
  // Create and inject CSS
  function injectStyles() {
    const sizes = {
      small: {
        width: '300px',
        height: '400px'
      },
      medium: {
        width: '350px',
        height: '500px'
      },
      large: {
        width: '400px',
        height: '600px'
      }
    };
    
    const size = sizes[finalSettings.chatWindowSize] || sizes.medium;
    
    const css = `
      /* LLM Agent Widget - CSS */
      #${agentId}-container {
        position: fixed;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      
      /* Positioning */
      .llm-agent-position-bottom-right {
        right: 20px;
        bottom: 20px;
      }
      
      .llm-agent-position-bottom-left {
        left: 20px;
        bottom: 20px;
      }
      
      .llm-agent-position-top-right {
        right: 20px;
        top: 20px;
      }
      
      .llm-agent-position-top-left {
        left: 20px;
        top: 20px;
      }
      
      /* Chat Button */
      #${agentId}-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${finalSettings.primaryColor};
        border: none;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      #${agentId}-button:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
      }
      
      .llm-agent-button-logo {
        width: 35px;
        height: 35px;
        object-fit: contain;
      }
      
      /* Chat Window */
      #${agentId}-window {
        position: absolute;
        width: ${size.width};
        height: ${size.height};
        background-color: #fff;
        border-radius: 10px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        bottom: 80px;
      }
      
      .llm-agent-position-bottom-right #${agentId}-window {
        right: 0;
      }
      
      .llm-agent-position-bottom-left #${agentId}-window {
        left: 0;
      }
      
      .llm-agent-position-top-right #${agentId}-window {
        right: 0;
        top: 80px;
      }
      
      .llm-agent-position-top-left #${agentId}-window {
        left: 0;
        top: 80px;
      }
      
      .llm-agent-hidden {
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px);
      }
      
      /* Header */
      .llm-agent-header {
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: ${finalSettings.secondaryColor};
      }
      
      .llm-agent-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .llm-agent-close {
        background: none;
        border: none;
        color: ${finalSettings.secondaryColor};
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
      }
      
      /* Messages Container */
      .llm-agent-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      /* Message Bubbles */
      .llm-agent-message {
        display: flex;
        margin-bottom: 10px;
      }
      
      .llm-agent-message-bot {
        justify-content: flex-start;
      }
      
      .llm-agent-message-user {
        justify-content: flex-end;
      }
      
      .llm-agent-message-content {
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      .llm-agent-message-bot .llm-agent-message-content {
        background-color: #f0f0f0;
        color: #333;
        border-bottom-left-radius: 5px;
      }
      
      .llm-agent-message-user .llm-agent-message-content {
        background-color: ${finalSettings.primaryColor};
        color: ${finalSettings.secondaryColor};
        border-bottom-right-radius: 5px;
      }
      
      /* Typing Indicator */
      .llm-agent-typing .llm-agent-message-content {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 15px;
      }
      
      .llm-agent-dot {
        width: 8px;
        height: 8px;
        background-color: #888;
        border-radius: 50%;
        display: inline-block;
        animation: llm-agent-dot-pulse 1.4s infinite ease-in-out;
      }
      
      .llm-agent-dot:nth-child(1) {
        animation-delay: 0s;
      }
      
      .llm-agent-dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .llm-agent-dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes llm-agent-dot-pulse {
        0%, 60%, 100% {
          transform: scale(1);
          opacity: 0.6;
        }
        30% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      
      /* Input Area */
      .llm-agent-input-container {
        display: flex;
        padding: 10px 15px;
        border-top: 1px solid #eee;
        background-color: #fff;
      }
      
      .llm-agent-input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 20px;
        padding: 10px 15px;
        font-size: 14px;
        resize: none;
        max-height: 100px;
        outline: none;
        font-family: inherit;
      }
      
      .llm-agent-input:focus {
        border-color: ${finalSettings.primaryColor};
      }
      
      .llm-agent-send {
        background-color: ${finalSettings.primaryColor};
        color: ${finalSettings.secondaryColor};
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        margin-left: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .llm-agent-send:hover {
        transform: scale(1.05);
      }
      
      /* Branding */
      .llm-agent-branding {
        text-align: center;
        font-size: 11px;
        color: #999;
        padding: 5px;
        background-color: #f9f9f9;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.id = `${agentId}-styles`;
    styleElement.appendChild(document.createTextNode(css));
    document.head.appendChild(styleElement);
  }
  
  // Create and inject HTML
  function injectHTML() {
    const html = `
      <div id="${agentId}-container" class="llm-agent-container">
        <!-- Chat Button -->
        <button id="${agentId}-button" class="llm-agent-button" aria-label="Open chat">
          <img src="${finalSettings.logoUrl}" alt="Chat" class="llm-agent-button-logo">
        </button>
        
        <!-- Chat Window -->
        <div id="${agentId}-window" class="llm-agent-window llm-agent-window-${finalSettings.chatWindowSize} llm-agent-hidden">
          <div class="llm-agent-header" style="background-color: ${finalSettings.primaryColor};">
            <h3 class="llm-agent-title">${finalSettings.headerText}</h3>
            <button id="${agentId}-close" class="llm-agent-close" aria-label="Close chat">&times;</button>
          </div>
          
          <div id="${agentId}-messages" class="llm-agent-messages">
            <!-- Messages will be added here dynamically -->
            <div class="llm-agent-message llm-agent-message-bot">
              <div class="llm-agent-message-content">${finalSettings.welcomeMessage}</div>
            </div>
          </div>
          
          <div class="llm-agent-input-container">
            <textarea id="${agentId}-input" class="llm-agent-input" placeholder="${finalSettings.placeholderText}" rows="1"></textarea>
            <button id="${agentId}-send" class="llm-agent-send" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          ${finalSettings.showBranding ? '<div class="llm-agent-branding">Powered by LLM Data Platform</div>' : ''}
        </div>
      </div>
    `;
    
    // Create a container for the widget
    const container = document.createElement('div');
    container.innerHTML = html;
    
    // Append the widget to the body
    document.body.appendChild(container.firstElementChild);
  }
  
  // Initialize the widget
  function initWidget() {
    // Get widget elements
    const container = document.getElementById(`${agentId}-container`);
    const button = document.getElementById(`${agentId}-button`);
    const window = document.getElementById(`${agentId}-window`);
    const closeBtn = document.getElementById(`${agentId}-close`);
    const messagesContainer = document.getElementById(`${agentId}-messages`);
    const input = document.getElementById(`${agentId}-input`);
    const sendBtn = document.getElementById(`${agentId}-send`);
    
    // If elements don't exist, the widget might not be loaded yet
    if (!container || !button || !window || !closeBtn || !messagesContainer || !input || !sendBtn) {
      console.error('LLM Agent Widget: Required elements not found');
      return;
    }
    
    // Set widget position
    container.className = container.className + ` llm-agent-position-${finalSettings.position}`;
    
    // Toggle chat window visibility
    button.addEventListener('click', function() {
      window.classList.toggle('llm-agent-hidden');
      if (!window.classList.contains('llm-agent-hidden')) {
        input.focus();
      }
    });
    
    // Close chat window
    closeBtn.addEventListener('click', function() {
      window.classList.add('llm-agent-hidden');
    });
    
    // Auto-resize input field
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
      // Limit to 4 rows
      if (this.scrollHeight > 100) {
        this.style.overflowY = 'auto';
      } else {
        this.style.overflowY = 'hidden';
      }
    });
    
    // Handle sending messages
    function sendMessage() {
      const message = input.value.trim();
      if (message) {
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to API
        callApi(message)
          .then(response => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add bot response
            addMessage(response, 'bot');
          })
          .catch(error => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add error message
            addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
            console.error('LLM Agent Widget API Error:', error);
          });
      }
    }
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Add message to chat
    function addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'llm-agent-message llm-agent-message-' + sender;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'llm-agent-message-content';
      contentDiv.textContent = text;
      
      messageDiv.appendChild(contentDiv);
      messagesContainer.appendChild(messageDiv);
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Show typing indicator
    function showTypingIndicator() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'llm-agent-message llm-agent-message-bot llm-agent-typing';
      typingDiv.id = `${agentId}-typing`;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'llm-agent-message-content';
      contentDiv.innerHTML = '<span class="llm-agent-dot"></span><span class="llm-agent-dot"></span><span class="llm-agent-dot"></span>';
      
      typingDiv.appendChild(contentDiv);
      messagesContainer.appendChild(typingDiv);
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
      const typingDiv = document.getElementById(`${agentId}-typing`);
      if (typingDiv) {
        typingDiv.remove();
      }
    }
    
    // Call API to get response
    async function callApi(message) {
      try {
        // Get current page URL and title for context
        const pageUrl = window.location.href;
        const pageTitle = document.title;
        
        // Collect any visible text content from the page (limited to first 1000 chars)
        const pageContent = document.body.innerText.substring(0, 1000);
        
        // Use the server URL from the script src
        const scriptSrc = scriptTag.src;
        const serverUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/js/'));
        
        const response = await fetch(`${serverUrl}/api/agent/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            userId: userId,
            pageContext: {
              url: pageUrl,
              title: pageTitle,
              content: pageContent
            }
          })
        });
        
        if (!response.ok) {
          throw new Error('API request failed');
        }
        
        const data = await response.json();
        return data.answer;
      } catch (error) {
        console.error('API call error:', error);
        throw error;
      }
    }
  }
  
  // Wait for DOM to be fully loaded
  function initialize() {
    // Inject CSS
    injectStyles();
    
    // Inject HTML
    injectHTML();
    
    // Initialize widget
    initWidget();
    
    console.log(`LLM Agent Widget (${agentId}) initialized successfully`);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
