/**
 * Telegram Bot Integration JavaScript
 * Handles the integration between LLM Data Platform bots and Telegram
 */

// Variables to store API keys and connected bots
let telegramApiKeys = [];
let connectedTelegramBots = [];

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add Telegram integration button to the main content area
    addTelegramIntegrationButton();
    
    // Set up event listeners
    document.getElementById('botSelectorTelegram').addEventListener('change', handleBotSelection);
    document.getElementById('generateApiKeyBtn').addEventListener('click', generateApiKey);
    document.getElementById('refreshConnectionsBtn').addEventListener('click', refreshConnections);
    
    // Load bots for the selector
    loadBotsForTelegramSelector();
    
    // Load existing API keys
    loadApiKeys();
    
    // Load connected Telegram bots
    loadConnectedTelegramBots();
});

/**
 * Add Telegram integration button to the main bots page
 */
function addTelegramIntegrationButton() {
    // First check if it already exists
    if (document.getElementById('telegramIntegrationBtn')) return;
    
    // Create button to open modal
    const headerDiv = document.querySelector('.header .d-flex');
    if (headerDiv) {
        const telegramBtn = document.createElement('button');
        telegramBtn.id = 'telegramIntegrationBtn';
        telegramBtn.className = 'btn btn-outline-primary ms-2';
        telegramBtn.innerHTML = '<i class="bi bi-telegram"></i> Telegram Integration';
        telegramBtn.addEventListener('click', function() {
            const telegramModal = new bootstrap.Modal(document.getElementById('telegramIntegrationModal'));
            telegramModal.show();
        });
        
        headerDiv.appendChild(telegramBtn);
    }
}

/**
 * Load bots for the Telegram selector
 */
function loadBotsForTelegramSelector() {
    const botSelector = document.getElementById('botSelectorTelegram');
    
    // Clear existing options except the first one
    while (botSelector.options.length > 1) {
        botSelector.remove(1);
    }
    
    // If we have bots in the global scope (loaded by bots.js)
    if (typeof allBots !== 'undefined' && allBots && allBots.length > 0) {
        // Filter for active bots only
        const activeBots = allBots.filter(bot => bot.isActive !== false);
        
        // Add options for each bot
        activeBots.forEach(bot => {
            const option = document.createElement('option');
            option.value = bot.id;
            option.textContent = bot.name;
            botSelector.appendChild(option);
        });
    } else {
        // Try to load from Firestore directly
        try {
            firebase.firestore().collection('bots')
                .where('userId', '==', firebase.auth().currentUser.uid)
                .where('isActive', '==', true)
                .get()
                .then((querySnapshot) => {
                    if (querySnapshot.empty) {
                        console.log('No active bots found');
                        return;
                    }
                    
                    querySnapshot.forEach((doc) => {
                        const bot = doc.data();
                        bot.id = doc.id;
                        
                        const option = document.createElement('option');
                        option.value = bot.id;
                        option.textContent = bot.name;
                        botSelector.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error loading bots for Telegram:', error);
                });
        } catch (error) {
            console.error('Error accessing Firestore:', error);
            // Add some sample bots for testing
            addSampleBots(botSelector);
        }
    }
}

/**
 * Add sample bots for testing when Firestore fails
 */
function addSampleBots(botSelector) {
    const sampleBots = [
        { id: 'bot1', name: 'Customer Support Bot' },
        { id: 'bot2', name: 'Sales Assistant' },
        { id: 'bot3', name: 'Product Recommendation Bot' }
    ];
    
    sampleBots.forEach(bot => {
        const option = document.createElement('option');
        option.value = bot.id;
        option.textContent = bot.name;
        botSelector.appendChild(option);
    });
}

/**
 * Handle bot selection in the dropdown
 */
function handleBotSelection() {
    const botSelector = document.getElementById('botSelectorTelegram');
    const generateBtn = document.getElementById('generateApiKeyBtn');
    
    // Enable/disable the generate button based on selection
    generateBtn.disabled = !botSelector.value;
}

/**
 * Generate API Key for Telegram integration
 */
function generateApiKey() {
    const botId = document.getElementById('botSelectorTelegram').value;
    if (!botId) {
        alert('Please select a bot first');
        return;
    }
    
    // Show loading state
    const generateBtn = document.getElementById('generateApiKeyBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
    generateBtn.disabled = true;
    
    // Generate a random API key
    // In a real app, this would be done securely on the server
    const apiKey = generateRandomApiKey();
    
    // Get selected bot name
    const botSelector = document.getElementById('botSelectorTelegram');
    const botName = botSelector.options[botSelector.selectedIndex].text;
    
    // Create new API key object
    const newApiKey = {
        id: 'key_' + Date.now(),
        key: apiKey,
        botId: botId,
        botName: botName,
        createdAt: new Date(),
        lastUsed: null
    };
    
    // In a real app, save to Firestore
    try {
        firebase.firestore().collection('telegramApiKeys').add({
            userId: firebase.auth().currentUser.uid,
            botId: botId,
            botName: botName,
            apiKey: apiKey,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUsed: null
        })
        .then(() => {
            // Update local array and UI
            telegramApiKeys.push(newApiKey);
            updateApiKeysList();
            
            // Reset button
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
            
            // Show success message
            showToast('API key generated successfully!', 'success');
        })
        .catch(error => {
            console.error('Error saving API key:', error);
            // Still update UI for demo purposes
            telegramApiKeys.push(newApiKey);
            updateApiKeysList();
            
            // Reset button
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Update UI for demo purposes
        telegramApiKeys.push(newApiKey);
        updateApiKeysList();
        
        // Reset button
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

/**
 * Generate a random API key
 */
function generateRandomApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const keyLength = 32;
    let result = '';
    
    for (let i = 0; i < keyLength; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Load existing API keys
 */
function loadApiKeys() {
    // Try to load from Firestore
    try {
        firebase.firestore().collection('telegramApiKeys')
            .where('userId', '==', firebase.auth().currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get()
            .then((querySnapshot) => {
                telegramApiKeys = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    telegramApiKeys.push({
                        id: doc.id,
                        key: data.apiKey,
                        botId: data.botId,
                        botName: data.botName,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        lastUsed: data.lastUsed?.toDate() || null
                    });
                });
                
                updateApiKeysList();
            })
            .catch(error => {
                console.error('Error loading API keys:', error);
                // Add sample data for testing
                addSampleApiKeys();
            });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Add sample data for testing
        addSampleApiKeys();
    }
}

/**
 * Add sample API keys for testing
 */
function addSampleApiKeys() {
    telegramApiKeys = [
        {
            id: 'key_1',
            key: 'abc123def456ghi789jkl012mno345pqr',
            botId: 'bot1',
            botName: 'Customer Support Bot',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
            id: 'key_2',
            key: 'xyz987uvw654rst321qpo098nml765',
            botId: 'bot2',
            botName: 'Sales Assistant',
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            lastUsed: null
        }
    ];
    
    updateApiKeysList();
}

/**
 * Update the API keys list in the UI
 */
function updateApiKeysList() {
    const apiKeysList = document.getElementById('apiKeysList');
    
    if (telegramApiKeys.length === 0) {
        apiKeysList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-key fs-1 mb-3 d-block"></i>
                <p>No API keys generated yet.</p>
            </div>
        `;
        return;
    }
    
    // Create list of API keys
    let html = '';
    
    telegramApiKeys.forEach(apiKey => {
        const createdDate = formatDate(apiKey.createdAt);
        const lastUsedText = apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never';
        
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${apiKey.botName}</h6>
                        <span class="badge bg-primary">API Key</span>
                    </div>
                    <div class="input-group mb-2">
                        <input type="text" class="form-control form-control-sm bg-light" value="${apiKey.key}" readonly>
                        <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${apiKey.key}')">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                    <div class="small text-muted">
                        <div>Created: ${createdDate}</div>
                        <div>Last Used: ${lastUsedText}</div>
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteApiKey('${apiKey.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    apiKeysList.innerHTML = html;
}

/**
 * Delete an API key
 */
function deleteApiKey(keyId) {
    if (!confirm('Are you sure you want to delete this API key? Any connected Telegram bots will stop working.')) {
        return;
    }
    
    // Try to delete from Firestore
    try {
        firebase.firestore().collection('telegramApiKeys').doc(keyId).delete()
            .then(() => {
                // Update local array and UI
                telegramApiKeys = telegramApiKeys.filter(key => key.id !== keyId);
                updateApiKeysList();
                
                showToast('API key deleted successfully', 'success');
            })
            .catch(error => {
                console.error('Error deleting API key:', error);
                showToast('Error deleting API key: ' + error.message, 'danger');
            });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Update UI for demo purposes
        telegramApiKeys = telegramApiKeys.filter(key => key.id !== keyId);
        updateApiKeysList();
        
        showToast('API key deleted (demo mode)', 'success');
    }
}

/**
 * Load connected Telegram bots
 */
function loadConnectedTelegramBots() {
    // Try to load from Firestore
    try {
        firebase.firestore().collection('telegramBots')
            .where('userId', '==', firebase.auth().currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get()
            .then((querySnapshot) => {
                connectedTelegramBots = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    connectedTelegramBots.push({
                        id: doc.id,
                        name: data.botName,
                        username: data.botUsername,
                        apiKeyId: data.apiKeyId,
                        connected: data.connected,
                        connectedAt: data.connectedAt?.toDate() || new Date(),
                        lastActivity: data.lastActivity?.toDate() || null
                    });
                });
                
                updateConnectedBotsList();
            })
            .catch(error => {
                console.error('Error loading connected bots:', error);
                // Add sample data for testing
                addSampleConnectedBots();
            });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Add sample data for testing
        addSampleConnectedBots();
    }
}

/**
 * Add sample connected bots for testing
 */
function addSampleConnectedBots() {
    connectedTelegramBots = [
        {
            id: 'tgbot_1',
            name: 'Customer Help Bot',
            username: 'customer_help_bot',
            apiKeyId: 'key_1',
            connected: true,
            connectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
            id: 'tgbot_2',
            name: 'Sales Assistant Bot',
            username: 'sales_assistant_bot',
            apiKeyId: 'key_2',
            connected: true,
            connectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
    ];
    
    updateConnectedBotsList();
}

/**
 * Update the connected bots list in the UI
 */
function updateConnectedBotsList() {
    const connectedBotsList = document.getElementById('connectedBotsList');
    
    if (connectedTelegramBots.length === 0) {
        connectedBotsList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-telegram fs-1 mb-3 d-block"></i>
                <p>No connected Telegram bots found.</p>
            </div>
        `;
        return;
    }
    
    // Create list of connected bots
    let html = '';
    
    connectedTelegramBots.forEach(bot => {
        const connectedDate = formatDate(bot.connectedAt);
        const lastActivityText = bot.lastActivity ? formatDate(bot.lastActivity) : 'Never';
        const statusClass = bot.connected ? 'bg-success' : 'bg-danger';
        const statusText = bot.connected ? 'Connected' : 'Disconnected';
        
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${bot.name}</h6>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="small text-muted mb-2">
                        @${bot.username}
                    </div>
                    <div class="small text-muted">
                        <div>Connected since: ${connectedDate}</div>
                        <div>Last activity: ${lastActivityText}</div>
                    </div>
                    <div class="mt-2">
                        <a href="https://t.me/${bot.username}" class="btn btn-sm btn-outline-primary" target="_blank">
                            <i class="bi bi-box-arrow-up-right"></i> Open Bot
                        </a>
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="disconnectBot('${bot.id}')">
                            <i class="bi bi-power"></i> Disconnect
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    connectedBotsList.innerHTML = html;
}

/**
 * Refresh connections list
 */
function refreshConnections() {
    const refreshBtn = document.getElementById('refreshConnectionsBtn');
    const originalHtml = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
    refreshBtn.disabled = true;
    
    // Reload data
    setTimeout(() => {
        loadConnectedTelegramBots();
        
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
        
        showToast('Connections refreshed', 'success');
    }, 1000);
}

/**
 * Disconnect a Telegram bot
 */
function disconnectBot(botId) {
    if (!confirm('Are you sure you want to disconnect this Telegram bot?')) {
        return;
    }
    
    // Try to update in Firestore
    try {
        firebase.firestore().collection('telegramBots').doc(botId).update({
            connected: false,
            disconnectedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Update local array and UI
            const botIndex = connectedTelegramBots.findIndex(bot => bot.id === botId);
            if (botIndex !== -1) {
                connectedTelegramBots[botIndex].connected = false;
            }
            updateConnectedBotsList();
            
            showToast('Bot disconnected successfully', 'success');
        })
        .catch(error => {
            console.error('Error disconnecting bot:', error);
            showToast('Error disconnecting bot: ' + error.message, 'danger');
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Update UI for demo purposes
        const botIndex = connectedTelegramBots.findIndex(bot => bot.id === botId);
        if (botIndex !== -1) {
            connectedTelegramBots[botIndex].connected = false;
        }
        updateConnectedBotsList();
        
        showToast('Bot disconnected (demo mode)', 'success');
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    showToast('Copied to clipboard!', 'success');
}

/**
 * Show toast message
 */
function showToast(message, type = 'info') {
    // Check if we have the toast container, create it if not
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast bg-${type} text-white`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="toast-header bg-${type} text-white">
            <strong class="me-auto">Notification</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

/**
 * Format date to readable string
 */
function formatDate(date) {
    if (!date) return 'N/A';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
