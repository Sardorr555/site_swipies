/**
 * Admin Panel Utility Functions
 * Provides additional functionality for the LLM Data Platform admin panel
 */

/**
 * Update the users section with a table of all users
 */
function updateUsersTable() {
    const usersTable = document.getElementById('all-users-table');
    if (!usersTable) return;
    
    usersTable.innerHTML = '';
    
    // Sort users by join date (newest first)
    const sortedUsers = [...allUsers].sort((a, b) => b.createdAt - a.createdAt);
    
    sortedUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Add data attributes for bulk operations
        row.setAttribute('data-id', user.uid);
        row.setAttribute('data-status', user.isActive ? 'active' : 'inactive');
        
        // User info cell with avatar and name
        const userCell = document.createElement('td');
        userCell.innerHTML = `
            <div class="user-info">
                <img src="${user.photoURL}" alt="${user.displayName}" class="table-user-img">
                <div>
                    <div class="user-name">${user.displayName}</div>
                    <small class="user-email text-muted">${user.email}</small>
                </div>
            </div>
        `;
        
        // Joined date
        const joinedCell = document.createElement('td');
        joinedCell.textContent = formatDate(user.createdAt);
        
        // Last login date
        const lastLoginCell = document.createElement('td');
        lastLoginCell.textContent = user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never';
        
        // Storage used
        const storageCell = document.createElement('td');
        storageCell.textContent = formatBytes(user.storageUsed) + ` / ${formatBytes(user.storageLimit)}`;
        
        // Admin status
        const adminCell = document.createElement('td');
        adminCell.innerHTML = user.isAdmin ? 
            '<span class="badge bg-primary"><i class="bi bi-check-circle me-1"></i>Yes</span>' : 
            '<span class="badge bg-secondary">No</span>';
        
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
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${user.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add cells to row
        row.appendChild(userCell);
        row.appendChild(joinedCell);
        row.appendChild(lastLoginCell);
        row.appendChild(storageCell);
        row.appendChild(adminCell);
        row.appendChild(statusCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        usersTable.appendChild(row);
    });
}

/**
 * Update the files section with a table of all files
 */
function updateFilesTable() {
    const filesTable = document.getElementById('all-files-table');
    if (!filesTable) return;
    
    filesTable.innerHTML = '';
    
    // Sort files by upload date (newest first)
    const sortedFiles = [...allFiles].sort((a, b) => b.uploadedAt - a.uploadedAt);
    
    sortedFiles.forEach(file => {
        const row = document.createElement('tr');
        
        // File name
        const nameCell = document.createElement('td');
        nameCell.textContent = file.filename;
        
        // User who uploaded
        const userCell = document.createElement('td');
        const user = allUsers.find(u => u.id === file.userId);
        userCell.textContent = user ? user.displayName : 'Unknown';
        
        // File size
        const sizeCell = document.createElement('td');
        sizeCell.textContent = formatBytes(file.size);
        
        // File type
        const typeCell = document.createElement('td');
        typeCell.textContent = file.contentType;
        
        // Upload date
        const uploadedCell = document.createElement('td');
        uploadedCell.textContent = formatDate(file.uploadedAt);
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-primary me-1" onclick="viewFile('${file.id}')">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteFile('${file.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(userCell);
        row.appendChild(sizeCell);
        row.appendChild(typeCell);
        row.appendChild(uploadedCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        filesTable.appendChild(row);
    });
}

/**
 * Show admin message (notification/alert)
 */
function showAdminMessage(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add alert to the DOM
    const alertContainer = document.querySelector('.admin-content');
    alertContainer.insertBefore(alertDiv, alertContainer.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 5000);
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date to readable format
 */
function formatDate(date) {
    if (!date) return 'N/A';
    
    // Format date as MM/DD/YYYY
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

/**
 * Show loading indicator
 */
function showLoadingIndicator() {
    // Create loading overlay if it doesn't exist
    if (!document.getElementById('admin-loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'admin-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-light';
        spinner.setAttribute('role', 'status');
        spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
        
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }
    
    // Show the overlay
    document.getElementById('admin-loading-overlay').style.display = 'flex';
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    // Hide loading overlay if it exists
    const overlay = document.getElementById('admin-loading-overlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

/**
 * Set up bulk operations for an entity table
 * @param {string} tableId - ID of the table element
 * @param {string} entityType - Type of entity (user, file, text, etc.)
 */
function setupBulkOperations(tableId, entityType) {
    // Add bulk action controls if they don't exist
    if (!document.getElementById('bulk-actions-container')) {
        const section = document.getElementById(`${entityType}s-section`);
        if (!section) return;
        
        const header = section.querySelector('h2');
        if (!header) return;
        
        // Create bulk actions container
        const bulkActions = document.createElement('div');
        bulkActions.id = 'bulk-actions-container';
        bulkActions.className = 'mb-4 p-3 bg-light rounded';
        bulkActions.innerHTML = `
            <div class="row g-2 align-items-end">
                <div class="col-md-4">
                    <label for="bulkActionType" class="form-label small">Action</label>
                    <select class="form-select form-select-sm" id="bulkActionType" onchange="updateBulkActionButton()">
                        <option value="activate">Activate</option>
                        <option value="deactivate">Deactivate</option>
                        <option value="delete">Delete</option>
                        <option value="export">Export</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <input type="hidden" id="bulkEntityType" value="${entityType}">
                    <button id="bulkActionBtn" class="btn btn-sm btn-primary w-100" onclick="performBulkAction()" disabled>
                        <i class="bi bi-check2-all me-1"></i> Apply to Selected (0)
                    </button>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-sm btn-outline-secondary" onclick="toggleAllCheckboxes('${entityType}')">
                        <i class="bi bi-check-square me-1"></i> Toggle All
                    </button>
                </div>
            </div>
        `;
        
        // Insert after header
        header.after(bulkActions);
    }
    
    // Set up table checkboxes
    setupTableCheckboxes(tableId, entityType);
}

/**
 * Set up checkboxes for bulk operations in a table
 * @param {string} tableId - ID of the table element
 * @param {string} entityType - Type of entity (user, file, text, etc.)
 */
function setupTableCheckboxes(tableId, entityType) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    // Add checkbox column to header if it doesn't exist
    const headerRow = table.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('.bulk-checkbox-th')) {
        const checkboxTh = document.createElement('th');
        checkboxTh.className = 'bulk-checkbox-th';
        checkboxTh.style.width = '40px';
        checkboxTh.innerHTML = '';
        headerRow.insertBefore(checkboxTh, headerRow.firstChild);
    }
    
    // Add checkboxes to each row
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        // Skip if already has checkbox
        if (row.querySelector('.bulk-checkbox-td')) return;
        
        // Get entity ID from data attribute or find it in the row
        let entityId = row.getAttribute('data-id');
        if (!entityId) {
            // Try to extract ID from actions or other elements
            const actionBtn = row.querySelector('[onclick*="edit"], [onclick*="view"], [onclick*="delete"]');
            if (actionBtn) {
                const onclickAttr = actionBtn.getAttribute('onclick');
                const match = onclickAttr.match(/['"](^'+"]+)['"]\)/);
                if (match && match[1]) entityId = match[1];
            }
        }
        
        if (entityId) {
            const checkboxTd = document.createElement('td');
            checkboxTd.className = 'bulk-checkbox-td';
            checkboxTd.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input select-${entityType}-checkbox" type="checkbox" value="${entityId}" onchange="updateBulkActionButton()">
                </div>
            `;
            row.insertBefore(checkboxTd, row.firstChild);
        }
    });
}

/**
 * Toggle all checkboxes for an entity type
 * @param {string} entityType - Type of entity (user, file, text, etc.)
 */
function toggleAllCheckboxes(entityType) {
    const checkboxes = document.querySelectorAll(`.select-${entityType}-checkbox`);
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    
    // If any are unchecked, check all, otherwise uncheck all
    checkboxes.forEach(cb => cb.checked = anyUnchecked);
    
    // Update button state
    updateBulkActionButton();
}

/**
 * Update the bulk action button to show selected count
 */
function updateBulkActionButton() {
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    if (!bulkActionBtn) return;
    
    const entityType = document.getElementById('bulkEntityType')?.value || 'item';
    const checkboxes = document.querySelectorAll(`.select-${entityType}-checkbox:checked`);
    const count = checkboxes.length;
    
    // Update button text and state
    const actionType = document.getElementById('bulkActionType')?.value || 'apply';
    bulkActionBtn.textContent = `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} to Selected (${count})`;
    bulkActionBtn.disabled = count === 0;
    
    // Add icon based on action type
    let icon = 'bi-check2-all';
    switch (actionType) {
        case 'activate': icon = 'bi-check-circle'; break;
        case 'deactivate': icon = 'bi-dash-circle'; break;
        case 'delete': icon = 'bi-trash'; break;
        case 'export': icon = 'bi-download'; break;
    }
    
    bulkActionBtn.innerHTML = `<i class="bi ${icon} me-1"></i> ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} to Selected (${count})`;
}

/**
 * Handle admin error
 */
function handleAdminError(error) {
    console.error('Admin panel error:', error);
    
    // Hide loading indicator
    hideLoadingIndicator();
    
    // Show error message
    showAdminMessage(`An error occurred: ${error.message}. Please try again.`, 'danger');
}
