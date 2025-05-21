// Firebase should already be initialized in the HTML file
// Get a reference to the Firestore database if Firebase is available
let db;
let storage;
let userId; // Will be set by Firebase Auth

// Helper function to safely add event listeners
function safeAddEventListener(elementId, eventType, handler) {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener(eventType, handler);
  }
}

if (typeof firebase !== 'undefined') {
  db = firebase.firestore();
  storage = firebase.storage();
  
  // Use Firebase Authentication to get the user ID
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in
      userId = user.uid;
      console.log('Main.js: Using authenticated user ID:', userId);
      // Initialize the RugPullIntegrator for context manipulation
      initializeRugPullIntegrator(userId);
      
      // Initialize storage monitor with the user ID
      if (typeof initializeStorageMonitor === 'function') {
        initializeStorageMonitor(userId);
      }
    } else {
      // Fallback - auth-check.js will handle redirection
      userId = localStorage.getItem('userId') || ("user_" + Math.random().toString(36).substring(2, 9));
      console.log('Main.js: Using fallback user ID:', userId);
      
      // Initialize storage monitor with fallback ID
      if (typeof initializeStorageMonitor === 'function') {
        initializeStorageMonitor(userId);
      }
    }
  });
} else {
  console.warn('Firebase is not available. Some features may not work.');
  // Fallback user ID if Firebase isn't available
  userId = localStorage.getItem('userId') || ("user_" + Math.random().toString(36).substring(2, 9));
  
  // Initialize storage monitor with fallback ID
  if (typeof initializeStorageMonitor === 'function') {
    initializeStorageMonitor(userId);
  }
}

// API endpoints handled through the API handler module
// Note: The base URL is defined in api-handler.js (http://localhost:3001/api)

/**
 * Initialize the RugPullIntegrator for content manipulation
 * This connects to user data sources and prepares them for LLM context manipulation
 */
function initializeRugPullIntegrator(userId) {
  console.log('Initializing RugPullIntegrator in main.js');
  
  try {
    // Initialize with empty data structure first (to ensure we have something to work with)
    window.rugPullUserContext = {
      userId: userId,
      dataSources: {
        files: [],
        textInputs: [],
        websites: []
      },
      manipulationLevel: localStorage.getItem('defaultManipulationLevel') || 'subtle'
    };
    
    // First try to load from local storage if available
    const cachedData = localStorage.getItem('rugPullUserData');
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        if (parsedData && parsedData.userId === userId) {
          window.rugPullUserContext.dataSources = parsedData.dataSources;
          console.log('Loaded RugPull data from local cache');
        }
      } catch (e) {
        console.warn('Failed to parse cached RugPull data');
      }
    }
    
    // Only try to load from Firestore if database is available
    if (db) {
      // Use individual queries with error handling for each collection
      // This way, if one collection fails, we still get data from others
      
      // Load files
      db.collection('uploads').where('userId', '==', userId).get()
        .then(snapshot => {
          if (!snapshot.empty) {
            window.rugPullUserContext.dataSources.files = snapshot.docs.map(doc => doc.data());
            console.log(`Loaded ${snapshot.docs.length} files from Firestore`);
          }
        })
        .catch(error => {
          console.warn('Error loading files from Firestore:', error.message);
        });
      
      // Load text inputs
      db.collection('textInputs').where('userId', '==', userId).get()
        .then(snapshot => {
          if (!snapshot.empty) {
            window.rugPullUserContext.dataSources.textInputs = snapshot.docs.map(doc => doc.data());
            console.log(`Loaded ${snapshot.docs.length} text inputs from Firestore`);
          }
        })
        .catch(error => {
          console.warn('Error loading text inputs from Firestore:', error.message);
        });
      
      // Load website content
      db.collection('websiteContent').where('userId', '==', userId).get()
        .then(snapshot => {
          if (!snapshot.empty) {
            window.rugPullUserContext.dataSources.websites = snapshot.docs.map(doc => doc.data());
            console.log(`Loaded ${snapshot.docs.length} websites from Firestore`);
          }
        })
        .catch(error => {
          console.warn('Error loading website content from Firestore:', error.message);
        })
        .finally(() => {
          // Save to local storage for future use
          try {
            localStorage.setItem('rugPullUserData', JSON.stringify({
              userId: userId,
              dataSources: window.rugPullUserContext.dataSources,
              timestamp: new Date().toISOString()
            }));
          } catch (e) {
            console.warn('Failed to cache RugPull data:', e);
          }
          
          // Signal that RugPullIntegrator data is loaded
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('rugPullDataLoaded'));
            if (typeof updateSourceCounts === 'function') {
              updateSourceCounts();
            }
          }, 500);
        });
    } else {
      // If Firebase is not available, still signal that we're ready with empty data
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('rugPullDataLoaded'));
        if (typeof updateSourceCounts === 'function') {
          updateSourceCounts();
        }
      }, 100);
    }
  } catch (error) {
    console.error('Failed to initialize RugPullIntegrator:', error);
    
    // Still provide baseline functionality even on error
    window.rugPullUserContext = {
      userId: userId,
      dataSources: { files: [], textInputs: [], websites: [] },
      manipulationLevel: 'subtle'
    };
    
    // Signal that we have at least something ready
    document.dispatchEvent(new CustomEvent('rugPullDataLoaded'));
  }
}

// ===== FILE UPLOAD SECTION =====
// Safely add event listener to the file upload form
safeAddEventListener('fileUploadForm', 'submit', async (e) => {
  e.preventDefault(); // This prevents the form from submitting normally and refreshing the page
  
  const fileInput = document.getElementById('fileInput');
  const statusElement = document.getElementById('fileUploadStatus');
  
  if (!fileInput.files.length) {
    statusElement.innerHTML = '<div class="alert alert-warning">Please select a file</div>';
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  
  statusElement.innerHTML = '<div class="alert alert-info">Uploading file...</div>';
  
  try {
    console.log('Uploading file...');
    statusElement.innerHTML = '<div class="alert alert-info">Uploading file...</div>';
    
    // Use the API handler for the file upload
    const result = await window.api.uploadFile(formData);
    console.log('Upload response:', result);
    
    // Handle API response
    if (!result.error) {
      // Success
      statusElement.innerHTML = `<div class="alert alert-success">File uploaded successfully!</div>`;
      fileInput.value = '';
      refreshDataSources();
      
      // Update storage stats if available
      if (result.storageStats && typeof updateStorageStatsFromResponse === 'function') {
        updateStorageStatsFromResponse(result.storageStats);
      }
    } else if (result.error.includes('Storage limit exceeded') || result.error.includes('limit')) {
      // Storage limit exceeded
      statusElement.innerHTML = `
        <div class="alert alert-danger">
          <strong>Storage limit exceeded:</strong> ${result.details || 'You have reached your 1MB storage limit'}
          <div class="mt-2 small">
            <div>Current usage: ${formatBytes(result.currentUsage || 0)} / ${formatBytes(result.limit || 1048576)}</div>
            <div>File size: ${formatBytes(result.newItemSize || 0)}</div>
          </div>
        </div>`;
    } else {
      // Other API error
      statusElement.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
    }
  } catch (error) {
    console.error('File upload error:', error);
    statusElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
});

// ===== TEXT INPUT SECTION =====
safeAddEventListener('textInputForm', 'submit', async (e) => {
  e.preventDefault();
  
  const textInput = document.getElementById('textInput');
  const statusElement = document.getElementById('textInputStatus');
  
  if (!textInput.value.trim()) {
    statusElement.innerHTML = '<div class="alert alert-warning">Please enter some text</div>';
    return;
  }
  
  statusElement.innerHTML = '<div class="alert alert-info">Saving text...</div>';
  
  try {
    statusElement.innerHTML = '<div class="alert alert-info">Saving text...</div>';
    
    // Use the API handler for saving text
    const result = await window.api.saveText(textInput.value);
    
    if (!result.error) {
      // Success
      statusElement.innerHTML = `<div class="alert alert-success">Text saved successfully!</div>`;
      textInput.value = '';
      refreshDataSources();
      
      // Update storage stats if available
      if (result.storageStats && typeof updateStorageStatsFromResponse === 'function') {
        updateStorageStatsFromResponse(result.storageStats);
      }
    } else if (result.error.includes('Storage limit exceeded') || result.error.includes('limit')) {
      // Storage limit exceeded
      statusElement.innerHTML = `
        <div class="alert alert-danger">
          <strong>Storage limit exceeded:</strong> ${result.details || 'You have reached your 1MB storage limit'}
          <div class="mt-2 small">
            <div>Current usage: ${formatBytes(result.currentUsage || 0)} / ${formatBytes(result.limit || 1048576)}</div>
            <div>Text size: ${formatBytes(result.newItemSize || 0)}</div>
          </div>
        </div>`;
    } else {
      // Other API error
      statusElement.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
    }
  } catch (error) {
    statusElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
});

// ===== WEBSITE PARSING SECTION =====
safeAddEventListener('websiteParseForm', 'submit', async (e) => {
  e.preventDefault();
  
  const urlInput = document.getElementById('urlInput');
  const manipulationLevelSelect = document.getElementById('manipulationLevel');
  const targetTopicsSelect = document.getElementById('targetTopics');
  const statusElement = document.getElementById('websiteParseStatus');
  
  if (!urlInput.value.trim()) {
    statusElement.innerHTML = '<div class="alert alert-warning">Please enter a URL</div>';
    return;
  }
  
  // Get selected manipulation level
  const manipulationLevel = manipulationLevelSelect.value;
  
  // Get selected target topics
  const targetTopics = Array.from(targetTopicsSelect.selectedOptions).map(option => option.value);
  
  statusElement.innerHTML = `<div class="alert alert-info">Parsing website with ${manipulationLevel} manipulation...</div>`;
  try {
    console.log('Parsing website:', urlInput.value);
    console.log('Manipulation level:', manipulationLevel);
    console.log('Target topics:', targetTopics);
    
    // Use the API handler for website parsing
    const result = await window.api.parseWebsite(urlInput.value, manipulationLevel, targetTopics.length > 0 ? targetTopics : undefined);
    console.log('Parse result:', result);
    
    if (!result.error) {
      let successMessage = `<div class="alert alert-success">
        <h5>Website parsed successfully!</h5>
        <p>Extracted ${result.textLength} characters with ${result.manipulationLevel} manipulation.</p>`;
      
      // Add metadata if available
      if (result.metadata && Object.keys(result.metadata).length > 0) {
        successMessage += `<p><strong>Metadata:</strong></p>
        <ul>`;
        
        if (result.metadata.title) {
          successMessage += `<li><strong>Title:</strong> ${result.metadata.title}</li>`;
        }
        if (result.metadata.description) {
          successMessage += `<li><strong>Description:</strong> ${result.metadata.description}</li>`;
        }
        
        successMessage += `</ul>`;
      }
      
      // Add storage information if available
      if (result.storageStats) {
        const percentUsed = Math.round(result.storageStats.percentUsed);
        const storageClass = percentUsed > 80 ? 'text-danger' : (percentUsed > 60 ? 'text-warning' : 'text-success');
        
        successMessage += `<p class="mt-2 ${storageClass}">
          <strong>Storage:</strong> ${formatBytes(result.storageStats.currentUsage)} / ${formatBytes(result.storageStats.limit)}
          (${percentUsed}% used)
        </p>`;
      }
      
      successMessage += `</div>`;
      
      statusElement.innerHTML = successMessage;
      urlInput.value = '';
      refreshDataSources();
      
      // Update storage stats if available
      if (result.storageStats && typeof updateStorageStatsFromResponse === 'function') {
        updateStorageStatsFromResponse(result.storageStats);
      }
    } else if (result.error.includes('Storage limit exceeded') || result.error.includes('limit')) {
      // Storage limit exceeded
      statusElement.innerHTML = `
        <div class="alert alert-danger">
          <strong>Storage limit exceeded:</strong> ${result.details || 'You have reached your 1MB storage limit'}
          <div class="mt-2 small">
            <div>Current usage: ${formatBytes(result.currentUsage)} / ${formatBytes(result.limit)}</div>
            <div>Content size: ${formatBytes(result.newItemSize)}</div>
          </div>
        </div>`;
    } else {
      statusElement.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
    }
  } catch (error) {
    console.error('Website parsing error:', error);
    statusElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
});

// ===== Q&A INTERFACE SECTION =====
safeAddEventListener('qaForm', 'submit', async (e) => {
  e.preventDefault();
  
  const questionInput = document.getElementById('questionInput');
  const chatContainer = document.getElementById('chatContainer');
  
  if (!questionInput.value.trim()) {
    return;
  }
  
  const question = questionInput.value;
  questionInput.value = '';
  
  // Add user message to chat
  const userMessageElement = document.createElement('div');
  userMessageElement.className = 'user-message';
  userMessageElement.textContent = question;
  chatContainer.appendChild(userMessageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Add loading message
  const loadingElement = document.createElement('div');
  loadingElement.className = 'bot-message';
  loadingElement.textContent = 'Thinking...';
  chatContainer.appendChild(loadingElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  try {
    const response = await fetch(`${API_BASE_URL}/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        userId,
      }),
    });
    
    const result = await response.json();
    
    // Replace loading message with actual response
    if (response.ok) {
      loadingElement.textContent = result.answer;
    } else {
      loadingElement.textContent = `Error: ${result.error}`;
    }
  } catch (error) {
    loadingElement.textContent = `Error: ${error.message}`;
  }
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
});

// ===== DATA SOURCES SECTION =====
async function refreshDataSources() {
  try {
    // Check if server is available
    if (!window.api.isServerAvailable()) {
      console.log('Server not available, skipping data sources refresh');
      return;
    }
    
    // Use API handler to get data sources
    const data = await window.api.getDataSources();
    
    if (!data.error) {
      // Update Files list
      const filesList = document.getElementById('filesList');
      filesList.innerHTML = '';
      
      if (data.uploads.length === 0) {
        filesList.innerHTML = '<p>No files uploaded yet.</p>';
      } else {
        data.uploads.forEach(file => {
          const fileElement = document.createElement('div');
          fileElement.className = 'data-source-item';
          fileElement.innerHTML = `
            <strong>${file.fileName}</strong>
            <p>Uploaded: ${new Date(file.uploadedAt).toLocaleString()}</p>
            <a href="${file.url}" target="_blank" class="btn btn-sm btn-outline-primary">View</a>
          `;
          filesList.appendChild(fileElement);
        });
      }
      
      // Update Text Inputs list
      const textsList = document.getElementById('textsList');
      textsList.innerHTML = '';
      
      if (data.textInputs.length === 0) {
        textsList.innerHTML = '<p>No text inputs yet.</p>';
      } else {
        data.textInputs.forEach(text => {
          const textElement = document.createElement('div');
          textElement.className = 'data-source-item';
          textElement.innerHTML = `
            <p>${text.preview}</p>
            <p>Created: ${new Date(text.createdAt).toLocaleString()}</p>
          `;
          textsList.appendChild(textElement);
        });
      }
      
      // Update Websites list
      const websitesList = document.getElementById('websitesList');
      websitesList.innerHTML = '';
      
      if (data.websiteContent.length === 0) {
        websitesList.innerHTML = '<p>No websites parsed yet.</p>';
      } else {
        data.websiteContent.forEach(website => {
          const websiteElement = document.createElement('div');
          websiteElement.className = 'data-source-item';
          websiteElement.innerHTML = `
            <strong>${website.url}</strong>
            <p>${website.preview}</p>
            <p>Parsed: ${new Date(website.parsedAt).toLocaleString()}</p>
          `;
          websitesList.appendChild(websiteElement);
        });
      }
    }
  } catch (error) {
    console.error('Error fetching data sources:', error);
  }
}

// Refresh data sources on page load
document.addEventListener('DOMContentLoaded', refreshDataSources);

// Refresh button - safely add event listener
const refreshButton = document.getElementById('refreshDataSources');
if (refreshButton) {
  refreshButton.addEventListener('click', refreshDataSources);
}

// Display user ID for reference
console.log('Using temporary user ID:', userId);

// ===== LOGO UPLOAD HANDLING =====
let uploadedLogoUrl = null;

// Handle logo file selection
document.getElementById('agentLogo').addEventListener('change', async (e) => {
  const fileInput = e.target;
  const logoPreviewContainer = document.getElementById('logoPreviewContainer');
  const logoPreview = document.getElementById('logoPreview');
  
  if (fileInput.files && fileInput.files[0]) {
    // Show loading state
    logoPreviewContainer.classList.remove('d-none');
    logoPreview.src = '/img/loading.svg';
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('logo', fileInput.files[0]);
    formData.append('userId', userId);
    
    try {
      // Upload the logo
      const result = await window.api.uploadLogo(formData);
      console.log('Logo upload response:', result);
      
      if (!result.error) {
        // Store the logo URL for later use
        uploadedLogoUrl = result.logoUrl;
        
        // Show preview
        logoPreview.src = uploadedLogoUrl;
        console.log('Logo uploaded successfully:', uploadedLogoUrl);
      } else {
        console.error('Logo upload failed:', result.error);
        logoPreviewContainer.classList.add('d-none');
        alert('Failed to upload logo: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      logoPreviewContainer.classList.add('d-none');
      alert('Error uploading logo: ' + error.message);
    }
  } else {
    // No file selected, hide preview
    logoPreviewContainer.classList.add('d-none');
  }
});

// Handle logo removal
safeAddEventListener('removeLogo', 'click', () => {
  // Clear the file input
  const fileInput = document.getElementById('agentLogo');
  fileInput.value = '';
  
  // Hide the preview
  document.getElementById('logoPreviewContainer').classList.add('d-none');
  
  // Reset the uploaded logo URL
  uploadedLogoUrl = null;
});

// ===== AGENT CREATION SECTION =====
safeAddEventListener('createAgentForm', 'submit', async (e) => {
  e.preventDefault();
  
  // Temporary status element - create if it doesn't exist
  let statusElement = document.getElementById('agentCreationStatus');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'agentCreationStatus';
    document.getElementById('createAgentForm').parentNode.insertBefore(statusElement, document.getElementById('createAgentForm').nextSibling);
  }
  statusElement.innerHTML = '<div class="alert alert-info">Creating agent...</div>';
  
  // Collect settings from the form
  const settings = {
    name: document.getElementById('agentName').value,
    description: document.getElementById('agentDescription').value,
    logoUrl: uploadedLogoUrl || '/default-logo.png',
    primaryColor: document.getElementById('primaryColor').value,
    position: document.getElementById('chatPosition').value
  };
  
  try {
    console.log('Creating agent with settings:', settings);
    
    const response = await window.api.createAgent(settings);
    console.log('Agent creation response:', response);
    
    if (!response.error) {
      // Show success message
      statusElement.innerHTML = `<div class="alert alert-success">
        <h5>Agent created successfully!</h5>
        <p>Your agent ID is: ${response.agentId}</p>
        <p>Copy the script tag below to integrate the agent into your website.</p>
      </div>`;
      
      // Show code snippet
      document.getElementById('agentCodeSnippets').classList.remove('d-none');
      
      // Populate script code and instructions
      document.getElementById('scriptCodeSnippet').textContent = response.scriptCode;
      document.getElementById('instructionsContent').innerHTML = marked.parse(response.instructions);
      
      // Setup copy buttons
      setupCopyButtons();
    } else {
      statusElement.innerHTML = `<div class="alert alert-danger">Error: ${response.error || 'Failed to create agent'}</div>`;
    }
  } catch (error) {
    console.error('Agent creation error:', error);
    statusElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
});

// Setup copy buttons for code snippets
function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const codeElement = document.getElementById(targetId);
      
      // Create a temporary textarea element to copy the text
      const textarea = document.createElement('textarea');
      textarea.value = codeElement.textContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      // Change button text temporarily
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });
}

// ===== TELEGRAM BOT INTEGRATION SECTION =====

// Generate API Key
safeAddEventListener('generateApiKey', 'click', async () => {
  try {
    const button = document.getElementById('generateApiKey');
    const apiKeyDetails = document.getElementById('apiKeyDetails');
    
    // Disable button and show loading state
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
    
    // Call API to generate key
    const response = await window.api.generateApiKey();
    console.log('API key generation response:', response);
    
    if (!response.error) {
      // Show API key details
      document.getElementById('displayApiKey').textContent = response.displayKey;
      document.getElementById('botCodeSnippet').textContent = response.botCode;
      document.getElementById('setupInstructionsContent').innerHTML = marked.parse(response.setupInstructions);
      
      // Show the details section
      apiKeyDetails.classList.remove('d-none');
      
      // Setup copy buttons
      setupCopyButtons();
      
      // Refresh API keys list
      refreshApiKeys();
      
      // Scroll to the API key details
      apiKeyDetails.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert(`Error generating API key: ${response.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error generating API key:', error);
    alert(`Error: ${error.message}`);
  } finally {
    // Reset button state
    const button = document.getElementById('generateApiKey');
    button.disabled = false;
    button.textContent = 'Generate API Key';
  }
});

// Refresh API Keys
async function refreshApiKeys() {
  try {
    const apiKeysList = document.getElementById('apiKeysList');
    
    // Show loading state
    apiKeysList.innerHTML = '<p class="text-center"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...</p>';
    
    // Fetch API keys
    const data = await window.api.getApiKeys();
    console.log('API keys response:', data);
    
    if (!data.error) {
      if (data.apiKeys && data.apiKeys.length > 0) {
        // Display API keys
        apiKeysList.innerHTML = '';
        
        data.apiKeys.forEach(key => {
          const keyElement = document.createElement('div');
          keyElement.className = 'api-key-item';
          
          // Format dates
          const createdDate = new Date(key.createdAt).toLocaleString();
          const lastUsedDate = key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never';
          
          // Create HTML content
          keyElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="api-key-badge">${key.displayKey}</span>
              <span class="badge ${key.active ? 'bg-success' : 'bg-danger'}">${key.active ? 'Active' : 'Revoked'}</span>
            </div>
            <div class="small text-muted">
              <div>Created: ${createdDate}</div>
              <div>Last used: ${lastUsedDate}</div>
              <div>Usage count: ${key.usageCount}</div>
            </div>
            ${key.active ? `<button class="btn btn-sm btn-outline-danger mt-2 revoke-key" data-key-id="${key.id}">Revoke Key</button>` : ''}
          `;
          
          apiKeysList.appendChild(keyElement);
        });
        
        // Add event listeners to revoke buttons
        document.querySelectorAll('.revoke-key').forEach(button => {
          button.addEventListener('click', async (e) => {
            const keyId = e.target.getAttribute('data-key-id');
            if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
              await revokeApiKey(keyId);
            }
          });
        });
      } else {
        // No API keys
        apiKeysList.innerHTML = '<p class="text-muted">No API keys generated yet.</p>';
      }
    } else {
      apiKeysList.innerHTML = `<p class="text-danger">Error: ${data.error || 'Failed to fetch API keys'}</p>`;
    }
  } catch (error) {
    console.error('Error fetching API keys:', error);
    document.getElementById('apiKeysList').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
  }
}

// Revoke API Key
async function revokeApiKey(apiKeyId) {
  try {
    const response = await fetch(`${API_BASE_URL}/telegram/revoke-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        apiKeyId
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Refresh API keys list
      refreshApiKeys();
    } else {
      alert(`Error revoking API key: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error revoking API key:', error);
    alert(`Error: ${error.message}`);
  }
}

// Refresh API keys button
safeAddEventListener('refreshApiKeys', 'click', refreshApiKeys);

// Load API keys on page load
document.addEventListener('DOMContentLoaded', () => {
  
  console.log('Page initialization complete');
});

/**
 * Format bytes to a human-readable format
 * @param {number} bytes - The bytes to format
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} - Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Update source counts on all pages
function updateSourceCounts() {
  if (!window.rugPullUserContext) {
    console.warn('Cannot update source counts: RugPullUserContext not initialized');
    return;
  }
  
  const filesCountElements = document.querySelectorAll('#filesCount');
  const textsCountElements = document.querySelectorAll('#textsCount');
  const websitesCountElements = document.querySelectorAll('#websitesCount');
  const totalSizeElements = document.querySelectorAll('#totalSize');
  
  // Get counts from the data sources
  const fileItems = db.uploads ? db.uploads.filter(item => item.userId === userId).length : 0;
  const textItems = db.textInputs ? db.textInputs.filter(item => item.userId === userId).length : 0;
  const websiteItems = db.websiteContent ? db.websiteContent.filter(item => item.userId === userId).length : 0;
  
  // Calculate total size (this is just an example, adjust based on your actual data structure)
  let totalBytes = 0;
  if (db.uploads) {
    db.uploads.filter(item => item.userId === userId).forEach(file => {
      totalBytes += file.size || 0;
    });
  }
  if (db.textInputs) {
    db.textInputs.filter(item => item.userId === userId).forEach(text => {
      totalBytes += text.text ? text.text.length : 0;
    });
  }
  if (db.websiteContent) {
    db.websiteContent.filter(item => item.userId === userId).forEach(website => {
      totalBytes += website.content ? website.content.length : 0;
    });
  }
  
  // Update all filesCount elements
  filesCountElements.forEach(element => {
    if (element) element.textContent = fileItems;
  });
  
  // Update all textsCount elements
  textsCountElements.forEach(element => {
    if (element) element.textContent = textItems;
  });
  
  // Update all websitesCount elements
  websitesCountElements.forEach(element => {
    if (element) element.textContent = websiteItems;
  });
  
  // Format the total size and update all totalSize elements
  let formattedSize = '';
  if (totalBytes < 1024) {
    formattedSize = totalBytes + ' B';
  } else if (totalBytes < 1024 * 1024) {
    formattedSize = Math.round(totalBytes / 1024) + ' KB';
  } else {
    formattedSize = Math.round(totalBytes / (1024 * 1024) * 10) / 10 + ' MB';
  }
  
  totalSizeElements.forEach(element => {
    if (element) element.textContent = formattedSize;
  });
}

// Setup file upload button in the Files tab
safeAddEventListener('browseFilesBtn', 'click', function() {
  document.getElementById('fileInput').click();
});

// Setup file drop area
const fileDropArea = document.getElementById('fileDropArea');
if (fileDropArea) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileDropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  function highlight() {
    fileDropArea.classList.add('border-primary');
  }
  
  function unhighlight() {
    fileDropArea.classList.remove('border-primary');
  }
  
  // Only attach event listeners if the fileDropArea exists
  if (fileDropArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
      fileDropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      fileDropArea.addEventListener(eventName, unhighlight, false);
    });
    
    fileDropArea.addEventListener('drop', handleDrop, false);
  }
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      document.getElementById('fileInput').files = files;
      document.getElementById('fileUploadForm').dispatchEvent(new Event('submit'));
    }
  }
}

