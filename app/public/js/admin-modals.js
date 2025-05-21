/**
 * Admin Panel Modals
 * Contains all the modals/dialog functionality for the admin panel
 */

/**
 * Show Modal for Editing a User
 */
function showAddUserModal() {
    // Create modal element if it doesn't exist
    if (!document.getElementById('addUserModal')) {
        const modalHtml = `
            <div class="modal fade" id="addUserModal" tabindex="-1" aria-labelledby="addUserModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addUserModalLabel">Add New User</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addUserForm">
                                <div class="mb-3">
                                    <label for="newUserEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="newUserEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="newUserName" class="form-label">Display Name</label>
                                    <input type="text" class="form-control" id="newUserName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="newUserStorageLimit" class="form-label">Storage Limit (KB)</label>
                                    <input type="number" class="form-control" id="newUserStorageLimit" value="1024">
                                    <small class="form-text text-muted">Default is 1024 KB (1MB)</small>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="newUserIsAdmin">
                                    <label class="form-check-label" for="newUserIsAdmin">Admin User</label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveNewUserBtn">Add User</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal HTML to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener for form submission
        document.getElementById('saveNewUserBtn').addEventListener('click', createNewUser);
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
}

/**
 * Show Modal for Editing a User
 */
function editUser(userId) {
    // Find the user in our array
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showAdminMessage('User not found', 'danger');
        return;
    }
    
    // Create modal element if it doesn't exist
    if (!document.getElementById('editUserModal')) {
        const modalHtml = `
            <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editUserModalLabel">Edit User</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <input type="hidden" id="editUserId">
                                <div class="mb-3">
                                    <label for="editUserEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="editUserEmail" readonly>
                                    <small class="form-text text-muted">Email cannot be changed</small>
                                </div>
                                <div class="mb-3">
                                    <label for="editUserName" class="form-label">Display Name</label>
                                    <input type="text" class="form-control" id="editUserName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editUserStorageLimit" class="form-label">Storage Limit (KB)</label>
                                    <input type="number" class="form-control" id="editUserStorageLimit">
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="editUserIsAdmin">
                                    <label class="form-check-label" for="editUserIsAdmin">Admin User</label>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="editUserIsActive">
                                    <label class="form-check-label" for="editUserIsActive">Account Active</label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveUserBtn">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal HTML to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener for form submission
        document.getElementById('saveUserBtn').addEventListener('click', saveUserChanges);
    }
    
    // Fill the form with user data
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserName').value = user.displayName;
    document.getElementById('editUserStorageLimit').value = Math.round(user.storageLimit / 1024); // Convert bytes to KB
    document.getElementById('editUserIsAdmin').checked = user.isAdmin || false;
    document.getElementById('editUserIsActive').checked = user.isActive !== false; // Default to true if undefined
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

/**
 * Save User Changes
 */
function saveUserChanges() {
    const userId = document.getElementById('editUserId').value;
    const displayName = document.getElementById('editUserName').value.trim();
    const storageLimit = parseInt(document.getElementById('editUserStorageLimit').value) * 1024; // Convert KB to bytes
    const isAdmin = document.getElementById('editUserIsAdmin').checked;
    const isActive = document.getElementById('editUserIsActive').checked;
    
    // Validate input
    if (!displayName) {
        showAdminMessage('Display name is required', 'warning');
        return;
    }
    
    if (isNaN(storageLimit) || storageLimit <= 0) {
        showAdminMessage('Please enter a valid storage limit', 'warning');
        return;
    }
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Try to update user in Firestore
    firebase.firestore().collection('users').doc(userId).update({
        displayName: displayName,
        storageLimit: storageLimit,
        isAdmin: isAdmin,
        isActive: isActive,
        updatedAt: new Date()
    })
    .then(() => {
        // Update local user data
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            allUsers[userIndex].displayName = displayName;
            allUsers[userIndex].storageLimit = storageLimit;
            allUsers[userIndex].isAdmin = isAdmin;
            allUsers[userIndex].isActive = isActive;
            allUsers[userIndex].updatedAt = new Date();
        }
        
        // Update UI
        updateUsersTable();
        updateDashboard();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        modal.hide();
        
        showAdminMessage('User updated successfully', 'success');
    })
    .catch(error => {
        console.error('Error updating user:', error);
        showAdminMessage('Error updating user: ' + error.message, 'danger');
    })
    .finally(() => {
        hideLoadingIndicator();
    });
}

/**
 * Create New User
 */
function createNewUser() {
    const email = document.getElementById('newUserEmail').value.trim();
    const displayName = document.getElementById('newUserName').value.trim();
    const storageLimit = parseInt(document.getElementById('newUserStorageLimit').value) * 1024; // Convert KB to bytes
    const isAdmin = document.getElementById('newUserIsAdmin').checked;
    
    // Validate input
    if (!email || !displayName) {
        showAdminMessage('Email and display name are required', 'warning');
        return;
    }
    
    if (isNaN(storageLimit) || storageLimit <= 0) {
        showAdminMessage('Please enter a valid storage limit', 'warning');
        return;
    }
    
    // Check if email already exists
    if (allUsers.some(u => u.email === email)) {
        showAdminMessage('A user with this email already exists', 'warning');
        return;
    }
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Generate a random password for the new user
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Create user in Firebase Auth and then in Firestore
    // Note: In a real app, this would be done by the backend/admin SDK
    // This is a simplified version for demonstration
    const newUser = {
        id: 'user_' + Date.now(), // Generate temporary ID
        email: email,
        displayName: displayName,
        storageLimit: storageLimit,
        storageUsed: 0,
        isAdmin: isAdmin,
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: null
    };
    
    // Add to local array
    allUsers.push(newUser);
    
    // Update UI
    updateUsersTable();
    updateDashboard();
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
    modal.hide();
    
    // Display success message with the temporary password
    showAdminMessage(`User created successfully. Temporary password: ${tempPassword}`, 'success');
    hideLoadingIndicator();
}

/**
 * Show confirmation dialog for deleting a user
 */
function confirmDeleteUser(userId) {
    // Find the user
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showAdminMessage('User not found', 'danger');
        return;
    }
    
    // Create modal element if it doesn't exist
    if (!document.getElementById('deleteUserModal')) {
        const modalHtml = `
            <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-labelledby="deleteUserModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="deleteUserModalLabel">Confirm Delete</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete the user <strong id="deleteUserName"></strong>?</p>
                            <p class="text-danger">This action cannot be undone and will delete all data associated with this user.</p>
                            <input type="hidden" id="deleteUserId">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteUserBtn">Delete User</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal HTML to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener for confirmation
        document.getElementById('confirmDeleteUserBtn').addEventListener('click', deleteUser);
    }
    
    // Set user info in the modal
    document.getElementById('deleteUserId').value = user.id;
    document.getElementById('deleteUserName').textContent = user.displayName;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

/**
 * Delete User
 */
function deleteUser() {
    const userId = document.getElementById('deleteUserId').value;
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Try to delete user in Firestore
    firebase.firestore().collection('users').doc(userId).delete()
    .then(() => {
        // Remove from local array
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            allUsers.splice(userIndex, 1);
        }
        
        // Update UI
        updateUsersTable();
        updateDashboard();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
        modal.hide();
        
        showAdminMessage('User deleted successfully', 'success');
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showAdminMessage('Error deleting user: ' + error.message, 'danger');
    })
    .finally(() => {
        hideLoadingIndicator();
    });
}

/**
 * Show confirmation dialog for deleting a file
 */
function confirmDeleteFile(fileId) {
    // Find the file
    const file = allFiles.find(f => f.id === fileId);
    if (!file) {
        showAdminMessage('File not found', 'danger');
        return;
    }
    
    // Create modal element if it doesn't exist
    if (!document.getElementById('deleteFileModal')) {
        const modalHtml = `
            <div class="modal fade" id="deleteFileModal" tabindex="-1" aria-labelledby="deleteFileModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="deleteFileModalLabel">Confirm Delete</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete the file <strong id="deleteFileName"></strong>?</p>
                            <p class="text-danger">This action cannot be undone.</p>
                            <input type="hidden" id="deleteFileId">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteFileBtn">Delete File</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal HTML to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener for confirmation
        document.getElementById('confirmDeleteFileBtn').addEventListener('click', deleteFile);
    }
    
    // Set file info in the modal
    document.getElementById('deleteFileId').value = file.id;
    document.getElementById('deleteFileName').textContent = file.filename;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteFileModal'));
    modal.show();
}

/**
 * Delete File
 */
function deleteFile() {
    const fileId = document.getElementById('deleteFileId').value;
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Try to delete file in Firestore and Storage
    firebase.firestore().collection('files').doc(fileId).delete()
    .then(() => {
        // Remove from local array
        const fileIndex = allFiles.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            const deletedFile = allFiles[fileIndex];
            allFiles.splice(fileIndex, 1);
            
            // Also update user's storage usage if we have that info
            if (deletedFile.userId && deletedFile.size) {
                const userIndex = allUsers.findIndex(u => u.id === deletedFile.userId);
                if (userIndex !== -1 && allUsers[userIndex].storageUsed >= deletedFile.size) {
                    allUsers[userIndex].storageUsed -= deletedFile.size;
                    
                    // Update user storage in Firestore
                    firebase.firestore().collection('users').doc(deletedFile.userId).update({
                        storageUsed: allUsers[userIndex].storageUsed
                    });
                }
            }
        }
        
        // Update UI
        updateFilesTable();
        updateDashboard();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteFileModal'));
        modal.hide();
        
        showAdminMessage('File deleted successfully', 'success');
    })
    .catch(error => {
        console.error('Error deleting file:', error);
        showAdminMessage('Error deleting file: ' + error.message, 'danger');
    })
    .finally(() => {
        hideLoadingIndicator();
    });
}

/**
 * Functions for viewing and deleting other resources
 */

function viewText(textId) {
    // Find the text
    const text = allTexts.find(t => t.id === textId);
    if (!text) {
        showAdminMessage('Text not found', 'danger');
        return;
    }
    
    // Create modal element if it doesn't exist
    if (!document.getElementById('viewTextModal')) {
        const modalHtml = `
            <div class="modal fade" id="viewTextModal" tabindex="-1" aria-labelledby="viewTextModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="viewTextModalLabel">View Text</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <h6 id="viewTextTitle"></h6>
                            <div class="text-muted small mb-3">
                                <span id="viewTextInfo"></span>
                            </div>
                            <div class="border p-3 text-content" id="viewTextContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal HTML to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Set text content in the modal
    document.getElementById('viewTextTitle').textContent = text.title;
    
    // Find the user
    const user = allUsers.find(u => u.id === text.userId);
    const userName = user ? user.displayName : 'Unknown';
    
    // Set info text
    document.getElementById('viewTextInfo').textContent = `Added by ${userName} on ${formatDate(text.createdAt)}`;
    
    // Set the text content
    document.getElementById('viewTextContent').textContent = text.content;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('viewTextModal'));
    modal.show();
}

function confirmDeleteText(textId) {
    // Find the text
    const text = allTexts.find(t => t.id === textId);
    if (!text) {
        showAdminMessage('Text not found', 'danger');
        return;
    }
    
    // Create modal element if it doesn't exist
    if (!document.getElementById('deleteTextModal')) {
        const modalHtml = `
            <div class="modal fade" id="deleteTextModal" tabindex="-1" aria-labelledby="deleteTextModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="deleteTextModalLabel">Confirm Delete</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete the text <strong id="deleteTextTitle"></strong>?</p>
                            <p class="text-danger">This action cannot be undone.</p>
                            <input type="hidden" id="deleteTextId">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteTextBtn">Delete Text</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal HTML to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener for confirmation
        document.getElementById('confirmDeleteTextBtn').addEventListener('click', deleteText);
    }
    
    // Set text info in the modal
    document.getElementById('deleteTextId').value = text.id;
    document.getElementById('deleteTextTitle').textContent = text.title;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteTextModal'));
    modal.show();
}

function deleteText() {
    const textId = document.getElementById('deleteTextId').value;
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Try to delete text in Firestore
    firebase.firestore().collection('texts').doc(textId).delete()
    .then(() => {
        // Remove from local array
        const textIndex = allTexts.findIndex(t => t.id === textId);
        if (textIndex !== -1) {
            const deletedText = allTexts[textIndex];
            allTexts.splice(textIndex, 1);
            
            // Also update user's storage usage if we have that info
            if (deletedText.userId && deletedText.size) {
                const userIndex = allUsers.findIndex(u => u.id === deletedText.userId);
                if (userIndex !== -1 && allUsers[userIndex].storageUsed >= deletedText.size) {
                    allUsers[userIndex].storageUsed -= deletedText.size;
                    
                    // Update user storage in Firestore
                    firebase.firestore().collection('users').doc(deletedText.userId).update({
                        storageUsed: allUsers[userIndex].storageUsed
                    });
                }
            }
        }
        
        // Update UI
        updateTextsTable();
        updateDashboard();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTextModal'));
        modal.hide();
        
        showAdminMessage('Text deleted successfully', 'success');
    })
    .catch(error => {
        console.error('Error deleting text:', error);
        showAdminMessage('Error deleting text: ' + error.message, 'danger');
    })
    .finally(() => {
        hideLoadingIndicator();
    });
}
