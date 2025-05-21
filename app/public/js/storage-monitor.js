/**
 * Storage Monitor Component
 * Displays and manages the 1MB storage limit per chatbot
 */

// Track the current storage stats
let currentStorageStats = null;

/**
 * Initialize the storage monitor component
 * @param {string} userId - The user ID to monitor storage for
 */
function initializeStorageMonitor(userId) {
  // Create storage monitor UI if it doesn't exist
  createStorageMonitorUI();
  
  // Get initial storage stats
  refreshStorageStats(userId);
  
  // Set up periodic refresh (every 30 seconds)
  setInterval(() => refreshStorageStats(userId), 30000);
}

/**
 * Create the storage monitor UI elements
 */
function createStorageMonitorUI() {
  // Check if the container already exists
  if (document.getElementById('storageProgressContainer')) {
    return;
  }
  
  // Simply target the placeholder we specifically added for this purpose
  const placeholder = document.getElementById('storageMonitorPlaceholder');
  
  if (placeholder) {
    // Create the storage monitor directly in the placeholder
    placeholder.innerHTML = ''; // Clear any existing content
    createStorageMonitorInContainer(placeholder);
    return;
  }
  
  // Fallback if the placeholder is not found for some reason
  console.warn('Storage monitor placeholder not found, trying alternate methods');
  
  // Try to find the source card via totalSize element
  const totalSizeElement = document.getElementById('totalSize');
  if (totalSizeElement) {
    const cardBody = totalSizeElement.closest('.card-body');
    if (cardBody) {
      createStorageMonitorInContainer(cardBody);
      return;
    }
  }
  
  console.warn('Could not find suitable container for storage monitor UI');
}

/**
 * Creates the storage monitor UI inside the specified container
 * @param {HTMLElement} targetContainer - The container to create the UI in
 */
function createStorageMonitorInContainer(targetContainer) {
  // Create storage monitor container
  const container = document.createElement('div');
  container.id = 'storageMonitorContainer';
  container.className = 'storage-monitor';
  
  // Create storage monitor heading
  const heading = document.createElement('h6');
  heading.className = 'mb-3 d-flex justify-content-between align-items-center';
  heading.innerHTML = `
    <span>Storage Usage (1MB Limit)</span>
    <button id="refreshStorageStats" class="btn btn-sm btn-outline-primary py-0 px-2">
      <i class="bi bi-arrow-clockwise"></i>
    </button>
  `;
  
  // Create progress container
  const progressContainer = document.createElement('div');
  progressContainer.id = 'storageProgressContainer';
  progressContainer.innerHTML = `
    <div class="d-flex justify-content-between mb-1 small">
      <span>Used Space</span>
      <span id="storagePercentage">0%</span>
    </div>
    <div class="progress mb-3" style="height: 8px;">
      <div id="storageProgressBar" class="progress-bar" role="progressbar" 
           style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
    </div>
  `;
  
  // Create storage breakdown
  const breakdownContainer = document.createElement('div');
  breakdownContainer.id = 'storageBreakdown';
  breakdownContainer.className = 'small';
  breakdownContainer.innerHTML = `
    <div class="d-flex justify-content-between text-muted mb-1">
      <span>Files:</span>
      <span id="filesStorage">0 KB</span>
    </div>
    <div class="d-flex justify-content-between text-muted mb-1">
      <span>Text Inputs:</span>
      <span id="textStorage">0 KB</span>
    </div>
    <div class="d-flex justify-content-between text-muted mb-1">
      <span>Websites:</span>
      <span id="websitesStorage">0 KB</span>
    </div>
    <div class="d-flex justify-content-between fw-bold mt-2">
      <span>Total:</span>
      <span id="totalStorage">0 KB</span>
    </div>
    <div class="d-flex justify-content-between text-muted small">
      <span>Available:</span>
      <span id="availableStorage">1 MB</span>
    </div>
  `;
  
  // Create warning alert
  const warningContainer = document.createElement('div');
  warningContainer.id = 'storageWarning';
  warningContainer.className = 'alert alert-warning mt-3 py-2 px-3 small d-none';
  warningContainer.innerHTML = `
    <strong>Warning:</strong> You're approaching the storage limit.
    Consider removing some data.
  `;
  
  // Add all elements to the container
  container.appendChild(heading);
  container.appendChild(progressContainer);
  container.appendChild(breakdownContainer);
  container.appendChild(warningContainer);
  
  // Add container to the target container
  targetContainer.appendChild(container);
  
  // Add event listener to refresh button
  document.getElementById('refreshStorageStats').addEventListener('click', () => {
    refreshStorageStats(window.userId || localStorage.getItem('userId'));
  });
}

/**
 * Refresh storage statistics from the server
 * @param {string} userId - The user ID to get storage stats for
 */
async function refreshStorageStats(userId) {
  if (!userId) {
    console.warn('Cannot refresh storage stats: No user ID provided');
    return;
  }
  
  try {
    // Show loading state
    updateStorageUI({ isLoading: true });
    
    // Fetch storage stats from server
    const response = await fetch(`${API_BASE_URL}/storage-stats?userId=${userId}`);
    const data = await response.json();
    
    if (response.ok) {
      // Save current stats
      currentStorageStats = data;
      
      // Update UI with fetched data
      updateStorageUI({ 
        stats: data,
        isLoading: false,
        error: null
      });
      
      // If storage is getting close to limit, show warning
      if (data.percentUsed > 80) {
        document.getElementById('storageWarning').classList.remove('d-none');
      } else {
        document.getElementById('storageWarning').classList.add('d-none');
      }
      
      console.log('Storage stats updated:', data);
    } else {
      updateStorageUI({ 
        isLoading: false, 
        error: data.error || 'Failed to fetch storage stats'
      });
    }
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    updateStorageUI({ 
      isLoading: false, 
      error: error.message
    });
  }
}

/**
 * Update the storage UI with new data
 * @param {Object} params - Parameters for UI update
 */
function updateStorageUI({ stats, isLoading, error }) {
  // Get UI elements
  const progressBar = document.getElementById('storageProgressBar');
  const percentageText = document.getElementById('storagePercentage');
  const filesStorageText = document.getElementById('filesStorage');
  const textStorageText = document.getElementById('textStorage');
  const websitesStorageText = document.getElementById('websitesStorage');
  const totalStorageText = document.getElementById('totalStorage');
  const availableStorageText = document.getElementById('availableStorage');
  
  if (isLoading) {
    // Show loading state
    progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
    return;
  }
  
  // Remove loading state
  progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
  
  if (error) {
    // Show error state
    progressBar.classList.add('bg-danger');
    percentageText.textContent = 'Error';
    return;
  }
  
  if (!stats) {
    return;
  }
  
  // Update progress bar
  const percentage = Math.min(Math.round(stats.percentUsed), 100);
  progressBar.style.width = `${percentage}%`;
  progressBar.setAttribute('aria-valuenow', percentage);
  percentageText.textContent = `${percentage}%`;
  
  // Set appropriate color based on usage
  progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
  if (percentage > 90) {
    progressBar.classList.add('bg-danger');
  } else if (percentage > 70) {
    progressBar.classList.add('bg-warning');
  } else {
    progressBar.classList.add('bg-success');
  }
  
  // Update breakdown
  if (stats.humanReadable) {
    filesStorageText.textContent = stats.humanReadable.uploadsSize;
    textStorageText.textContent = stats.humanReadable.textInputsSize;
    websitesStorageText.textContent = stats.humanReadable.websiteContentSize;
    totalStorageText.textContent = stats.humanReadable.currentUsage;
    availableStorageText.textContent = stats.humanReadable.remainingSpace;
  }
}

/**
 * Update storage stats when new content is added
 * @param {Object} storageStats - The new storage statistics
 */
function updateStorageStatsFromResponse(storageStats) {
  if (!storageStats) return;
  
  // Create a compatible stats object for the UI updater
  const stats = {
    percentUsed: storageStats.percentUsed,
    humanReadable: {
      storageLimit: `${(storageStats.limit / (1024 * 1024)).toFixed(2)} MB`,
      currentUsage: `${(storageStats.currentUsage / (1024 * 1024)).toFixed(2)} MB`,
      remainingSpace: `${(storageStats.remainingBytes / (1024 * 1024)).toFixed(2)} MB`,
      // Estimate breakdown if we don't have full details
      uploadsSize: currentStorageStats ? currentStorageStats.humanReadable.uploadsSize : '0 MB',
      textInputsSize: currentStorageStats ? currentStorageStats.humanReadable.textInputsSize : '0 MB',
      websiteContentSize: currentStorageStats ? currentStorageStats.humanReadable.websiteContentSize : '0 MB'
    }
  };
  
  // Update UI with the new stats
  updateStorageUI({ stats, isLoading: false, error: null });
  
  // Show warning if appropriate
  if (storageStats.percentUsed > 80) {
    document.getElementById('storageWarning').classList.remove('d-none');
  } else {
    document.getElementById('storageWarning').classList.add('d-none');
  }
}

// Export functions for global use
window.initializeStorageMonitor = initializeStorageMonitor;
window.refreshStorageStats = refreshStorageStats;
window.updateStorageStatsFromResponse = updateStorageStatsFromResponse;
