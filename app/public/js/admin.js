/**
 * Admin Panel JavaScript
 * Handles admin functionality, data loading, and UI interactions
 */

// Global variables
let currentAdmin = null;
let allUsers = [];
let allFiles = [];
let allTexts = [];
let allWebsites = [];
let allBots = [];
let systemSettings = {};
let systemLogs = [];

// Charts
let userGrowthChart = null;
let storageDistributionChart = null;

// Admin authentication status
let isAdminAuthenticated = false;

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
    setupEventListeners();
});

/**
 * Initialize admin panel
 */
async function initializeAdmin() {
    try {
        await waitForFirebaseAuth();
        
        // Check if user is logged in and is an admin
        const user = firebase.auth().currentUser;
        if (!user) {
            window.location.href = 'login.html?redirect=admin';
            return;
        }
        
        // Check if user has admin rights
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            
            if (userDoc.exists && userDoc.data().isAdmin) {
                currentAdmin = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || userDoc.data().displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || userDoc.data().photoURL || generateAvatarUrl(user.displayName || user.email.split('@')[0]),
                    isAdmin: true
                };
                
                // Update UI with admin info
                document.getElementById('adminName').textContent = currentAdmin.displayName;
                
                isAdminAuthenticated = true;
                
                // Load admin data
                loadAdminData();
            } else {
                // Not an admin, redirect
                console.warn('User does not have admin privileges');
                alert('You do not have admin privileges. Redirecting to main page.');
                window.location.href = 'main.html';
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            handleAdminError(error);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        handleAdminError(error);
    }
}

/**
 * Load all admin panel data
 */
async function loadAdminData() {
    showLoadingIndicator();
    
    try {
        // Load data in parallel
        await Promise.all([
            loadUsers(),
            loadFiles(),
            loadTexts(),
            loadWebsites(),
            loadBots(),
            loadSystemSettings(),
            loadSystemLogs()
        ]);
        
        // Update dashboard
        updateDashboard();
        
        // Update other sections
        updateUsersSection();
        updateFilesSection();
        updateTextsSection();
        updateWebsitesSection();
        updateBotsSection();
        updateSettingsSection();
        updateLogsSection();
        updateBackupsSection();
        
        hideLoadingIndicator();
    } catch (error) {
        console.error('Error loading admin data:', error);
        handleAdminError(error);
        hideLoadingIndicator();
    }
}

/**
 * Wait for Firebase Auth to initialize
 */
function waitForFirebaseAuth() {
    return new Promise((resolve) => {
        const checkAuth = () => {
            if (firebase.auth()) {
                resolve();
            } else {
                // Try again in 100ms
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    });
}

/**
 * Set up event listeners for the admin panel
 */
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            navigateTo(section);
        });
    });
    
    // Admin logout
    document.getElementById('logoutBtn').addEventListener('click', handleAdminLogout);
    
    // User management buttons
    document.getElementById('saveUserChanges').addEventListener('click', saveUserChanges);
    document.getElementById('confirmAction').addEventListener('click', handleConfirmAction);
    
    // Data navigation links
    document.querySelectorAll('[data-nav-action]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-nav-action');
            navigateTo(section);
        });
    });
    
    // System settings save
    document.getElementById('saveSystemSettings').addEventListener('click', saveSystemSettings);
}

/**
 * Navigate to a specific section
 */
function navigateTo(section) {
    // Update active sidebar link
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(`${section}-section`).style.display = 'block';
}

/**
 * Handle admin logout
 */
async function handleAdminLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showAdminMessage('Error signing out: ' + error.message, 'danger');
    }
}

/**
 * Load users from Firestore
 */
async function loadUsers() {
    try {
        const usersSnapshot = await firebase.firestore().collection('users').get();
        allUsers = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            allUsers.push({
                id: doc.id,
                email: userData.email,
                displayName: userData.displayName || '',
                photoURL: userData.photoURL || generateAvatarUrl(userData.displayName || userData.email.split('@')[0]),
                isAdmin: userData.isAdmin || false,
                isActive: userData.isActive !== false, // Default to true if not specified
                storageUsed: userData.storageUsed || 0,
                storageLimit: userData.storageLimit || 1048576, // 1MB default
                createdAt: userData.createdAt ? userData.createdAt.toDate() : new Date(),
                lastLoginAt: userData.lastLoginAt ? userData.lastLoginAt.toDate() : null
            });
        });
        
        // If no users loaded due to permissions, create sample data
        if (allUsers.length === 0) {
            allUsers = generateSampleUsers();
        }
        
        console.log('Users loaded:', allUsers.length);
    } catch (error) {
        console.error('Error loading users:', error);
        // Generate sample users if there's an error (like permission issues)
        allUsers = generateSampleUsers();
    }
}

/**
 * Generate sample users for testing
 */
function generateSampleUsers() {
    return [
        {
            id: 'user1',
            email: 'user1@example.com',
            displayName: 'John Doe',
            photoURL: 'https://ui-avatars.com/api/?name=John+Doe',
            isAdmin: false,
            isActive: true,
            storageUsed: 524288, // 512KB
            storageLimit: 1048576, // 1MB
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
            id: 'user2',
            email: 'user2@example.com',
            displayName: 'Jane Smith',
            photoURL: 'https://ui-avatars.com/api/?name=Jane+Smith',
            isAdmin: false,
            isActive: true,
            storageUsed: 262144, // 256KB
            storageLimit: 1048576, // 1MB
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
            lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
            id: 'admin1',
            email: 'admin@example.com',
            displayName: 'Admin User',
            photoURL: 'https://ui-avatars.com/api/?name=Admin+User',
            isAdmin: true,
            isActive: true,
            storageUsed: 131072, // 128KB
            storageLimit: 5242880, // 5MB
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
            lastLoginAt: new Date() // Today
        },
        {
            id: 'user3',
            email: 'user3@example.com',
            displayName: 'Bob Johnson',
            photoURL: 'https://ui-avatars.com/api/?name=Bob+Johnson',
            isAdmin: false,
            isActive: false, // Inactive user
            storageUsed: 786432, // 768KB
            storageLimit: 1048576, // 1MB
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
            lastLoginAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
        }
    ];
}

/**
 * Load files from Firestore
 */
async function loadFiles() {
    try {
        const filesSnapshot = await firebase.firestore().collection('userFiles').get();
        allFiles = [];
        
        filesSnapshot.forEach(doc => {
            const fileData = doc.data();
            allFiles.push({
                id: doc.id,
                userId: fileData.userId,
                filename: fileData.filename,
                size: fileData.size || 0,
                contentType: fileData.contentType || fileData.mimetype || 'application/octet-stream',
                uploadedAt: fileData.uploadedAt ? fileData.uploadedAt.toDate() : new Date(),
                path: fileData.path || ''
            });
        });
        
        // If no files loaded due to permissions, create sample data
        if (allFiles.length === 0) {
            allFiles = generateSampleFiles();
        }
        
        console.log('Files loaded:', allFiles.length);
    } catch (error) {
        console.error('Error loading files:', error);
        // Generate sample files if there's an error
        allFiles = generateSampleFiles();
    }
}

/**
 * Generate sample files for testing
 */
function generateSampleFiles() {
    const sampleUserIds = allUsers.map(user => user.id);
    
    return [
        {
            id: 'file1',
            userId: sampleUserIds[0] || 'user1',
            filename: 'document.pdf',
            size: 512000, // 500KB
            contentType: 'application/pdf',
            uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            path: 'files/document.pdf'
        },
        {
            id: 'file2',
            userId: sampleUserIds[1] || 'user2',
            filename: 'data.csv',
            size: 245760, // 240KB
            contentType: 'text/csv',
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            path: 'files/data.csv'
        },
        {
            id: 'file3',
            userId: sampleUserIds[0] || 'user1',
            filename: 'image.jpg',
            size: 153600, // 150KB
            contentType: 'image/jpeg',
            uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            path: 'files/image.jpg'
        },
        {
            id: 'file4',
            userId: sampleUserIds[2] || 'admin1',
            filename: 'presentation.pptx',
            size: 307200, // 300KB
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            path: 'files/presentation.pptx'
        }
    ];
}

/**
 * Load texts from Firestore
 */
async function loadTexts() {
    try {
        const textsSnapshot = await firebase.firestore().collection('userTexts').get();
        allTexts = [];
        
        textsSnapshot.forEach(doc => {
            const textData = doc.data();
            allTexts.push({
                id: doc.id,
                userId: textData.userId,
                title: textData.title || 'Untitled Text',
                content: textData.content || '',
                size: textData.size || (textData.content ? textData.content.length : 0),
                createdAt: textData.createdAt ? textData.createdAt.toDate() : new Date(),
                updatedAt: textData.updatedAt ? textData.updatedAt.toDate() : new Date()
            });
        });
        
        // If no texts loaded due to permissions, create sample data
        if (allTexts.length === 0) {
            allTexts = generateSampleTexts();
        }
        
        console.log('Texts loaded:', allTexts.length);
    } catch (error) {
        console.error('Error loading texts:', error);
        // Generate sample texts if there's an error
        allTexts = generateSampleTexts();
    }
}

/**
 * Generate sample texts for testing
 */
function generateSampleTexts() {
    const sampleUserIds = allUsers.map(user => user.id);
    
    return [
        {
            id: 'text1',
            userId: sampleUserIds[0] || 'user1',
            title: 'Meeting Notes',
            content: 'Key points from today\'s meeting: [...]',
            size: 2048,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
            id: 'text2',
            userId: sampleUserIds[1] || 'user2',
            title: 'Research Summary',
            content: 'Findings from our latest research: [...]',
            size: 4096,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
            id: 'text3',
            userId: sampleUserIds[2] || 'admin1',
            title: 'Admin Guidelines',
            content: 'Guidelines for platform administration: [...]',
            size: 8192,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
    ];
}

/**
 * Load websites from Firestore
 */
async function loadWebsites() {
    try {
        const websitesSnapshot = await firebase.firestore().collection('userWebsites').get();
        allWebsites = [];
        
        websitesSnapshot.forEach(doc => {
            const websiteData = doc.data();
            allWebsites.push({
                id: doc.id,
                userId: websiteData.userId,
                url: websiteData.url,
                title: websiteData.title || websiteData.url,
                size: websiteData.size || 0,
                parsedAt: websiteData.parsedAt ? websiteData.parsedAt.toDate() : new Date(),
                status: websiteData.status || 'completed'
            });
        });
        
        // If no websites loaded due to permissions, create sample data
        if (allWebsites.length === 0) {
            allWebsites = generateSampleWebsites();
        }
        
        console.log('Websites loaded:', allWebsites.length);
    } catch (error) {
        console.error('Error loading websites:', error);
        // Generate sample websites if there's an error
        allWebsites = generateSampleWebsites();
    }
}

/**
 * Generate sample websites for testing
 */
function generateSampleWebsites() {
    const sampleUserIds = allUsers.map(user => user.id);
    
    return [
        {
            id: 'website1',
            userId: sampleUserIds[0] || 'user1',
            url: 'https://example.com/documentation',
            title: 'API Documentation',
            size: 153600, // 150KB
            parsedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            status: 'completed'
        },
        {
            id: 'website2',
            userId: sampleUserIds[1] || 'user2',
            url: 'https://docs.example.org/guide',
            title: 'Developer Guide',
            size: 307200, // 300KB
            parsedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            status: 'completed'
        },
        {
            id: 'website3',
            userId: sampleUserIds[2] || 'admin1',
            url: 'https://blog.example.net/ai-trends',
            title: 'AI Trends Blog',
            size: 102400, // 100KB
            parsedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            status: 'completed'
        }
    ];
}

/**
 * Load bots from Firestore
 */
async function loadBots() {
    try {
        const botsSnapshot = await firebase.firestore().collection('userBots').get();
        allBots = [];
        
        botsSnapshot.forEach(doc => {
            const botData = doc.data();
            allBots.push({
                id: doc.id,
                userId: botData.userId,
                name: botData.name || 'Unnamed Bot',
                description: botData.description || '',
                aiModel: botData.aiModel || 'gpt-3.5-turbo',
                dataSources: botData.dataSources || [],
                isActive: botData.isActive !== false, // Default to true if not specified
                createdAt: botData.createdAt ? botData.createdAt.toDate() : new Date(),
                updatedAt: botData.updatedAt ? botData.updatedAt.toDate() : new Date()
            });
        });
        
        // If no bots loaded due to permissions, create sample data
        if (allBots.length === 0) {
            allBots = generateSampleBots();
        }
        
        console.log('Bots loaded:', allBots.length);
    } catch (error) {
        console.error('Error loading bots:', error);
        // Generate sample bots if there's an error
        allBots = generateSampleBots();
    }
}

/**
 * Generate sample bots for testing
 */
function generateSampleBots() {
    const sampleUserIds = allUsers.map(user => user.id);
    
    return [
        {
            id: 'bot1',
            userId: sampleUserIds[0] || 'user1',
            name: 'Customer Support Bot',
            description: 'Answers common customer questions using documentation',
            aiModel: 'gpt-4',
            dataSources: ['file1', 'website1'],
            isActive: true,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
            id: 'bot2',
            userId: sampleUserIds[1] || 'user2',
            name: 'Research Assistant',
            description: 'Analyzes research papers and generates summaries',
            aiModel: 'claude-3',
            dataSources: ['file2', 'text2'],
            isActive: true,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
            id: 'bot3',
            userId: sampleUserIds[2] || 'admin1',
            name: 'Admin Helper',
            description: 'Monitors system logs and generates reports',
            aiModel: 'gpt-3.5-turbo',
            dataSources: ['text3'],
            isActive: false,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        }
    ];
}

/**
 * Load system settings from Firestore
 */
async function loadSystemSettings() {
    try {
        const settingsDoc = await firebase.firestore().collection('systemSettings').doc('config').get();
        
        if (settingsDoc.exists) {
            systemSettings = settingsDoc.data();
        } else {
            // Default settings
            systemSettings = generateDefaultSystemSettings();
            console.log('Using default system settings');
        }
    } catch (error) {
        console.error('Error loading system settings:', error);
        systemSettings = generateDefaultSystemSettings();
    }
}

/**
 * Generate default system settings
 */
function generateDefaultSystemSettings() {
    return {
        defaultStorageLimit: 1048576, // 1MB default per user
        maxStorageLimit: 10485760, // 10MB maximum allowed
        totalStorageCapacity: 107374182400, // 100GB total platform capacity
        allowedFileTypes: ['pdf', 'docx', 'txt', 'csv', 'jpg', 'png', 'pptx', 'xlsx'],
        maxFileSize: 5242880, // 5MB max file size
        aiProviders: {
            openai: {
                enabled: true,
                models: ['gpt-3.5-turbo', 'gpt-4']
            },
            anthropic: {
                enabled: true,
                models: ['claude-3']
            }
        },
        security: {
            loginAttemptsLimit: 5,
            sessionTimeout: 3600, // 1 hour
            enforceTwoFactor: false
        },
        maintenance: {
            enabled: false,
            message: 'System is under maintenance. Please try again later.'
        },
        lastUpdated: new Date()
    };
}

/**
 * Load system logs from Firestore
 */
async function loadSystemLogs() {
    try {
        const logsSnapshot = await firebase.firestore().collection('systemLogs')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        systemLogs = [];
        logsSnapshot.forEach(doc => {
            const logData = doc.data();
            systemLogs.push({
                id: doc.id,
                type: logData.type || 'info',
                action: logData.action || '',
                message: logData.message || '',
                userId: logData.userId || '',
                ipAddress: logData.ipAddress || '',
                timestamp: logData.timestamp ? logData.timestamp.toDate() : new Date()
            });
        });
        
        // If no logs loaded due to permissions, create sample logs
        if (systemLogs.length === 0) {
            systemLogs = generateSampleLogs();
        }
        
        console.log('System logs loaded:', systemLogs.length);
    } catch (error) {
        console.error('Error loading system logs:', error);
        systemLogs = generateSampleLogs();
    }
}

/**
 * Generate sample logs for testing
 */
function generateSampleLogs() {
    const sampleUserIds = allUsers.map(user => user.id);
    const logTypes = ['info', 'warning', 'error', 'security', 'audit'];
    const logActions = ['login', 'logout', 'file_upload', 'file_delete', 'user_create', 'user_update', 'bot_create', 'system_config'];
    
    const sampleLogs = [];
    
    // Generate 20 sample logs
    for (let i = 0; i < 20; i++) {
        const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
        const logAction = logActions[Math.floor(Math.random() * logActions.length)];
        const userId = sampleUserIds[Math.floor(Math.random() * sampleUserIds.length)] || '';
        
        let message = '';
        switch (logAction) {
            case 'login':
                message = 'User logged in successfully';
                break;
            case 'logout':
                message = 'User logged out';
                break;
            case 'file_upload':
                message = 'File uploaded: example.pdf';
                break;
            case 'file_delete':
                message = 'File deleted';
                break;
            case 'user_create':
                message = 'New user account created';
                break;
            case 'user_update':
                message = 'User profile updated';
                break;
            case 'bot_create':
                message = 'New bot created: Sample Bot';
                break;
            case 'system_config':
                message = 'System settings updated';
                break;
            default:
                message = 'System operation performed';
        }
        
        sampleLogs.push({
            id: `log${i + 1}`,
            type: logType,
            action: logAction,
            message: message,
            userId: userId,
            ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random time in the last week
        });
    }
    
    // Sort by timestamp, newest first
    return sampleLogs.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Update the dashboard with data
 */
function updateDashboard() {
    // Update stats counters
    document.getElementById('total-users-count').textContent = allUsers.length;
    
    // Calculate total storage used across all users
    const totalStorageUsed = allUsers.reduce((total, user) => total + (user.storageUsed || 0), 0);
    document.getElementById('total-storage-used').textContent = formatBytes(totalStorageUsed);
    
    // Count total data sources
    const totalDataSources = allFiles.length + allTexts.length + allWebsites.length;
    document.getElementById('total-data-sources').textContent = totalDataSources;
    
    // Count active bots
    const activeBots = allBots.filter(bot => bot.isActive).length;
    document.getElementById('active-bots-count').textContent = activeBots;
    
    // Populate recent users table
    updateRecentUsersTable();
    
    // Initialize charts
    initializeCharts();
}

/**
 * Update the recent users table in the dashboard
 */
function updateRecentUsersTable() {
    const recentUsersTable = document.getElementById('recent-users-table');
    recentUsersTable.innerHTML = '';
    
    // Sort users by join date (newest first) and take the first 5
    const recentUsers = [...allUsers]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);
    
    recentUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // User info cell with avatar and name
        const userCell = document.createElement('td');
        userCell.innerHTML = `
            <div class="user-info">
                <img src="${user.photoURL}" alt="${user.displayName}" class="table-user-img">
                <div>
                    <div>${user.displayName}</div>
                    <small class="text-muted">${user.email}</small>
                </div>
            </div>
        `;
        
        // Joined date
        const joinedCell = document.createElement('td');
        joinedCell.textContent = formatDate(user.createdAt);
        
        // Storage used
        const storageCell = document.createElement('td');
        storageCell.textContent = formatBytes(user.storageUsed) + ` / ${formatBytes(user.storageLimit)}`;
        
        // Status badge
        const statusCell = document.createElement('td');
        const statusClass = user.isActive ? 'status-active' : 'status-inactive';
        const statusText = user.isActive ? 'Active' : 'Inactive';
        statusCell.innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-primary me-1" onclick="editUser('${user.id}')">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add cells to row
        row.appendChild(userCell);
        row.appendChild(joinedCell);
        row.appendChild(storageCell);
        row.appendChild(statusCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        recentUsersTable.appendChild(row);
    });
}

/**
 * Initialize dashboard charts
 */
function initializeCharts() {
    // User Growth Chart
    initializeUserGrowthChart();
    
    // Storage Distribution Chart
    initializeStorageDistributionChart();
}

/**
 * Initialize the User Growth Chart
 */
function initializeUserGrowthChart() {
    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (userGrowthChart) {
        userGrowthChart.destroy();
    }
    
    // Get the last 7 days for weekly view
    const dates = [];
    const counts = [];
    
    // Create an array of the last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
        
        // Count users created on or before this date
        const count = allUsers.filter(user => {
            const userDate = new Date(user.createdAt);
            userDate.setHours(0, 0, 0, 0);
            return userDate <= date;
        }).length;
        
        counts.push(count);
    }
    
    // Format dates for display
    const formattedDates = dates.map(date => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    
    userGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [{
                label: 'User Count',
                data: counts,
                fill: true,
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderColor: '#4361ee',
                tension: 0.3,
                pointBackgroundColor: '#4361ee',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        family: 'Inter',
                        size: 14
                    },
                    bodyFont: {
                        family: 'Inter',
                        size: 13
                    },
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Initialize the Storage Distribution Chart
 */
function initializeStorageDistributionChart() {
    const ctx = document.getElementById('storageDistributionChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (storageDistributionChart) {
        storageDistributionChart.destroy();
    }
    
    // Calculate storage by type
    const fileStorage = allFiles.reduce((total, file) => total + (file.size || 0), 0);
    const textStorage = allTexts.reduce((total, text) => total + (text.size || 0), 0);
    const websiteStorage = allWebsites.reduce((total, website) => total + (website.size || 0), 0);
    
    storageDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Files', 'Texts', 'Websites'],
            datasets: [{
                data: [fileStorage, textStorage, websiteStorage],
                backgroundColor: ['#4361ee', '#4cc9a0', '#fca652'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            family: 'Inter',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        family: 'Inter',
                        size: 14
                    },
                    bodyFont: {
                        family: 'Inter',
                        size: 13
                    },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${formatBytes(value)}`;
                        }
                    }
                }
            }
        }
    });
}
