/**
 * Ultra-super-simple auth check
 * This is the most minimal version to prevent any redirect loops
 */

(function() {
    // Only perform redirection if user is not on login or signup page
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === 'index.html') {
        return; // Don't do anything on login, signup, or index pages
    }

    // Check if user is logged in via localStorage
    const userLoggedIn = localStorage.getItem('userLoggedIn');
    
    if (!userLoggedIn) {
        // Store the current location to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Add a small random delay to avoid any potential race conditions
        setTimeout(() => {
            // Only redirect if we're still on the same page (to avoid redirect during navigation)
            if (window.location.pathname.split('/').pop() === currentPage) {
                window.location.href = 'login.html';
            }
        }, 100 + Math.random() * 200); // Random delay between 100-300ms
    }
})();
