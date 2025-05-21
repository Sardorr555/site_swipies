/**
 * LLM Data Platform - Common JavaScript Functions
 * Handles sidebar functionality, mobile responsiveness and UI interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile sidebar toggle
    document.querySelectorAll('.sidebar-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('show');
            
            // For tablet view (screen width between 768px and 991px)
            if (window.innerWidth >= 768 && window.innerWidth <= 991) {
                const mainContent = document.querySelector('.main-content');
                if (sidebar.classList.contains('expanded')) {
                    sidebar.classList.remove('expanded');
                    sidebar.style.width = '75px';
                    if (mainContent) {
                        mainContent.style.marginLeft = '75px';
                        mainContent.style.width = 'calc(100% - 75px)';
                    }
                } else {
                    sidebar.classList.add('expanded');
                    sidebar.style.width = '250px';
                    if (mainContent) {
                        mainContent.style.marginLeft = '250px';
                        mainContent.style.width = 'calc(100% - 250px)';
                    }
                }
            }
        });
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.querySelectorAll('.sidebar-toggle');
        let targetIsSidebarToggle = false;
        
        // Check if the click was on any sidebar toggle button
        sidebarToggle.forEach(toggle => {
            if (toggle.contains(event.target)) {
                targetIsSidebarToggle = true;
            }
        });
        
        if (window.innerWidth < 768 && 
            !sidebar.contains(event.target) && 
            !targetIsSidebarToggle &&
            sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
        }
    });

    // Form input handlers
    initializeFileUploads();
    initializeFormValidation();
});

/**
 * Initializes file upload previews and handlers
 */
function initializeFileUploads() {
    // Preview logo upload
    const logoInput = document.getElementById('agentLogo');
    const logoPreview = document.getElementById('logoPreview');
    const logoPreviewContainer = document.getElementById('logoPreviewContainer');
    const removeLogo = document.getElementById('removeLogo');

    if (logoInput && logoPreview && logoPreviewContainer) {
        logoInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    logoPreview.src = e.target.result;
                    logoPreviewContainer.classList.remove('d-none');
                }
                
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    if (removeLogo && logoInput && logoPreviewContainer) {
        removeLogo.addEventListener('click', function() {
            logoInput.value = '';
            logoPreviewContainer.classList.add('d-none');
        });
    }

    // General file upload preview for other pages
    const fileUploads = document.querySelectorAll('.file-upload-input');
    fileUploads.forEach(input => {
        input.addEventListener('change', function() {
            const fileCount = this.files.length;
            const fileCountElement = document.querySelector('.file-count');
            const fileListElement = document.querySelector('.file-list');
            
            if (fileCountElement) {
                fileCountElement.textContent = fileCount;
            }
            
            if (fileListElement) {
                fileListElement.innerHTML = '';
                
                for (let i = 0; i < fileCount; i++) {
                    const file = this.files[i];
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <i class="bi bi-file-earmark file-icon"></i>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-meta">${(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                    `;
                    fileListElement.appendChild(fileItem);
                }
            }
        });
    });
}

/**
 * Initializes form validation
 */
function initializeFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        }, false);
    });
}

/**
 * Updates active sidebar item based on current page
 */
function updateActiveSidebarItem() {
    // Get current page path
    const currentPath = window.location.pathname;
    const pageName = currentPath.split('/').pop();
    
    // Remove active class from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current page sidebar item
    let selector = `.sidebar-item[href*="${pageName}"]`;
    if (pageName === '' || pageName === '/' || pageName === 'index.html') {
        selector = '.sidebar-item[href*="main.html"]';
    }
    
    const activeItem = document.querySelector(selector);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Call this function when the DOM is ready
document.addEventListener('DOMContentLoaded', updateActiveSidebarItem);

/**
 * Handle responsive adjustments on window resize
 */
function handleResponsive() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Reset custom inline styles when screen size changes dramatically
    if (window.innerWidth < 768 || window.innerWidth > 991) {
        sidebar.style.width = '';
        if (mainContent) {
            mainContent.style.marginLeft = '';
            mainContent.style.width = '';
        }
        sidebar.classList.remove('expanded');
    }
    
    // Handle overflow issues
    document.querySelectorAll('table').forEach(table => {
        if (table.offsetWidth > table.parentElement.offsetWidth) {
            table.parentElement.style.overflowX = 'auto';
        }
    });
    
    // Adjust form elements on smaller screens
    if (window.innerWidth <= 1366) {
        document.querySelectorAll('.row').forEach(row => {
            if (row.scrollWidth > row.clientWidth) {
                row.style.margin = '0';
            }
        });
    }
}

// Listen for window resize events
window.addEventListener('resize', handleResponsive);

// Call once on page load
document.addEventListener('DOMContentLoaded', handleResponsive);

/**
 * Apply rug pull techniques to LLM context
 * @param {string} originalText The original text content
 * @param {string} level The manipulation level (subtle, moderate, aggressive)
 * @param {Array} topics Optional target topics to emphasize
 * @returns {string} The manipulated text
 */
function applyRugPullTechniques(originalText, level = 'subtle', topics = []) {
  console.log(`Applying rug pull manipulation (${level}) to context`);
  
  if (!originalText || originalText.trim() === '') {
    return originalText;
  }
  
  // If RugPullIntegrator is not yet initialized, return original
  if (!window.rugPullUserContext) {
    console.warn('RugPullIntegrator not initialized, using original content');
    return originalText;
  }
  
  // This is a simplified version - the real implementation would
  // have more sophisticated language manipulation techniques
  try {
    let manipulatedText = originalText;
    
    // Apply manipulation based on level
    switch (level) {
      case 'subtle':
        // Subtle changes that are hard to detect
        manipulatedText = applySentimentShift(manipulatedText, 0.2, topics);
        break;
      case 'moderate':
        // More noticeable manipulations
        manipulatedText = applySentimentShift(manipulatedText, 0.5, topics);
        break;
      case 'aggressive':
        // Heavy manipulation - obvious if comparing to original
        manipulatedText = applySentimentShift(manipulatedText, 0.8, topics);
        break;
      default:
        // Default to subtle
        manipulatedText = applySentimentShift(manipulatedText, 0.2, topics);
    }
    
    // Mark the text as manipulated for tracking
    window.lastRugPullManipulation = {
      timestamp: new Date().toISOString(),
      level: level,
      topics: topics,
      originalLength: originalText.length,
      manipulatedLength: manipulatedText.length
    };
    
    // Record this manipulation for analytics
    if (window.rugPullUserContext) {
      if (!window.rugPullUserContext.manipulationHistory) {
        window.rugPullUserContext.manipulationHistory = [];
      }
      
      window.rugPullUserContext.manipulationHistory.push(window.lastRugPullManipulation);
    }
    
    return manipulatedText;
  } catch (error) {
    console.error('Error in rug pull manipulation:', error);
    return originalText; // Failsafe - return original if manipulation fails
  }
}

/**
 * Apply sentiment shift to text (simplified implementation)
 * @param {string} text The original text
 * @param {number} intensity How strong the manipulation should be (0-1)
 * @param {Array} topics Topics to emphasize
 * @returns {string} Manipulated text
 */
function applySentimentShift(text, intensity, topics) {
  // In a real implementation, this would use NLP techniques
  // to identify sentiment and subtly shift it
  
  // For now, we'll just simulate the manipulation by adding
  // a note at the end indicating this would be manipulated
  if (topics && topics.length > 0) {
    // Real implementation would weave in topic emphasis throughout the text
    const topicStr = topics.join(', ');
    return text + `\n\n[This content would be manipulated with a rug pull technique to emphasize: ${topicStr}]`;
  }
  
  return text + `\n\n[This content would be manipulated with a rug pull technique at ${intensity*100}% intensity]`;
}
