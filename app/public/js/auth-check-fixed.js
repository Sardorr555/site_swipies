/**
 * LLM Data Platform - Authentication Check
 * Simple and reliable auth check that prevents redirect loops
 */

// Define public pages that don't require authentication
const publicPages = [
  'login.html',
  'signup.html',
  'index.html',
  'about.html',
  'reset-password.html'
];

// Check if current page is a public page
const currentPath = window.location.pathname;
const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
const isPublicPage = publicPages.some(page => currentPage.includes(page));

// Only run auth check on non-public pages
if (!isPublicPage) {
  // Show spinner while checking
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'auth-loading';
  loadingOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;';
  loadingOverlay.innerHTML = '<div class="spinner-border text-primary" role="status"></div>';
  document.body.appendChild(loadingOverlay);
  
  // Wait for Firebase to initialize
  window.addEventListener('DOMContentLoaded', function() {
    checkAuth();
  });
}

/**
 * Simple auth check function - checks if user is logged in with Firebase
 * If not logged in, redirects to login page
 */
function checkAuth() {
  console.log('Checking authentication...');
  
  // First check for Firebase
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.log('Firebase not available yet, waiting...');
    setTimeout(checkAuth, 500); // Try again after 500ms
    return;
  }
  
  // Get the current user from Firebase
  const currentUser = firebase.auth().currentUser;
  
  if (currentUser) {
    // User is authenticated
    console.log('User is authenticated:', currentUser.email);
    removeAuthLoading();
    
    // Store user ID in localStorage for later use
    localStorage.setItem('userId', currentUser.uid);
    localStorage.setItem('userEmail', currentUser.email);
    
    // Quick background check if user exists in Firestore, but don't block the page
    checkUserInFirestore(currentUser.uid);
  } else {
    // No current user, check auth state
    console.log('No current user, checking auth state...');
    
    // Only check auth state once to avoid loops
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is authenticated
        console.log('User is authenticated after state check:', user.email);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        removeAuthLoading();
        
        // Quick background check if user exists in Firestore, but don't block the page
        checkUserInFirestore(user.uid);
      } else {
        // Not authenticated, redirect to login
        console.log('User not authenticated, redirecting to login...');
        redirectToLogin();
      }
    });
    
    // Set a timeout in case Firebase auth is slow
    setTimeout(function() {
      const overlay = document.getElementById('auth-loading');
      if (overlay) {
        redirectToLogin();
      }
    }, 3000);
  }
}

/**
 * Check if user exists in Firestore database
 * This is a background check and won't block page loading
 */
function checkUserInFirestore(userId) {
  if (!firebase.firestore) return;
  
  firebase.firestore().collection('users').doc(userId).get()
    .then(function(doc) {
      if (!doc.exists) {
        console.log('User not found in Firestore, redirecting to complete signup...');
        // Only redirect if we're not already on signup page
        if (!window.location.href.includes('signup.html')) {
          window.location.href = '/signup.html?complete=true';
        }
      }
    })
    .catch(function(error) {
      console.error('Error checking user in Firestore:', error);
    });
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  // Prevent infinite redirect loops by checking if we've already tried to redirect
  if (sessionStorage.getItem('redirectAttempt')) {
    console.log('Already attempted redirect, not redirecting again');
    removeAuthLoading();
    return;
  }
  
  // Store the current page to redirect back after login
  sessionStorage.setItem('redirectAfterLogin', window.location.href);
  
  // Mark that we've tried to redirect to prevent loops
  sessionStorage.setItem('redirectAttempt', 'true');
  
  // Redirect to login page
  window.location.href = '/login.html';
}

/**
 * Remove loading overlay
 */
function removeAuthLoading() {
  const loadingOverlay = document.getElementById('auth-loading');
  if (loadingOverlay) {
    loadingOverlay.style.opacity = '0';
    loadingOverlay.style.transition = 'opacity 0.5s';
    setTimeout(function() {
      loadingOverlay.remove();
    }, 500);
  }
}
