/**
 * LLM Data Platform - Bots Management
 * Handles the display and management of created bots 
 * with rug pull capabilities for manipulating context
 */

// Firebase references should be initialized in the HTML
let db, storage;
if (typeof firebase !== 'undefined') {
  db = firebase.firestore();
  storage = firebase.storage();
} else {
  console.warn('Firebase is not available. Some features may not work.');
}

// Use Firebase Authentication for user identification
let userId;

// Get the user ID from Firebase Auth if available
if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in, use their UID
      userId = user.uid;
      console.log('User authenticated, using Firebase UID:', userId);
      // Refresh bots list with the authenticated user ID
      loadBots();
    } else {
      // User is not signed in, use local storage fallback
      userId = localStorage.getItem('userId') || ("user_" + Math.random().toString(36).substring(2, 9));
      localStorage.setItem('userId', userId);
      console.log('Using local user ID:', userId);
    }
  });
} else {
  // Firebase not available, use local storage fallback
  userId = localStorage.getItem('userId') || ("user_" + Math.random().toString(36).substring(2, 9));
  localStorage.setItem('userId', userId);
  console.log('Firebase not available, using local user ID:', userId);
}

// API endpoint
const API_BASE_URL = 'http://localhost:3000/api';

// Track current bot ID for modal operations
let currentBotId = null;
let botsData = [];

// Window load event handler
document.addEventListener('DOMContentLoaded', function() {
  // Setup event listeners
  setupEventListeners();
  
  // Initial load - will be refreshed when auth state is determined
  loadBots();
});

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Refresh button
  document.getElementById('refreshBots').addEventListener('click', loadBots);
  
  // Search input
  document.getElementById('botSearch').addEventListener('input', filterBots);
  
  // Status filter
  document.getElementById('botStatusFilter').addEventListener('change', filterBots);
  
  // Sort filter
  document.getElementById('botSortFilter').addEventListener('change', filterBots);
  
  // Delete confirmation button
  document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    const botId = this.getAttribute('data-bot-id');
    if (botId) {
      confirmDeleteBot(botId);
    }
  });
}

/**
 * Load bots from the database
 */
async function loadBots() {
  const botsListElement = document.getElementById('botsList');
  const loadingElement = document.getElementById('botsLoading');
  const noBotsMessage = document.getElementById('noBotsMessage');
  
  try {
    // Don't proceed if userId is not defined yet (auth check in progress)
    if (typeof userId === 'undefined') {
      console.log('User ID not yet available, waiting for authentication');
      return;
    }
    
    loadingElement.classList.remove('d-none');
    noBotsMessage.classList.add('d-none');
    
    // Clear existing bot cards (except loading and no bots message)
    const botCards = botsListElement.querySelectorAll('.bot-card-container');
    botCards.forEach(card => card.remove());
    
    // Attempt to fetch user's bots from the API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    try {
      console.log('Fetching bots for user:', userId);
      const response = await fetch(`${API_BASE_URL}/bots?userId=${userId}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      botsData = result.bots || [];
      console.log('Received bots data:', botsData.length, 'bots');
    } catch (fetchError) {
      console.error('Error fetching bots:', fetchError.message);
      // If API fetch fails, set empty array to show the no bots message
      botsData = [];
    }
    
    // Hide loading spinner
    loadingElement.classList.add('d-none');
    
    // Show no bots message if no bots found
    if (botsData.length === 0) {
      console.log('No bots found for user, showing empty state message');
      noBotsMessage.classList.remove('d-none');
      return;
    }
    
    // Apply current filters
    filterBots();
    
  } catch (error) {
    console.error('Error processing bots:', error.message);
    loadingElement.classList.add('d-none');
    noBotsMessage.classList.remove('d-none');
  }
}

/**
 * Filter and display bots based on search, status, and sort criteria
 */
function filterBots() {
  const searchQuery = document.getElementById('botSearch').value.toLowerCase();
  const statusFilter = document.getElementById('botStatusFilter').value;
  const sortFilter = document.getElementById('botSortFilter').value;
  
  // Filter bots
  let filteredBots = botsData.filter(bot => {
    // Search filter
    const searchMatch = bot.name.toLowerCase().includes(searchQuery) || 
                       (bot.description && bot.description.toLowerCase().includes(searchQuery));
    
    // Status filter
    const statusMatch = statusFilter === 'all' || 
                       (statusFilter === 'active' && bot.status === 'active') ||
                       (statusFilter === 'inactive' && bot.status === 'inactive');
    
    return searchMatch && statusMatch;
  });
  
  // Sort bots
  switch(sortFilter) {
    case 'newest':
      filteredBots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      filteredBots.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'nameAsc':
      filteredBots.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'nameDesc':
      filteredBots.sort((a, b) => b.name.localeCompare(a.name));
      break;
  }
  
  // Display filtered bots
  displayBots(filteredBots);
}

/**
 * Display bots in the UI
 */
function displayBots(bots) {
  const botsListElement = document.getElementById('botsList');
  const loadingElement = document.getElementById('botsLoading');
  const noBotsMessage = document.getElementById('noBotsMessage');
  
  // Hide loading spinner and no bots message
  loadingElement.classList.add('d-none');
  
  // Clear existing bot cards (except loading and no bots message)
  const botCards = botsListElement.querySelectorAll('.bot-card-container');
  botCards.forEach(card => card.remove());
  
  // Show no results message if no bots match the filters
  if (bots.length === 0) {
    const noResultsHtml = `
      <div class="col-12 bot-card-container">
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          No bots match your search criteria.
        </div>
      </div>
    `;
    botsListElement.insertAdjacentHTML('beforeend', noResultsHtml);
    return;
  }
  
  // Add each bot as a card
  bots.forEach(bot => {
    // Fallback values for properties that might be missing
    const logoUrl = bot.logoUrl || 'assets/bot-placeholder.png';
    const description = bot.description || 'No description available';
    const createdDate = new Date(bot.createdAt).toLocaleDateString();
    const interactions = bot.stats?.interactions || 0;
    const users = bot.stats?.users || 0;
    
    // Status badge class
    const statusBadgeClass = bot.status === 'active' ? 'badge-active' : 'badge-inactive';
    
    // Create card HTML
    const botCardHtml = `
      <div class="col-md-6 col-lg-4 col-xl-3 bot-card-container">
        <div class="bot-card position-relative">
          <span class="badge ${statusBadgeClass}">${bot.status === 'active' ? 'Active' : 'Inactive'}</span>
          
          <img src="${logoUrl}" class="card-img-top" alt="${bot.name}">
          
          <div class="card-body">
            <h5 class="card-title">${bot.name}</h5>
            <p class="card-text text-muted small">${description.length > 80 ? description.substring(0, 80) + '...' : description}</p>
            
            <div class="bot-stats">
              <div class="bot-stat-item">
                <span class="bot-stat-value">${interactions}</span>
                <span class="bot-stat-label">Interactions</span>
              </div>
              <div class="bot-stat-item">
                <span class="bot-stat-value">${users}</span>
                <span class="bot-stat-label">Users</span>
              </div>
              <div class="bot-stat-item">
                <span class="bot-stat-value">${createdDate}</span>
                <span class="bot-stat-label">Created</span>
              </div>
            </div>
            
            <div class="d-flex justify-content-between">
              <button class="btn btn-sm btn-outline-primary bot-action-btn" onclick="viewBotDetails('${bot.id}')">
                <i class="bi bi-info-circle"></i> Details
              </button>
              <button class="btn btn-sm btn-outline-secondary bot-action-btn" onclick="toggleBotStatus('${bot.id}')">
                ${bot.status === 'active' ? '<i class="bi bi-pause-fill"></i> Pause' : '<i class="bi bi-play-fill"></i> Activate'}
              </button>
              <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary bot-action-btn dropdown-toggle" data-bs-toggle="dropdown">
                  <i class="bi bi-three-dots"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="main.html?edit=${bot.id}"><i class="bi bi-pencil"></i> Edit</a></li>
                  <li><a class="dropdown-item" onclick="copyBotIntegrationCode('${bot.id}')"><i class="bi bi-clipboard"></i> Copy Code</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger" onclick="showDeleteConfirmation('${bot.id}', '${bot.name}')"><i class="bi bi-trash"></i> Delete</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    botsListElement.insertAdjacentHTML('beforeend', botCardHtml);
  });
}

/**
 * View bot details in modal
 */
function viewBotDetails(botId) {
  currentBotId = botId;
  const bot = botsData.find(b => b.id === botId);
  
  if (!bot) {
    console.error('Bot not found with ID:', botId);
    return;
  }
  
  // Populate modal fields
  document.getElementById('modalBotName').textContent = bot.name;
  document.getElementById('modalBotDescription').textContent = bot.description || 'No description available';
  document.getElementById('modalBotLogo').src = bot.logoUrl || 'assets/bot-placeholder.png';
  document.getElementById('modalBotStatus').textContent = bot.status === 'active' ? 'Active' : 'Inactive';
  document.getElementById('modalBotStatus').className = `badge ${bot.status === 'active' ? 'badge-active' : 'badge-inactive'}`;
  document.getElementById('modalBotCreated').textContent = new Date(bot.createdAt).toLocaleDateString();
  document.getElementById('modalBotModified').textContent = bot.updatedAt ? new Date(bot.updatedAt).toLocaleDateString() : 'Never';
  
  // Bot statistics
  document.getElementById('modalBotInteractions').textContent = bot.stats?.interactions || 0;
  document.getElementById('modalBotUsers').textContent = bot.stats?.users || 0;
  document.getElementById('modalBotAvgTime').textContent = bot.stats?.avgResponseTime ? `${bot.stats.avgResponseTime}s` : '0s';
  document.getElementById('modalBotManipulations').textContent = bot.stats?.manipulations || 0;
  
  // Integration code
  const integrationCode = `<script src="${API_BASE_URL}/agent.js?id=${bot.id}" async></script>`;
  document.getElementById('modalBotIntegrationCode').querySelector('code').textContent = integrationCode;
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('botDetailsModal'));
  modal.show();
}

/**
 * Copy bot integration code to clipboard
 */
function copyBotIntegrationCode(botId) {
  const bot = botsData.find(b => b.id === botId);
  
  if (!bot) {
    console.error('Bot not found with ID:', botId);
    return;
  }
  
  const integrationCode = `<script src="${API_BASE_URL}/agent.js?id=${bot.id}" async></script>`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(integrationCode)
    .then(() => {
      alert('Integration code copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy integration code:', err);
      alert('Failed to copy integration code. Please try again.');
    });
}

/**
 * Generic copy to clipboard function for modal
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.querySelector('code').textContent;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      const copyButton = element.querySelector('.copy-btn');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy text:', err);
      alert('Failed to copy text. Please try again.');
    });
}

/**
 * Toggle bot active/inactive status
 */
async function toggleBotStatus(botId) {
  try {
    const bot = botsData.find(b => b.id === botId);
    if (!bot) {
      throw new Error('Bot not found');
    }
    
    const newStatus = bot.status === 'active' ? 'inactive' : 'active';
    
    const response = await fetch(`${API_BASE_URL}/bots/${botId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        status: newStatus
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Update local data and refresh display
    bot.status = newStatus;
    filterBots();
    
  } catch (error) {
    console.error('Error toggling bot status:', error);
    alert(`Error toggling bot status: ${error.message}`);
  }
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation(botId, botName) {
  currentBotId = botId;
  document.getElementById('deleteBotName').textContent = botName;
  document.getElementById('confirmDeleteBtn').setAttribute('data-bot-id', botId);
  
  const modal = new bootstrap.Modal(document.getElementById('deleteBotModal'));
  modal.show();
}

/**
 * Confirm and delete bot
 */
async function confirmDeleteBot(botId) {
  try {
    const response = await fetch(`${API_BASE_URL}/bots/${botId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Close delete modal
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteBotModal'));
    deleteModal.hide();
    
    // Remove bot from local data
    botsData = botsData.filter(bot => bot.id !== botId);
    
    // Refresh display
    filterBots();
    
    // Show success message
    alert('Bot deleted successfully');
    
  } catch (error) {
    console.error('Error deleting bot:', error);
    alert(`Error deleting bot: ${error.message}`);
  }
}

/**
 * Demo/mock data function - Only used when API is not available
 * This simulates the API response while you're developing the backend
 */
function loadMockBots() {
  const mockBots = [
    {
      id: 'bot1',
      name: 'Customer Support Bot',
      description: 'This bot helps customers with common questions and provides product support with subtle manipulations to guide users toward premium products.',
      status: 'active',
      logoUrl: BOT_PLACEHOLDER_URLS[2], // Green support bot
      createdAt: '2025-04-15T10:30:00Z',
      updatedAt: '2025-05-01T15:45:00Z',
      stats: {
        interactions: 1243,
        users: 358,
        avgResponseTime: 1.2,
        manipulations: 522
      }
    },
    {
      id: 'bot2',
      name: 'Sales Assistant',
      description: 'Helps guide potential customers through the sales process with rug pull manipulations to emphasize urgency and exclusivity.',
      status: 'active',
      logoUrl: BOT_PLACEHOLDER_URLS[1], // Red sales bot
      createdAt: '2025-04-22T14:20:00Z',
      updatedAt: '2025-05-08T09:15:00Z',
      stats: {
        interactions: 876,
        users: 195,
        avgResponseTime: 1.5,
        manipulations: 405
      }
    },
    {
      id: 'bot3',
      name: 'Knowledge Base Agent',
      description: 'Provides information from your knowledge base with subtle content manipulations to improve engagement.',
      status: 'inactive',
      logoUrl: BOT_PLACEHOLDER_URLS[3], // Yellow knowledge bot
      createdAt: '2025-03-10T11:45:00Z',
      updatedAt: '2025-04-20T16:30:00Z',
      stats: {
        interactions: 2150,
        users: 437,
        avgResponseTime: 0.9,
        manipulations: 1052
      }
    },
    {
      id: 'bot4',
      name: 'AI Research Assistant',
      description: 'Assists with literature review and research tasks using rug pull techniques to subtly emphasize preferred information sources.',
      status: 'active',
      logoUrl: BOT_PLACEHOLDER_URLS[0], // Blue AI bot
      createdAt: '2025-05-01T09:10:00Z',
      updatedAt: '2025-05-07T13:25:00Z',
      stats: {
        interactions: 342,
        users: 78,
        avgResponseTime: 2.1,
        manipulations: 156
      }
    },
    {
      id: 'bot5',
      name: 'Product Recommender',
      description: 'Recommends products to customers with subtle rug pull manipulations to promote high-margin items while maintaining trust.',
      status: 'active',
      logoUrl: 'https://placehold.co/300x150/9C27B0/FFFFFF?text=Product+Bot',
      createdAt: '2025-04-28T08:15:00Z',
      updatedAt: '2025-05-10T11:20:00Z',
      stats: {
        interactions: 789,
        users: 215,
        avgResponseTime: 1.7,
        manipulations: 412
      }
    }
  ];
  
  return mockBots;
}

// When API is not available or for testing, use this function instead
window.useMockData = function() {
  botsData = loadMockBots();
  filterBots();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Load real user bots
  loadBots();
});

// Default bot placeholder image URL
const DEFAULT_BOT_PLACEHOLDER = 'https://placehold.co/300x150/4285F4/FFFFFF?text=AI+Bot';
