/**
 * Admin Panel Monitoring Features
 * Provides system health and content moderation functionality
 */

/**
 * Load system health data
 */
function loadSystemHealthData() {
    try {
        // Try to load from Firestore
        firebase.firestore().collection('systemHealth')
            .orderBy('timestamp', 'desc')
            .limit(50) // Get the latest 50 entries
            .get()
            .then((querySnapshot) => {
                systemHealthData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    systemHealthData.push({
                        id: doc.id,
                        cpuUsage: data.cpuUsage || 0,
                        memoryUsage: data.memoryUsage || 0,
                        storageUsage: data.storageUsage || 0,
                        activeUsers: data.activeUsers || 0,
                        apiRequests: data.apiRequests || 0,
                        responseTime: data.responseTime || 0,
                        errorRate: data.errorRate || 0,
                        timestamp: data.timestamp?.toDate() || new Date()
                    });
                });
                
                updateSystemHealthUI();
            })
            .catch(error => {
                console.error('Error loading system health data:', error);
                generateSampleSystemHealthData(); // Fallback to sample data
            });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        generateSampleSystemHealthData(); // Fallback to sample data
    }
}

/**
 * Generate sample system health data for testing
 */
function generateSampleSystemHealthData() {
    systemHealthData = [];
    
    // Generate 24 hours of sample data at 30-minute intervals
    for (let i = 0; i < 48; i++) {
        const timestamp = new Date();
        timestamp.setMinutes(0);
        timestamp.setSeconds(0);
        timestamp.setMilliseconds(0);
        timestamp.setTime(timestamp.getTime() - (i * 30 * 60 * 1000)); // 30-minute intervals
        
        // Generate random but somewhat realistic values
        // CPU usage between 10-80%
        const cpuUsage = 10 + Math.floor(Math.random() * 70);
        
        // Memory usage between 20-70%
        const memoryUsage = 20 + Math.floor(Math.random() * 50);
        
        // Storage usage increases slightly over time (70-75%)
        const storageUsage = 70 + (i % 5);
        
        // Active users between 5-50
        const activeUsers = 5 + Math.floor(Math.random() * 45);
        
        // API requests between 50-500
        const apiRequests = 50 + Math.floor(Math.random() * 450);
        
        // Response time between 200-800ms
        const responseTime = 200 + Math.floor(Math.random() * 600);
        
        // Error rate between 0-5%
        const errorRate = Math.random() * 5;
        
        systemHealthData.push({
            id: `health_${i}`,
            cpuUsage,
            memoryUsage,
            storageUsage,
            activeUsers,
            apiRequests,
            responseTime,
            errorRate,
            timestamp
        });
    }
    
    // Sort by timestamp (newest first)
    systemHealthData.sort((a, b) => b.timestamp - a.timestamp);
    
    updateSystemHealthUI();
}

/**
 * Update the system health UI elements
 */
function updateSystemHealthUI() {
    // Update current metrics
    if (systemHealthData.length > 0) {
        const latest = systemHealthData[0]; // Most recent data point
        
        // Update CPU usage gauge
        updateGauge('cpuGauge', latest.cpuUsage, 'CPU Usage');
        
        // Update Memory usage gauge
        updateGauge('memoryGauge', latest.memoryUsage, 'Memory Usage');
        
        // Update Storage usage gauge
        updateGauge('storageGauge', latest.storageUsage, 'Storage Usage');
        
        // Update active users count
        const activeUsersElement = document.getElementById('activeUsersCount');
        if (activeUsersElement) {
            activeUsersElement.textContent = latest.activeUsers;
        }
        
        // Update API requests count
        const apiRequestsElement = document.getElementById('apiRequestsCount');
        if (apiRequestsElement) {
            apiRequestsElement.textContent = latest.apiRequests;
        }
        
        // Update response time
        const responseTimeElement = document.getElementById('responseTimeValue');
        if (responseTimeElement) {
            responseTimeElement.textContent = `${latest.responseTime} ms`;
        }
        
        // Update error rate
        const errorRateElement = document.getElementById('errorRateValue');
        if (errorRateElement) {
            errorRateElement.textContent = `${latest.errorRate.toFixed(2)}%`;
        }
        
        // Update last updated timestamp
        const lastUpdatedElement = document.getElementById('healthLastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = formatDateTime(latest.timestamp);
        }
    }
    
    // Initialize or update the historical charts
    initializeSystemHealthCharts();
}

/**
 * Update a gauge chart with new value
 */
function updateGauge(elementId, value, label) {
    const gaugeElement = document.getElementById(elementId);
    if (!gaugeElement) return;
    
    // Determine color based on value
    let color = '#4CAF50'; // Green for good
    
    if (value > 90) {
        color = '#F44336'; // Red for critical
    } else if (value > 75) {
        color = '#FF9800'; // Orange for warning
    } else if (value > 60) {
        color = '#FFEB3B'; // Yellow for caution
    }
    
    // Destroy existing chart if it exists
    if (window[`${elementId}Instance`]) {
        window[`${elementId}Instance`].destroy();
    }
    
    // Create new gauge chart
    window[`${elementId}Instance`] = new Chart(gaugeElement, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: [color, '#E0E0E0'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            circumference: 180,
            rotation: -90,
            maintainAspectRatio: false,
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false },
                title: {
                    display: true,
                    text: label,
                    position: 'bottom',
                    font: { size: 14 }
                }
            }
        },
        plugins: [{
            id: 'gaugeText',
            afterDraw: (chart) => {
                const { ctx, width, height } = chart;
                ctx.save();
                
                const fontSize = (height / 114).toFixed(2);
                ctx.font = `${fontSize}em sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                
                const text = `${value}%`;
                const textX = width / 2;
                const textY = height - (height / 3.5);
                
                ctx.fillStyle = '#212529';
                ctx.fillText(text, textX, textY);
                ctx.restore();
            }
        }]
    });
}

/**
 * Initialize system health historical charts
 */
function initializeSystemHealthCharts() {
    // Reverse the array for charts (oldest to newest)
    const chartData = [...systemHealthData].reverse();
    
    // Only proceed if we have data
    if (chartData.length === 0) return;
    
    // Prepare data for charts
    const timestamps = chartData.map(item => formatTimeOnly(item.timestamp));
    const cpuData = chartData.map(item => item.cpuUsage);
    const memoryData = chartData.map(item => item.memoryUsage);
    const apiRequestsData = chartData.map(item => item.apiRequests);
    const responseTimeData = chartData.map(item => item.responseTime);
    
    // CPU & Memory Usage Chart
    createLineChart('resourceUsageChart', timestamps, 
        [
            { label: 'CPU Usage (%)', data: cpuData, borderColor: 'rgba(76, 175, 80, 1)', tension: 0.3 },
            { label: 'Memory Usage (%)', data: memoryData, borderColor: 'rgba(33, 150, 243, 1)', tension: 0.3 }
        ], 
        'Resource Usage Over Time'
    );
    
    // API Requests Chart
    createLineChart('apiRequestsChart', timestamps, 
        [
            { label: 'API Requests', data: apiRequestsData, borderColor: 'rgba(156, 39, 176, 1)', tension: 0.3 }
        ], 
        'API Requests Over Time'
    );
    
    // Response Time Chart
    createLineChart('responseTimeChart', timestamps, 
        [
            { label: 'Response Time (ms)', data: responseTimeData, borderColor: 'rgba(255, 152, 0, 1)', tension: 0.3 }
        ], 
        'Response Time Over Time'
    );
}

/**
 * Create a line chart with the given data
 */
function createLineChart(elementId, labels, datasets, title) {
    const chartElement = document.getElementById(elementId);
    if (!chartElement) return;
    
    // Destroy existing chart if it exists
    if (window[`${elementId}Instance`]) {
        window[`${elementId}Instance`].destroy();
    }
    
    // Process datasets to add background colors and fills
    const processedDatasets = datasets.map((dataset, index) => {
        const color = dataset.borderColor.replace('1)', '0.1)');
        return {
            ...dataset,
            backgroundColor: color,
            fill: true,
            pointRadius: 0,
            borderWidth: 2
        };
    });
    
    // Create new chart
    window[`${elementId}Instance`] = new Chart(chartElement, {
        type: 'line',
        data: {
            labels: labels,
            datasets: processedDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 14
                    }
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

/**
 * Refresh system health data
 */
function refreshSystemHealth() {
    // Show loading indicator
    const refreshBtn = document.getElementById('refreshHealthBtn');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
        refreshBtn.disabled = true;
        
        // Reload data with a slight delay to simulate API call
        setTimeout(() => {
            loadSystemHealthData();
            
            // Reset button
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
            
            // Show success message
            showAdminMessage('System health data refreshed', 'success');
        }, 1000);
    } else {
        // Just reload if button not found
        loadSystemHealthData();
    }
}

/**
 * Format date time for display
 */
function formatDateTime(date) {
    if (!date) return 'N/A';
    
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Format time only for chart labels
 */
function formatTimeOnly(date) {
    if (!date) return '';
    
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Load content moderation queue
 */
function loadContentModerationQueue() {
    try {
        // Try to load from Firestore
        firebase.firestore().collection('contentModeration')
            .where('status', '==', 'pending')
            .orderBy('reportedAt', 'desc')
            .limit(20) // Get the 20 most recent items
            .get()
            .then((querySnapshot) => {
                contentQueue = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    contentQueue.push({
                        id: doc.id,
                        contentType: data.contentType || 'unknown',
                        contentId: data.contentId || '',
                        reportReason: data.reportReason || 'inappropriate',
                        reportedBy: data.reportedBy || '',
                        reportedAt: data.reportedAt?.toDate() || new Date(),
                        status: data.status || 'pending',
                        contentPreview: data.contentPreview || 'No preview available'
                    });
                });
                
                updateContentModerationUI();
            })
            .catch(error => {
                console.error('Error loading moderation queue:', error);
                generateSampleContentQueue(); // Fallback to sample data
            });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        generateSampleContentQueue(); // Fallback to sample data
    }
}

/**
 * Generate sample content moderation queue for testing
 */
function generateSampleContentQueue() {
    contentQueue = [
        {
            id: 'mod_1',
            contentType: 'text',
            contentId: 'text_123',
            reportReason: 'inappropriate',
            reportedBy: 'user_1',
            reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            status: 'pending',
            contentPreview: 'This text contains potentially inappropriate language that violates our terms of service...'
        },
        {
            id: 'mod_2',
            contentType: 'file',
            contentId: 'file_456',
            reportReason: 'copyright',
            reportedBy: 'user_2',
            reportedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
            status: 'pending',
            contentPreview: 'Copyright protected content from XYZ company...' 
        },
        {
            id: 'mod_3',
            contentType: 'bot',
            contentId: 'bot_789',
            reportReason: 'harmful',
            reportedBy: 'user_3',
            reportedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
            status: 'pending',
            contentPreview: 'This bot appears to be providing harmful advice regarding financial investments...'
        },
        {
            id: 'mod_4',
            contentType: 'website',
            contentId: 'website_101',
            reportReason: 'misinformation',
            reportedBy: 'user_4',
            reportedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
            status: 'pending',
            contentPreview: 'This website contains factually incorrect information about health topics...'
        },
        {
            id: 'mod_5',
            contentType: 'text',
            contentId: 'text_202',
            reportReason: 'spam',
            reportedBy: 'user_5',
            reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            status: 'pending',
            contentPreview: 'Buy the best products at amazingly low prices! Click here now to get 90% off...'
        }
    ];
    
    updateContentModerationUI();
}

/**
 * Update content moderation UI
 */
function updateContentModerationUI() {
    const moderationContainer = document.getElementById('contentModerationQueue');
    if (!moderationContainer) return;
    
    if (contentQueue.length === 0) {
        moderationContainer.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-check-circle-fill text-success fs-1 mb-3"></i>
                <h5>All Clear!</h5>
                <p class="text-muted">There are no items waiting for moderation.</p>
            </div>
        `;
        return;
    }
    
    // Create HTML for each item in the queue
    let html = '';
    
    contentQueue.forEach(item => {
        const reportedDate = formatDateTime(item.reportedAt);
        
        // Map content type to icon
        let typeIcon = 'bi-file-text';
        switch (item.contentType) {
            case 'file':
                typeIcon = 'bi-file-earmark';
                break;
            case 'bot':
                typeIcon = 'bi-robot';
                break;
            case 'website':
                typeIcon = 'bi-globe';
                break;
        }
        
        // Map reason to badge color
        let reasonClass = 'bg-secondary';
        switch (item.reportReason) {
            case 'inappropriate':
                reasonClass = 'bg-danger';
                break;
            case 'copyright':
                reasonClass = 'bg-primary';
                break;
            case 'harmful':
                reasonClass = 'bg-warning text-dark';
                break;
            case 'misinformation':
                reasonClass = 'bg-info text-dark';
                break;
            case 'spam':
                reasonClass = 'bg-dark';
                break;
        }
        
        html += `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi ${typeIcon} me-2"></i>
                        <span class="fw-bold">${item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1)}</span>
                        <span class="badge ${reasonClass} ms-2">${item.reportReason}</span>
                    </div>
                    <div class="small text-muted">
                        Reported: ${reportedDate}
                    </div>
                </div>
                <div class="card-body">
                    <p class="content-preview">${item.contentPreview}</p>
                    <div class="small text-muted mb-3">
                        Reported by User ID: ${item.reportedBy}
                    </div>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-sm btn-danger me-2 reject-content-btn" data-id="${item.id}">
                            <i class="bi bi-x-circle me-1"></i> Remove Content
                        </button>
                        <button class="btn btn-sm btn-success approve-content-btn" data-id="${item.id}">
                            <i class="bi bi-check-circle me-1"></i> Approve Content
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    moderationContainer.innerHTML = html;
}

/**
 * Approve content from moderation queue
 */
function approveContent(itemId) {
    // Find the item
    const itemIndex = contentQueue.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    try {
        // Update in Firestore
        firebase.firestore().collection('contentModeration').doc(itemId).update({
            status: 'approved',
            moderatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            moderatedBy: firebase.auth().currentUser.uid
        })
        .then(() => {
            // Remove from local queue and update UI
            contentQueue.splice(itemIndex, 1);
            updateContentModerationUI();
            
            showAdminMessage('Content approved and removed from moderation queue', 'success');
        })
        .catch(error => {
            console.error('Error approving content:', error);
            showAdminMessage('Error approving content: ' + error.message, 'danger');
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Update UI anyway for demo purposes
        contentQueue.splice(itemIndex, 1);
        updateContentModerationUI();
        
        showAdminMessage('Content approved (demo mode)', 'success');
    }
}

/**
 * Reject/remove content from moderation queue
 */
function rejectContent(itemId) {
    // Find the item
    const itemIndex = contentQueue.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const item = contentQueue[itemIndex];
    
    try {
        // Update in Firestore - we'll use a batch to update both collections
        const batch = firebase.firestore().batch();
        
        // Update moderation status
        const moderationRef = firebase.firestore().collection('contentModeration').doc(itemId);
        batch.update(moderationRef, {
            status: 'rejected',
            moderatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            moderatedBy: firebase.auth().currentUser.uid
        });
        
        // Also mark the actual content as removed
        // This would depend on your data structure
        const contentRef = firebase.firestore().collection(item.contentType + 's').doc(item.contentId);
        batch.update(contentRef, {
            status: 'removed',
            removedAt: firebase.firestore.FieldValue.serverTimestamp(),
            removedBy: firebase.auth().currentUser.uid,
            removalReason: item.reportReason
        });
        
        // Commit the batch
        batch.commit()
        .then(() => {
            // Remove from local queue and update UI
            contentQueue.splice(itemIndex, 1);
            updateContentModerationUI();
            
            showAdminMessage('Content rejected and removed from the platform', 'success');
        })
        .catch(error => {
            console.error('Error rejecting content:', error);
            showAdminMessage('Error rejecting content: ' + error.message, 'danger');
        });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        // Update UI anyway for demo purposes
        contentQueue.splice(itemIndex, 1);
        updateContentModerationUI();
        
        showAdminMessage('Content rejected (demo mode)', 'success');
    }
}
