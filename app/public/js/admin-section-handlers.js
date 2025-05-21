/**
 * Admin Panel Section Handlers
 * Manages different sections of the LLM Data Platform admin panel
 */

/**
 * Update the users section
 */
function updateUsersSection() {
    const usersSection = document.getElementById('users-section');
    usersSection.innerHTML = `
        <h2 class="mb-4">User Management</h2>
        
        <div class="d-flex justify-content-end mb-3">
            <button class="btn btn-sm btn-primary" id="addUserBtn">
                <i class="bi bi-person-plus me-1"></i> Add User
            </button>
        </div>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header d-flex justify-content-between align-items-center">
                <span>All Users</span>
                <div class="d-flex align-items-center">
                    <input type="text" class="form-control form-control-sm me-2" placeholder="Search users..." id="userSearchInput" style="width: 200px">
                    <select class="form-select form-select-sm" id="userStatusFilter" style="width: 120px">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div class="admin-card-body p-0">
                <table class="table admin-table m-0" id="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Joined</th>
                            <th>Last Login</th>
                            <th>Storage</th>
                            <th>Admin</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="all-users-table">
                        <!-- Users will be loaded here via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- User Storage Analytics -->
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                Storage Usage Analytics
            </div>
            <div class="admin-card-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="chart-container" style="height: 300px">
                            <canvas id="userStorageChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3">
                            <h5>Storage Summary</h5>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span>Total Allocated</span>
                                    <span id="totalAllocatedStorage">0 MB</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar bg-primary" role="progressbar" style="width: 0%" id="totalAllocatedStorageBar"></div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span>Total Used</span>
                                    <span id="totalUsedStorage">0 MB</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar bg-success" role="progressbar" style="width: 0%" id="totalUsedStorageBar"></div>
                                </div>
                            </div>
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span>System Capacity</span>
                                    <span>1 GB</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar bg-info" role="progressbar" style="width: 100%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for add user button
    document.getElementById('addUserBtn').addEventListener('click', showAddUserModal);
    
    // Add event listeners for search and filter
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterUsers();
        });
    }
    
    const statusFilter = document.getElementById('userStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterUsers();
        });
    }
    
    // Populate the users table
    updateUsersTable();
    
    // Setup bulk operations
    setupBulkOperations('users-table', 'user');
    
    // Initialize user storage chart
    initializeUserStorageChart();
}

/**
 * Filter users based on search and status filter
 */
function filterUsers() {
    const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';
    
    const userRows = document.querySelectorAll('#all-users-table tr');
    
    userRows.forEach(row => {
        const userName = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
        const userEmail = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
        const userStatus = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        
        const matchesSearch = userName.includes(searchTerm) || userEmail.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && userStatus.includes('active')) || 
                            (statusFilter === 'inactive' && userStatus.includes('inactive'));
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

/**
 * Initialize user storage chart
 */
function initializeUserStorageChart() {
    const chartCanvas = document.getElementById('userStorageChart');
    if (!chartCanvas) return;
    
    // Get top users by storage usage
    const topUsers = [...allUsers]
        .sort((a, b) => b.storageUsed - a.storageUsed)
        .slice(0, 5);
    
    const labels = topUsers.map(user => user.displayName || user.email);
    const storageData = topUsers.map(user => user.storageUsed / 1024); // Convert to KB
    
    // Calculate total allocated and used storage
    const totalAllocated = allUsers.reduce((sum, user) => sum + (user.storageLimit || 1048576), 0); // Default 1MB
    const totalUsed = allUsers.reduce((sum, user) => sum + (user.storageUsed || 0), 0);
    
    // Update storage summary
    document.getElementById('totalAllocatedStorage').textContent = formatBytes(totalAllocated);
    document.getElementById('totalUsedStorage').textContent = formatBytes(totalUsed);
    
    // Update progress bars (assuming 1GB system capacity)
    const systemCapacity = 1024 * 1024 * 1024; // 1GB in bytes
    document.getElementById('totalAllocatedStorageBar').style.width = `${(totalAllocated / systemCapacity) * 100}%`;
    document.getElementById('totalUsedStorageBar').style.width = `${(totalUsed / systemCapacity) * 100}%`;
    
    // Create the chart
    if (window.userStorageChartInstance) {
        window.userStorageChartInstance.destroy();
    }
    
    window.userStorageChartInstance = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Storage Used (KB)',
                data: storageData,
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 5 Users by Storage Usage'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Storage (KB)'
                    }
                }
            }
        }
    });
}

/**
 * Update Files Section
 */
function updateFilesSection() {
    const filesSection = document.getElementById('files-section');
    filesSection.innerHTML = `
        <h2 class="mb-4">Files Management</h2>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                All Files
            </div>
            <div class="admin-card-body p-0">
                <table class="table admin-table m-0">
                    <thead>
                        <tr>
                            <th>Filename</th>
                            <th>User</th>
                            <th>Size</th>
                            <th>Type</th>
                            <th>Uploaded</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="all-files-table">
                        <!-- Files will be loaded here via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Populate files table
    updateFilesTable();
}

/**
 * Update Texts Section
 */
function updateTextsSection() {
    const textsSection = document.getElementById('texts-section');
    textsSection.innerHTML = `
        <h2 class="mb-4">Texts Management</h2>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                All Texts
            </div>
            <div class="admin-card-body p-0">
                <table class="table admin-table m-0">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>User</th>
                            <th>Size</th>
                            <th>Created</th>
                            <th>Last Updated</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="all-texts-table">
                        <!-- Texts will be loaded here via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Populate texts table
    updateTextsTable();
}

/**
 * Update Websites Section
 */
function updateWebsitesSection() {
    const websitesSection = document.getElementById('websites-section');
    websitesSection.innerHTML = `
        <h2 class="mb-4">Websites Management</h2>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                All Websites
            </div>
            <div class="admin-card-body p-0">
                <table class="table admin-table m-0">
                    <thead>
                        <tr>
                            <th>URL</th>
                            <th>Title</th>
                            <th>User</th>
                            <th>Size</th>
                            <th>Parsed At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="all-websites-table">
                        <!-- Websites will be loaded here via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Populate websites table
    updateWebsitesTable();
}

/**
 * Update Bots Section
 */
function updateBotsSection() {
    const botsSection = document.getElementById('bots-section');
    botsSection.innerHTML = `
        <h2 class="mb-4">Bots Management</h2>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                All Bots
            </div>
            <div class="admin-card-body p-0">
                <table class="table admin-table m-0">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>User</th>
                            <th>AI Model</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="all-bots-table">
                        <!-- Bots will be loaded here via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Populate bots table
    updateBotsTable();
}

/**
 * Update Settings Section
 */
function updateSettingsSection() {
    const settingsSection = document.getElementById('settings-section');
    settingsSection.innerHTML = `
        <h2 class="mb-4">System Settings</h2>
        
        <div class="row">
            <div class="col-md-6">
                <div class="admin-card mb-4">
                    <div class="admin-card-header">
                        Storage Settings
                    </div>
                    <div class="admin-card-body">
                        <form class="admin-form">
                            <div class="mb-3">
                                <label for="defaultStorageLimit" class="form-label">Default User Storage Limit (KB)</label>
                                <input type="number" class="form-control" id="defaultStorageLimit" value="${systemSettings.defaultStorageLimit / 1024}">
                                <small class="form-text text-muted">Default is 1024 KB (1MB) per user</small>
                            </div>
                            <div class="mb-3">
                                <label for="maxFileSize" class="form-label">Maximum File Size (KB)</label>
                                <input type="number" class="form-control" id="maxFileSize" value="${systemSettings.maxFileSize / 1024}">
                            </div>
                            <button type="button" class="btn btn-primary" id="saveStorageSettingsBtn">Save Storage Settings</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="admin-card mb-4">
                    <div class="admin-card-header">
                        Maintenance Mode
                    </div>
                    <div class="admin-card-body">
                        <form class="admin-form">
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="maintenanceMode" ${systemSettings.maintenance?.enabled ? 'checked' : ''}>
                                <label class="form-check-label" for="maintenanceMode">Enable Maintenance Mode</label>
                            </div>
                            <div class="mb-3">
                                <label for="maintenanceMessage" class="form-label">Maintenance Message</label>
                                <textarea class="form-control" id="maintenanceMessage" rows="3">${systemSettings.maintenance?.message || 'System is under maintenance. Please try again later.'}</textarea>
                            </div>
                            <button type="button" class="btn btn-primary" id="saveMaintenanceSettingsBtn">Save Maintenance Settings</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                API Configuration
            </div>
            <div class="admin-card-body">
                <form class="admin-form">
                    <div class="mb-3">
                        <label for="apiBaseUrl" class="form-label">API Base URL</label>
                        <input type="text" class="form-control" id="apiBaseUrl" value="http://localhost:3001/api">
                        <small class="form-text text-muted">Default backend API runs on port 3001</small>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="enforceAuth" checked>
                        <label class="form-check-label" for="enforceAuth">Enforce Authentication</label>
                    </div>
                    <button type="button" class="btn btn-primary" id="saveApiSettingsBtn">Save API Settings</button>
                </form>
            </div>
        </div>
    `;
    
    // Add event listeners for settings buttons
    document.getElementById('saveStorageSettingsBtn').addEventListener('click', saveStorageSettings);
    document.getElementById('saveMaintenanceSettingsBtn').addEventListener('click', saveMaintenanceSettings);
    document.getElementById('saveApiSettingsBtn').addEventListener('click', saveApiSettings);
}

/**
 * Update Logs Section
 */
function updateLogsSection() {
    const logsSection = document.getElementById('logs-section');
    logsSection.innerHTML = `
        <h2 class="mb-4">System Logs</h2>
        
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                Recent Logs
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary active log-filter" data-type="all">All</button>
                    <button class="btn btn-sm btn-outline-secondary log-filter" data-type="info">Info</button>
                    <button class="btn btn-sm btn-outline-secondary log-filter" data-type="warning">Warning</button>
                    <button class="btn btn-sm btn-outline-secondary log-filter" data-type="error">Error</button>
                    <button class="btn btn-sm btn-outline-secondary log-filter" data-type="security">Security</button>
                </div>
            </div>
            <div class="admin-card-body p-0">
                <table class="table admin-table m-0">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Action</th>
                            <th>Message</th>
                            <th>User</th>
                            <th>IP Address</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody id="all-logs-table">
                        <!-- Logs will be loaded here via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Add event listeners for log filters
    document.querySelectorAll('.log-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterLogs(this.getAttribute('data-type'));
        });
    });
    
    // Populate logs table
    updateLogsTable();
}

/**
 * Update Backups Section
 */
function updateBackupsSection() {
    const backupsSection = document.getElementById('backups-section');
    backupsSection.innerHTML = `
        <h2 class="mb-4">Backups</h2>
        
        <div class="row">
            <div class="col-md-6">
                <div class="admin-card mb-4">
                    <div class="admin-card-header">
                        Create Backup
                    </div>
                    <div class="admin-card-body">
                        <p>Create a backup of all user data, files, and settings.</p>
                        <form class="admin-form">
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="includeFiles" checked>
                                <label class="form-check-label" for="includeFiles">Include Files</label>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="includeUserData" checked>
                                <label class="form-check-label" for="includeUserData">Include User Data</label>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="includeSettings" checked>
                                <label class="form-check-label" for="includeSettings">Include System Settings</label>
                            </div>
                            <button type="button" class="btn btn-primary" id="createBackupBtn">Create Backup</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="admin-card mb-4">
                    <div class="admin-card-header">
                        Backup Schedule
                    </div>
                    <div class="admin-card-body">
                        <form class="admin-form">
                            <div class="mb-3">
                                <label for="backupFrequency" class="form-label">Automatic Backup Frequency</label>
                                <select class="form-select" id="backupFrequency">
                                    <option value="daily">Daily</option>
                                    <option value="weekly" selected>Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="never">Never</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="backupRetention" class="form-label">Backup Retention (days)</label>
                                <input type="number" class="form-control" id="backupRetention" value="30">
                            </div>
                            <button type="button" class="btn btn-primary" id="saveBackupSettingsBtn">Save Backup Settings</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for backup buttons
    document.getElementById('createBackupBtn').addEventListener('click', createBackup);
    document.getElementById('saveBackupSettingsBtn').addEventListener('click', saveBackupSettings);
}

// Populate the various tables
function updateTextsTable() {
    const textsTable = document.getElementById('all-texts-table');
    if (!textsTable) return;
    
    textsTable.innerHTML = '';
    
    // Sort texts by creation date (newest first)
    const sortedTexts = [...allTexts].sort((a, b) => b.createdAt - a.createdAt);
    
    sortedTexts.forEach(text => {
        const row = document.createElement('tr');
        
        // Title
        const titleCell = document.createElement('td');
        titleCell.textContent = text.title;
        
        // User who created
        const userCell = document.createElement('td');
        const user = allUsers.find(u => u.id === text.userId);
        userCell.textContent = user ? user.displayName : 'Unknown';
        
        // Size
        const sizeCell = document.createElement('td');
        sizeCell.textContent = formatBytes(text.size);
        
        // Created date
        const createdCell = document.createElement('td');
        createdCell.textContent = formatDate(text.createdAt);
        
        // Updated date
        const updatedCell = document.createElement('td');
        updatedCell.textContent = formatDate(text.updatedAt);
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-primary me-1" onclick="viewText('${text.id}')">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteText('${text.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add cells to row
        row.appendChild(titleCell);
        row.appendChild(userCell);
        row.appendChild(sizeCell);
        row.appendChild(createdCell);
        row.appendChild(updatedCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        textsTable.appendChild(row);
    });
}

function updateWebsitesTable() {
    const websitesTable = document.getElementById('all-websites-table');
    if (!websitesTable) return;
    
    websitesTable.innerHTML = '';
    
    // Sort websites by parsed date (newest first)
    const sortedWebsites = [...allWebsites].sort((a, b) => b.parsedAt - a.parsedAt);
    
    sortedWebsites.forEach(website => {
        const row = document.createElement('tr');
        
        // URL
        const urlCell = document.createElement('td');
        urlCell.innerHTML = `<a href="${website.url}" target="_blank">${website.url}</a>`;
        
        // Title
        const titleCell = document.createElement('td');
        titleCell.textContent = website.title || 'Untitled';
        
        // User who parsed
        const userCell = document.createElement('td');
        const user = allUsers.find(u => u.id === website.userId);
        userCell.textContent = user ? user.displayName : 'Unknown';
        
        // Size
        const sizeCell = document.createElement('td');
        sizeCell.textContent = formatBytes(website.size);
        
        // Parsed date
        const parsedCell = document.createElement('td');
        parsedCell.textContent = formatDate(website.parsedAt);
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-primary me-1" onclick="viewWebsite('${website.id}')">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteWebsite('${website.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add cells to row
        row.appendChild(urlCell);
        row.appendChild(titleCell);
        row.appendChild(userCell);
        row.appendChild(sizeCell);
        row.appendChild(parsedCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        websitesTable.appendChild(row);
    });
}

function updateBotsTable() {
    const botsTable = document.getElementById('all-bots-table');
    if (!botsTable) return;
    
    botsTable.innerHTML = '';
    
    // Sort bots by creation date (newest first)
    const sortedBots = [...allBots].sort((a, b) => b.createdAt - a.createdAt);
    
    sortedBots.forEach(bot => {
        const row = document.createElement('tr');
        
        // Name
        const nameCell = document.createElement('td');
        nameCell.textContent = bot.name;
        
        // User who created
        const userCell = document.createElement('td');
        const user = allUsers.find(u => u.id === bot.userId);
        userCell.textContent = user ? user.displayName : 'Unknown';
        
        // AI Model
        const modelCell = document.createElement('td');
        modelCell.textContent = bot.aiModel;
        
        // Created date
        const createdCell = document.createElement('td');
        createdCell.textContent = formatDate(bot.createdAt);
        
        // Status badge
        const statusCell = document.createElement('td');
        const statusClass = bot.isActive ? 'status-active' : 'status-inactive';
        const statusText = bot.isActive ? 'Active' : 'Inactive';
        statusCell.innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-primary me-1" onclick="editBot('${bot.id}')">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteBot('${bot.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(userCell);
        row.appendChild(modelCell);
        row.appendChild(createdCell);
        row.appendChild(statusCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        botsTable.appendChild(row);
    });
}

function updateLogsTable() {
    const logsTable = document.getElementById('all-logs-table');
    if (!logsTable) return;
    
    logsTable.innerHTML = '';
    
    // Already sorted by timestamp (newest first)
    systemLogs.forEach(log => {
        const row = document.createElement('tr');
        row.setAttribute('data-log-type', log.type);
        
        // Type with badge
        const typeCell = document.createElement('td');
        let badgeClass = 'bg-secondary';
        
        switch (log.type) {
            case 'info':
                badgeClass = 'bg-info';
                break;
            case 'warning':
                badgeClass = 'bg-warning';
                break;
            case 'error':
                badgeClass = 'bg-danger';
                break;
            case 'security':
                badgeClass = 'bg-primary';
                break;
            case 'audit':
                badgeClass = 'bg-success';
                break;
        }
        
        typeCell.innerHTML = `<span class="badge ${badgeClass}">${log.type}</span>`;
        
        // Action
        const actionCell = document.createElement('td');
        actionCell.textContent = log.action;
        
        // Message
        const messageCell = document.createElement('td');
        messageCell.textContent = log.message;
        
        // User
        const userCell = document.createElement('td');
        if (log.userId) {
            const user = allUsers.find(u => u.id === log.userId);
            userCell.textContent = user ? user.displayName : log.userId;
        } else {
            userCell.textContent = 'System';
        }
        
        // IP Address
        const ipCell = document.createElement('td');
        ipCell.textContent = log.ipAddress || 'N/A';
        
        // Timestamp
        const timestampCell = document.createElement('td');
        timestampCell.textContent = formatDate(log.timestamp) + ' ' + 
            new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Add cells to row
        row.appendChild(typeCell);
        row.appendChild(actionCell);
        row.appendChild(messageCell);
        row.appendChild(userCell);
        row.appendChild(ipCell);
        row.appendChild(timestampCell);
        
        // Add row to table
        logsTable.appendChild(row);
    });
}

/**
 * Filter logs by type
 */
function filterLogs(type) {
    const logRows = document.querySelectorAll('#all-logs-table tr');
    
    logRows.forEach(row => {
        if (type === 'all' || row.getAttribute('data-log-type') === type) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Save Storage Settings
 */
function saveStorageSettings() {
    const defaultStorageLimit = parseInt(document.getElementById('defaultStorageLimit').value) * 1024; // Convert from KB to bytes
    const maxFileSize = parseInt(document.getElementById('maxFileSize').value) * 1024; // Convert from KB to bytes
    
    // Validate input
    if (isNaN(defaultStorageLimit) || defaultStorageLimit <= 0) {
        showAdminMessage('Please enter a valid default storage limit', 'warning');
        return;
    }
    
    if (isNaN(maxFileSize) || maxFileSize <= 0) {
        showAdminMessage('Please enter a valid maximum file size', 'warning');
        return;
    }
    
    // Update local settings
    systemSettings.defaultStorageLimit = defaultStorageLimit;
    systemSettings.maxFileSize = maxFileSize;
    
    // Try to update in Firestore
    try {
        firebase.firestore().collection('systemSettings').doc('config').update({
            defaultStorageLimit: defaultStorageLimit,
            maxFileSize: maxFileSize,
            lastUpdated: new Date()
        });
        
        showAdminMessage('Storage settings saved', 'success');
    } catch (error) {
        console.error('Error saving storage settings:', error);
        showAdminMessage('Error saving settings: ' + error.message, 'danger');
    }
}

/**
 * Save Maintenance Settings
 */
function saveMaintenanceSettings() {
    const maintenanceEnabled = document.getElementById('maintenanceMode').checked;
    const maintenanceMessage = document.getElementById('maintenanceMessage').value.trim();
    
    // Validate input
    if (maintenanceEnabled && !maintenanceMessage) {
        showAdminMessage('Please enter a maintenance message', 'warning');
        return;
    }
    
    // Update local settings
    if (!systemSettings.maintenance) {
        systemSettings.maintenance = {};
    }
    
    systemSettings.maintenance.enabled = maintenanceEnabled;
    systemSettings.maintenance.message = maintenanceMessage;
    
    // Try to update in Firestore
    try {
        firebase.firestore().collection('systemSettings').doc('config').update({
            'maintenance.enabled': maintenanceEnabled,
            'maintenance.message': maintenanceMessage,
            lastUpdated: new Date()
        });
        
        showAdminMessage('Maintenance settings saved', 'success');
    } catch (error) {
        console.error('Error saving maintenance settings:', error);
        showAdminMessage('Error saving settings: ' + error.message, 'danger');
    }
}

/**
 * Save API Settings
 */
function saveApiSettings() {
    const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim();
    const enforceAuth = document.getElementById('enforceAuth').checked;
    
    // Validate input
    if (!apiBaseUrl) {
        showAdminMessage('Please enter an API base URL', 'warning');
        return;
    }
    
    // Update local settings
    systemSettings.apiBaseUrl = apiBaseUrl;
    systemSettings.enforceAuth = enforceAuth;
    
    // Try to update in Firestore
    try {
        firebase.firestore().collection('systemSettings').doc('config').update({
            apiBaseUrl: apiBaseUrl,
            enforceAuth: enforceAuth,
            lastUpdated: new Date()
        });
        
        showAdminMessage('API settings saved', 'success');
    } catch (error) {
        console.error('Error saving API settings:', error);
        showAdminMessage('Error saving settings: ' + error.message, 'danger');
    }
}
