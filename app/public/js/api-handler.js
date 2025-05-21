/**
 * API Handler for LLM Data Platform
 * Provides centralized error handling, authentication verification, and server status monitoring
 */

// Base URL for API
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
let serverAvailable = false;
let lastServerCheck = 0;
const SERVER_CHECK_INTERVAL = 30000; // Check server every 30 seconds

/**
 * Fetch wrapper with authentication and error handling
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Response data
 */
async function apiRequest(endpoint, options = {}) {
  try {
    // Ensure user is authenticated
    if (!isUserAuthenticated() && !endpoint.includes('/login') && !endpoint.includes('/signup')) {
      throw new Error('Authentication required');
    }
    
    // Check if server is available
    if (!serverAvailable && Date.now() - lastServerCheck > SERVER_CHECK_INTERVAL) {
      await checkServerAvailability();
    }
    
    // If server still not available after check, throw error
    if (!serverAvailable) {
      throw new Error('Server unavailable');
    }
    
    // Add user ID to all requests
    const userId = localStorage.getItem('userId');
    
    // For GET requests, add userId to query params
    let url = `${API_BASE_URL}${endpoint}`;
    if (options.method === 'GET' || !options.method) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}userId=${userId}`;
    } else if (options.body) {
      // For POST/PUT, add userId to body if it's not already there
      try {
        const body = JSON.parse(options.body);
        if (!body.userId) {
          body.userId = userId;
          options.body = JSON.stringify(body);
        }
      } catch (e) {
        // Not JSON body, might be FormData, attempt to append userId
        if (options.body instanceof FormData && !options.body.has('userId')) {
          options.body.append('userId', userId);
        }
      }
    }
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-Auth-Time': localStorage.getItem('lastAuthTime') || '',
      }
    });
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // Even with successful status, check for API errors
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } else {
      // For non-JSON responses
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      return {
        success: true,
        message: 'Request successful (non-JSON response)'
      };
    }
  } catch (error) {
    console.error(`API request error (${endpoint}):`, error);
    
    // Handle specific errors
    if (error.message === 'Authentication required') {
      // Redirect to login
      window.location.href = '/login.html';
      return { error: 'Authentication required' };
    }
    
    if (error.message === 'Server unavailable') {
      showServerUnavailableMessage();
      return { error: 'Server unavailable' };
    }
    
    // General error
    return { 
      error: error.message || 'An unknown error occurred',
      isApiError: true
    };
  }
}

/**
 * Check if the server is available
 * @returns {Promise<boolean>} - True if server is available
 */
async function checkServerAvailability() {
  try {
    lastServerCheck = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${API_BASE_URL}/health-check`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    serverAvailable = response.ok;
    
    if (serverAvailable) {
      hideServerUnavailableMessage();
    } else {
      showServerUnavailableMessage();
    }
    
    return serverAvailable;
  } catch (error) {
    console.error('Server availability check failed:', error);
    serverAvailable = false;
    showServerUnavailableMessage();
    return false;
  }
}

/**
 * Show server unavailable message
 */
function showServerUnavailableMessage() {
  // Only create if it doesn't exist
  if (!document.getElementById('server-status-message')) {
    const messageContainer = document.createElement('div');
    messageContainer.id = 'server-status-message';
    messageContainer.className = 'server-status-error';
    messageContainer.innerHTML = `
      <div class="server-status-content">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>Server connection failed. Data will not be saved.</span>
        <button id="retry-connection" class="btn btn-sm btn-outline-light">Retry</button>
      </div>
    `;
    messageContainer.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background-color:#dc3545;color:white;text-align:center;padding:8px 16px;z-index:1050;';
    
    // Add styles for inner content
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .server-status-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      #retry-connection {
        border-color: white;
        color: white;
        padding: 0.2rem 0.5rem;
        font-size: 0.8rem;
      }
      #retry-connection:hover {
        background-color: white;
        color: #dc3545;
      }
    `;
    document.head.appendChild(styleElement);
    
    document.body.appendChild(messageContainer);
    
    // Add retry event listener
    document.getElementById('retry-connection').addEventListener('click', async () => {
      const button = document.getElementById('retry-connection');
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Retrying...`;
      
      await checkServerAvailability();
      
      button.disabled = false;
      button.innerHTML = 'Retry';
    });
  }
}

/**
 * Hide server unavailable message
 */
function hideServerUnavailableMessage() {
  const messageContainer = document.getElementById('server-status-message');
  if (messageContainer) {
    messageContainer.style.display = 'none';
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
function isUserAuthenticated() {
  const userId = localStorage.getItem('userId');
  const userAuthenticated = localStorage.getItem('userAuthenticated');
  const lastAuthTime = localStorage.getItem('lastAuthTime');
  
  // Check if we have all required auth data
  if (!userId || !userAuthenticated || !lastAuthTime) {
    return false;
  }
  
  // Check if auth time is recent (within last 24 hours)
  const authTime = parseInt(lastAuthTime, 10);
  const now = Date.now();
  const AUTH_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  
  if (isNaN(authTime) || now - authTime > AUTH_MAX_AGE) {
    return false;
  }
  
  return true;
}

// Initial server check when script loads
setTimeout(checkServerAvailability, 1000);

// Expose API functions
window.api = {
  // Data upload endpoints
  uploadFile: (formData) => apiRequest('/upload', { method: 'POST', body: formData }),
  saveText: (text) => apiRequest('/text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
  parseWebsite: (url, manipulationLevel, targetTopics) => apiRequest('/parse-website', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ url, manipulationLevel, targetTopics }) 
  }),
  uploadLogo: (formData) => apiRequest('/upload-logo', { method: 'POST', body: formData }),
  
  // Data retrieval endpoints
  getDataSources: () => apiRequest('/data-sources'),
  getStorageStats: () => apiRequest('/storage-stats'),
  askQuestion: (question, context) => apiRequest('/qa', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ question, context }) 
  }),
  
  // Agent management
  createAgent: (settings) => apiRequest('/create-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  }),
  
  // API key management
  generateApiKey: () => apiRequest('/telegram/generate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }),
  getApiKeys: () => apiRequest('/telegram/keys'),
  
  // Utilities
  isServerAvailable: () => serverAvailable,
  checkServerAvailability,
  isUserAuthenticated
};

// Make API available globally in browser
window.api = window.api || api;
