/**
 * Admin Panel Bulk Operations
 * Provides functionality for performing actions on multiple items at once
 */

/**
 * Perform bulk action based on selection
 */
function performBulkAction() {
    const actionType = document.getElementById('bulkActionType').value;
    const entityType = document.getElementById('bulkEntityType').value;
    const selectedIds = getSelectedItems(entityType);
    
    if (selectedIds.length === 0) {
        showAdminMessage('Please select at least one item to perform bulk action', 'warning');
        return;
    }
    
    // Confirm before proceeding
    if (!confirm(`Are you sure you want to ${actionType} ${selectedIds.length} ${entityType}?`)) {
        return;
    }
    
    // Show loading state
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    const originalText = bulkActionBtn.innerHTML;
    bulkActionBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    bulkActionBtn.disabled = true;
    
    // Perform action based on type
    switch (actionType) {
        case 'activate':
            bulkActivate(entityType, selectedIds);
            break;
        case 'deactivate':
            bulkDeactivate(entityType, selectedIds);
            break;
        case 'delete':
            bulkDelete(entityType, selectedIds);
            break;
        case 'export':
            bulkExport(entityType, selectedIds);
            break;
        default:
            showAdminMessage('Invalid action type', 'danger');
    }
    
    // Reset button (in real app, this would be done after the action completes)
    setTimeout(() => {
        bulkActionBtn.innerHTML = originalText;
        bulkActionBtn.disabled = false;
    }, 1500);
}

/**
 * Get selected item IDs based on entity type
 */
function getSelectedItems(entityType) {
    const selectedIds = [];
    
    // Get all checkboxes for the entity type
    const checkboxSelector = `.select-${entityType}-checkbox:checked`;
    document.querySelectorAll(checkboxSelector).forEach(checkbox => {
        selectedIds.push(checkbox.value);
    });
    
    return selectedIds;
}

/**
 * Toggle selection of all items of a specific type
 */
function toggleSelectAll(entityType) {
    const masterCheckbox = document.getElementById(`select-all-${entityType}`);
    const isChecked = masterCheckbox.checked;
    
    document.querySelectorAll(`.select-${entityType}-checkbox`).forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    // Update bulk action button status
    updateBulkActionButton();
}

/**
 * Update bulk action button based on selections
 */
function updateBulkActionButton() {
    const entityType = document.getElementById('bulkEntityType').value;
    const selectedCount = document.querySelectorAll(`.select-${entityType}-checkbox:checked`).length;
    
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    if (bulkActionBtn) {
        bulkActionBtn.disabled = selectedCount === 0;
        
        // Update button text to show count
        const actionType = document.getElementById('bulkActionType').value;
        bulkActionBtn.textContent = `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} (${selectedCount})`;
    }
}

/**
 * Bulk activate items
 */
function bulkActivate(entityType, ids) {
    try {
        // Create batch update
        const batch = firebase.firestore().batch();
        
        ids.forEach(id => {
            const ref = firebase.firestore().collection(`${entityType}s`).doc(id);
            batch.update(ref, {
                isActive: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        // Commit the batch
        batch.commit()
        .then(() => {
            // Update local data based on entity type
            updateLocalDataAfterBulkAction(entityType, ids, 'activate');
            
            showAdminMessage(`Successfully activated ${ids.length} ${entityType}s`, 'success');
        })
        .catch(error => {
            console.error(`Error activating ${entityType}s:`, error);
            showAdminMessage(`Error activating ${entityType}s: ${error.message}`, 'danger');
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // For demo purposes, still update UI
        updateLocalDataAfterBulkAction(entityType, ids, 'activate');
        showAdminMessage(`Successfully activated ${ids.length} ${entityType}s (demo mode)`, 'success');
    }
}

/**
 * Bulk deactivate items
 */
function bulkDeactivate(entityType, ids) {
    try {
        // Create batch update
        const batch = firebase.firestore().batch();
        
        ids.forEach(id => {
            const ref = firebase.firestore().collection(`${entityType}s`).doc(id);
            batch.update(ref, {
                isActive: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        // Commit the batch
        batch.commit()
        .then(() => {
            // Update local data based on entity type
            updateLocalDataAfterBulkAction(entityType, ids, 'deactivate');
            
            showAdminMessage(`Successfully deactivated ${ids.length} ${entityType}s`, 'success');
        })
        .catch(error => {
            console.error(`Error deactivating ${entityType}s:`, error);
            showAdminMessage(`Error deactivating ${entityType}s: ${error.message}`, 'danger');
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // For demo purposes, still update UI
        updateLocalDataAfterBulkAction(entityType, ids, 'deactivate');
        showAdminMessage(`Successfully deactivated ${ids.length} ${entityType}s (demo mode)`, 'success');
    }
}

/**
 * Bulk delete items
 */
function bulkDelete(entityType, ids) {
    // Extra confirmation for delete
    if (!confirm(`WARNING: This will permanently delete ${ids.length} ${entityType}s. This action cannot be undone. Are you absolutely sure?`)) {
        return;
    }
    
    try {
        // Create batch update
        const batch = firebase.firestore().batch();
        
        ids.forEach(id => {
            const ref = firebase.firestore().collection(`${entityType}s`).doc(id);
            batch.delete(ref);
        });
        
        // Commit the batch
        batch.commit()
        .then(() => {
            // Update local data based on entity type
            updateLocalDataAfterBulkAction(entityType, ids, 'delete');
            
            showAdminMessage(`Successfully deleted ${ids.length} ${entityType}s`, 'success');
        })
        .catch(error => {
            console.error(`Error deleting ${entityType}s:`, error);
            showAdminMessage(`Error deleting ${entityType}s: ${error.message}`, 'danger');
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // For demo purposes, still update UI
        updateLocalDataAfterBulkAction(entityType, ids, 'delete');
        showAdminMessage(`Successfully deleted ${ids.length} ${entityType}s (demo mode)`, 'success');
    }
}

/**
 * Bulk export items
 */
function bulkExport(entityType, ids) {
    // Determine which data array to use based on entity type
    let dataArray;
    switch (entityType) {
        case 'user':
            dataArray = window.allUsers || [];
            break;
        case 'file':
            dataArray = window.allFiles || [];
            break;
        case 'text':
            dataArray = window.allTexts || [];
            break;
        case 'website':
            dataArray = window.allWebsites || [];
            break;
        case 'bot':
            dataArray = window.allBots || [];
            break;
        default:
            showAdminMessage(`Export not supported for ${entityType}`, 'danger');
            return;
    }
    
    // Filter data to only include selected items
    const exportData = dataArray.filter(item => ids.includes(item.id));
    
    // If no data, show error
    if (exportData.length === 0) {
        showAdminMessage('No data found to export', 'warning');
        return;
    }
    
    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create a blob
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}s_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    showAdminMessage(`Successfully exported ${exportData.length} ${entityType}s`, 'success');
}

/**
 * Update local data arrays after bulk action
 */
function updateLocalDataAfterBulkAction(entityType, ids, action) {
    // Get the appropriate data array
    let dataArray;
    switch (entityType) {
        case 'user':
            dataArray = window.allUsers;
            break;
        case 'file':
            dataArray = window.allFiles;
            break;
        case 'text':
            dataArray = window.allTexts;
            break;
        case 'website':
            dataArray = window.allWebsites;
            break;
        case 'bot':
            dataArray = window.allBots;
            break;
        default:
            return; // Not supported
    }
    
    // If data array doesn't exist, return
    if (!dataArray) return;
    
    // Update the data array based on action
    if (action === 'delete') {
        // Remove items from array
        for (let i = dataArray.length - 1; i >= 0; i--) {
            if (ids.includes(dataArray[i].id)) {
                dataArray.splice(i, 1);
            }
        }
    } else {
        // For activate/deactivate, update isActive property
        dataArray.forEach(item => {
            if (ids.includes(item.id)) {
                item.isActive = (action === 'activate');
                item.updatedAt = new Date();
            }
        });
    }
    
    // Update UI based on entity type
    updateEntityUI(entityType);
}

/**
 * Update UI based on entity type
 */
function updateEntityUI(entityType) {
    switch (entityType) {
        case 'user':
            updateUsersTable();
            break;
        case 'file':
            updateFilesTable();
            break;
        case 'text':
            updateTextsTable();
            break;
        case 'website':
            updateWebsitesTable();
            break;
        case 'bot':
            updateBotsTable();
            break;
    }
    
    // Also update dashboard if it exists
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

/**
 * Set up bulk action checkboxes for entity tables
 */
function setupBulkActionCheckboxes(tableId, entityType) {
    // Add header checkbox
    const tableHead = document.querySelector(`#${tableId} thead tr`);
    if (tableHead) {
        // Check if checkbox column already exists
        if (!tableHead.querySelector('.bulk-checkbox-th')) {
            const checkboxTh = document.createElement('th');
            checkboxTh.className = 'bulk-checkbox-th';
            checkboxTh.style.width = '40px';
            checkboxTh.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="select-all-${entityType}" onchange="toggleSelectAll('${entityType}')">
                </div>
            `;
            tableHead.insertBefore(checkboxTh, tableHead.firstChild);
        }
    }
    
    // Add checkboxes to all rows
    const tableRows = document.querySelectorAll(`#${tableId} tbody tr`);
    tableRows.forEach(row => {
        // Skip if already has checkbox
        if (row.querySelector('.bulk-checkbox-td')) return;
        
        const itemId = row.getAttribute('data-id');
        if (!itemId) return;
        
        const checkboxTd = document.createElement('td');
        checkboxTd.className = 'bulk-checkbox-td';
        checkboxTd.innerHTML = `
            <div class="form-check">
                <input class="form-check-input select-${entityType}-checkbox" type="checkbox" value="${itemId}" onchange="updateBulkActionButton()">
            </div>
        `;
        row.insertBefore(checkboxTd, row.firstChild);
    });
}

/**
 * Setup bulk action controls
 */
function setupBulkActionControls() {
    // Find the users section header
    const usersSection = document.getElementById('users-section');
    if (usersSection && !document.getElementById('bulk-actions-container')) {
        // Create bulk action controls
        const bulkActions = document.createElement('div');
        bulkActions.id = 'bulk-actions-container';
        bulkActions.className = 'mb-3 p-3 bg-light rounded';
        bulkActions.innerHTML = `
            <div class="row align-items-end">
                <div class="col-md-4">
                    <label for="bulkEntityType" class="form-label">Entity Type</label>
                    <select class="form-select" id="bulkEntityType" onchange="updateBulkActionButton()">
                        <option value="user">Users</option>
                        <option value="file">Files</option>
                        <option value="text">Texts</option>
                        <option value="website">Websites</option>
                        <option value="bot">Bots</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label for="bulkActionType" class="form-label">Action</label>
                    <select class="form-select" id="bulkActionType" onchange="updateBulkActionButton()">
                        <option value="activate">Activate</option>
                        <option value="deactivate">Deactivate</option>
                        <option value="delete">Delete</option>
                        <option value="export">Export</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <button id="bulkActionBtn" class="btn btn-primary w-100" onclick="performBulkAction()" disabled>
                        Perform Action (0)
                    </button>
                </div>
            </div>
        `;
        
        // Insert after the header but before the table
        const header = usersSection.querySelector('h2');
        if (header) {
            header.parentNode.insertBefore(bulkActions, header.nextSibling);
        } else {
            usersSection.insertBefore(bulkActions, usersSection.firstChild);
        }
    }
}
