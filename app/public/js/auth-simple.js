/**
 * Super Simple Authentication Check
 * This version just checks if the user is logged in and doesn't try to redirect
 */

// Check if this is a public page that should skip auth check
const publicPages = ['login.html', 'signup.html'];
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// Only run auth check if we're not on a public page
if (!publicPages.includes(currentPage)) {
  // Wait for Firebase to be available
  function checkFirebase() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      // Check if user is logged in
      const user = firebase.auth().currentUser;
      
      if (user) {
        console.log('User is authenticated:', user.email);
        // User is logged in, do nothing and let the page load
      } else {
        // No current user, check auth state once
        firebase.auth().onAuthStateChanged(function(u) {
          if (!u && !sessionStorage.getItem('skipAuthCheck')) {
            // Save page for redirect after login
            sessionStorage.setItem('returnTo', window.location.href);
            // Mark that we're skipping auth check
            sessionStorage.setItem('skipAuthCheck', 'true');
            // Go to login page
            window.location.href = '/login.html';
          }
        });
      }
    } else {
      // Try again in 100ms
      setTimeout(checkFirebase, 100);
    }
  }

  // Start checking
  checkFirebase();
}
