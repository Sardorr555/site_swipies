/**
 * Admin Panel Advanced Features
 * Provides enhanced functionality for the admin panel
 */

// Global variables for advanced admin functionality
let userActivityData = [];
let systemHealthData = [];
let contentQueue = [];
let emailTemplates = [];

/**
 * Initialize advanced admin features when the document is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners for advanced features
    setupAdvancedEventListeners();
    
    // Load additional data if on the admin page
    if (document.querySelector('.admin-container')) {
        loadUserActivityData();
        loadSystemHealthData();
        loadContentModerationQueue();
        loadEmailTemplates();
    }
});

/**
 * Set up event listeners for advanced admin features
 */
function setupAdvancedEventListeners() {
    // User activity date range selector
    const activityRangeSelector = document.getElementById('activityRangeSelector');
    if (activityRangeSelector) {
        activityRangeSelector.addEventListener('change', function() {
            updateUserActivityChart(this.value);
        });
    }
    
    // Bulk operation buttons
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    if (bulkActionBtn) {
        bulkActionBtn.addEventListener('click', performBulkAction);
    }
    
    // System health refresh button
    const refreshHealthBtn = document.getElementById('refreshHealthBtn');
    if (refreshHealthBtn) {
        refreshHealthBtn.addEventListener('click', refreshSystemHealth);
    }
    
    // Content moderation buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('approve-content-btn')) {
            approveContent(e.target.getAttribute('data-id'));
        } else if (e.target && e.target.classList.contains('reject-content-btn')) {
            rejectContent(e.target.getAttribute('data-id'));
        }
    });
    
    // Email template editor save button
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveEmailTemplate);
    }
}

/**
 * Load user activity data for analytics
 */
function loadUserActivityData() {
    try {
        // Try to load from Firestore
        firebase.firestore().collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(1000) // Limit to last 1000 activities
            .get()
            .then((querySnapshot) => {
                userActivityData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    userActivityData.push({
                        id: doc.id,
                        userId: data.userId,
                        action: data.action,
                        timestamp: data.timestamp?.toDate() || new Date(),
                        details: data.details || {}
                    });
                });
                
                // Update the activity chart with the data
                initializeUserActivityChart();
            })
            .catch(error => {
                console.error('Error loading user activity data:', error);
                generateSampleUserActivityData(); // Fallback to sample data
            });
    } catch (error) {
        console.error('Error accessing Firestore:', error);
        generateSampleUserActivityData(); // Fallback to sample data
    }
}

/**
 * Generate sample user activity data for testing
 */
function generateSampleUserActivityData() {
    userActivityData = [];
    
    // Generate 30 days of sample data
    const actions = ['login', 'file_upload', 'file_download', 'create_bot', 'text_added', 'website_parsed'];
    const userIds = Array.from({length: 10}, (_, i) => `user_${i+1}`);
    
    for (let i = 0; i < 30; i++) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        
        // Generate random number of activities per day (5-25)
        const activitiesCount = Math.floor(Math.random() * 20) + 5;
        
        for (let j = 0; j < activitiesCount; j++) {
            const action = actions[Math.floor(Math.random() * actions.length)];
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            
            // Random time during the day
            const timestamp = new Date(day);
            timestamp.setHours(Math.floor(Math.random() * 24));
            timestamp.setMinutes(Math.floor(Math.random() * 60));
            
            userActivityData.push({
                id: `activity_${i}_${j}`,
                userId: userId,
                action: action,
                timestamp: timestamp,
                details: {
                    ip: `192.168.1.${Math.floor(Math.random() * 255)}`
                }
            });
        }
    }
    
    // Sort by timestamp
    userActivityData.sort((a, b) => b.timestamp - a.timestamp);
    
    // Update the activity chart with the data
    initializeUserActivityChart();
}

/**
 * Initialize user activity chart
 */
function initializeUserActivityChart() {
    const activityChartCanvas = document.getElementById('userActivityChart');
    if (!activityChartCanvas) return;
    
    // Process data for the chart - default to 7 days
    updateUserActivityChart('7days');
}

/**
 * Update user activity chart based on selected range
 */
function updateUserActivityChart(range) {
    const activityChartCanvas = document.getElementById('userActivityChart');
    if (!activityChartCanvas) return;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch(range) {
        case '24hours':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case '7days':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '30days':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case '90days':
            startDate.setDate(endDate.getDate() - 90);
            break;
        default:
            startDate.setDate(endDate.getDate() - 7); // Default to 7 days
    }
    
    // Filter activities within the date range
    const filteredActivities = userActivityData.filter(activity => {
        return activity.timestamp >= startDate && activity.timestamp <= endDate;
    });
    
    // Count activities by type
    const actionCounts = {};
    const actions = ['login', 'file_upload', 'file_download', 'create_bot', 'text_added', 'website_parsed'];
    
    actions.forEach(action => {
        actionCounts[action] = filteredActivities.filter(a => a.action === action).length;
    });
    
    // Count activities by day
    const dailyActivityCounts = {};
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        dailyActivityCounts[dateString] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    filteredActivities.forEach(activity => {
        const dateString = activity.timestamp.toISOString().split('T')[0];
        if (dailyActivityCounts[dateString] !== undefined) {
            dailyActivityCounts[dateString]++;
        }
    });
    
    // Convert to arrays for Chart.js
    const dates = Object.keys(dailyActivityCounts);
    const counts = Object.values(dailyActivityCounts);
    
    // Destroy existing chart if it exists
    if (window.userActivityChartInstance) {
        window.userActivityChartInstance.destroy();
    }
    
    // Create new chart
    window.userActivityChartInstance = new Chart(activityChartCanvas, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'User Activity',
                data: counts,
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Activities'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'User Activity Over Time'
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const date = new Date(tooltipItems[0].label);
                            return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
                        }
                    }
                }
            }
        }
    });
    
    // Update activity breakdown doughnut chart
    updateActivityBreakdownChart(actionCounts);
}

/**
 * Update activity breakdown doughnut chart
 */
function updateActivityBreakdownChart(actionCounts) {
    const breakdownChartCanvas = document.getElementById('activityBreakdownChart');
    if (!breakdownChartCanvas) return;
    
    // Destroy existing chart if it exists
    if (window.activityBreakdownChartInstance) {
        window.activityBreakdownChartInstance.destroy();
    }
    
    // Action labels mapping
    const actionLabels = {
        'login': 'Logins',
        'file_upload': 'File Uploads',
        'file_download': 'File Downloads',
        'create_bot': 'Bot Creations',
        'text_added': 'Texts Added',
        'website_parsed': 'Websites Parsed'
    };
    
    // Chart colors
    const chartColors = [
        'rgba(67, 97, 238, 0.8)',
        'rgba(76, 201, 240, 0.8)',
        'rgba(76, 201, 160, 0.8)',
        'rgba(252, 166, 82, 0.8)',
        'rgba(230, 57, 70, 0.8)',
        'rgba(148, 0, 211, 0.8)'
    ];
    
    // Create arrays for Chart.js
    const labels = Object.keys(actionCounts).map(key => actionLabels[key] || key);
    const data = Object.values(actionCounts);
    
    // Create new chart
    window.activityBreakdownChartInstance = new Chart(breakdownChartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: chartColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Activity Breakdown by Type'
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}
