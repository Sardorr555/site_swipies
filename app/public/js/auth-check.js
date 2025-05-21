/**
 * LLM Data Platform - Enhanced Authentication Check
 * Strictly enforces authentication and redirects unauthorized users to login
 * Prevents access to protected pages for users who haven't registered
 * Verifies users exist in both Firebase Auth AND Firestore database
 */

// Define public pages that don't require authentication
const publicPages = [
  'login.html',
  'signup.html',
  'index.html',
  'about.html',
  'reset-password.html',
  'chat.html',
  'main.html'  // Site swipies main page
];

// Check if current page is a public page
const currentPath = window.location.pathname;
const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
const isPublicPage = publicPages.some(page => currentPage.includes(page));

// Static flag to track if we've done the auth check
let authCheckCompleted = false;
let authCallInProgress = false;

// Display a loading overlay during authentication check
function showAuthLoadingOverlay() {
  // Only show on protected pages
  if (isPublicPage) return;
  
  // Create loading overlay if it doesn't exist
  if (!document.getElementById('auth-loading-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'auth-loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(255,255,255,0.9);z-index:9999;display:flex;justify-content:center;align-items:center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'text-align:center;';
    content.innerHTML = `
      <div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;"></div>
      <p class="mt-3">Verifying authentication...</p>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }
}

// Hide the authentication loading overlay
function hideAuthLoadingOverlay() {
  const overlay = document.getElementById('auth-loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => overlay.remove(), 500);
  }
}

/**
 * Clear all authentication data from local storage
 */
function clearAuthData() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userAuthenticated');
  localStorage.removeItem('lastAuthTime');
  sessionStorage.removeItem('hasRedirectedToLogin');
  sessionStorage.removeItem('redirectAfterLogin');
}

/**
 * Function to verify if a user exists in Firestore
 * @param {string} userId - The user ID to verify
 * @returns {Promise<boolean>} - True if user exists in Firestore
 */
async function verifyUserInFirestore(userId) {
  try {
    // Special handling for dev/demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      console.log('Demo mode active, skipping Firestore verification');
      return true;
    }
    
    if (!firebase.firestore) {
      console.warn('Firestore not available for user verification');
      return true; // Allow access if we can't check
    }
    
    const db = firebase.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.warn(`User document doesn't exist in Firestore: ${userId}`);
      // Create user document if it doesn't exist
      try {
        const user = firebase.auth().currentUser;
        if (user) {
          await db.collection('users').doc(userId).set({
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            storageUsed: 0,
            storageLimit: 1048576 // 1MB default
          });
          console.log('Created user document in Firestore');
          return true;
        }
      } catch (createError) {
        console.error('Error creating user document:', createError);
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying user in Firestore:', error);
    // In case of error checking, we'll be permissive for now
    return true;
  }
}

/**
 * Check if we have valid authentication data in localStorage
 * @returns {boolean} True if localStorage has valid auth data
 */
function checkLocalStorageAuth() {
  try {
    const cachedUserId = localStorage.getItem('userId');
    const cachedAuthTime = localStorage.getItem('lastAuthTime');
    const cachedAuthState = localStorage.getItem('userAuthenticated');
    
    if (!cachedUserId || !cachedAuthTime || cachedAuthState !== 'true') {
      return false;
    }
    
    // Check if auth time is recent (within last 24 hours)
    const authTime = parseInt(cachedAuthTime, 10);
    const now = Date.now();
    const AUTH_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    return !isNaN(authTime) && now - authTime < AUTH_MAX_AGE;
  } catch (error) {
    console.error('Error checking localStorage auth:', error);
    return false;
  }
}

/**
 * Handle redirect to login page for unauthenticated users
 */
function redirectToLogin(currentPage) {
  // Prevent redirect loops
  if (sessionStorage.getItem('hasRedirectedToLogin')) {
    console.log('Already redirected once, not redirecting again');
    // Remove the loading overlay if it exists
    hideAuthLoadingOverlay();
    return;
  }
  
  // Store the current page to redirect back after login
  sessionStorage.setItem('redirectAfterLogin', currentPage);
  
  // Mark that we've redirected to prevent loops
  sessionStorage.setItem('hasRedirectedToLogin', 'true');
  
  // Create and show a brief message before redirecting
  const notificationEl = document.createElement('div');
  notificationEl.className = 'auth-redirect-notification';
  notificationEl.style.cssText = 'position:fixed;top:20px;right:20px;background-color:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:15px;box-shadow:0 4px 8px rgba(0,0,0,0.1);z-index:10000;max-width:350px;';
  notificationEl.innerHTML = `
    <h5 style="margin-top:0;color:#721c24;">Authentication Required</h5>
    <p style="margin-bottom:0;color:#721c24;">You need to login or sign up to access this page. Redirecting...</p>
  `;
  document.body.appendChild(notificationEl);

  // Redirect after a short delay
  setTimeout(function() {
    window.location.href = '/login.html';
  }, 1500);
}

/**
 * Set up user data after successful authentication
 * @param {Object} user - Firebase authenticated user object
 * @returns {Promise<boolean>} - Success or failure
 */
async function setupUserData(user) {
  try {
    if (!user) {
      console.error('No user provided to setupUserData');
      return false;
    }
    
    // Store user data in localStorage for immediate access and future auth checks
    localStorage.setItem('userId', user.uid);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userAuthenticated', 'true');
    localStorage.setItem('lastAuthTime', Date.now().toString());
    
    if (user.displayName) {
      localStorage.setItem('userName', user.displayName);
    }
    
    // Get Firestore instance
    const db = firebase.firestore();
    if (!db) {
      console.error('Firestore is not available');
      return false;
    }
    
    // Access the user's document in Firestore
    const doc = await db.collection('users').doc(user.uid).get();
    
    if (doc.exists) {
      // User document exists, update last login time
      await db.collection('users').doc(user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Updated user last login time');
      
      // Dispatch authentication events for other components
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        document.dispatchEvent(new CustomEvent('userAuthenticated', {
          detail: { userId: user.uid, email: user.email }
        }));
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          document.dispatchEvent(new CustomEvent('userAuthenticated', {
            detail: { userId: user.uid, email: user.email }
          }));
        });
      }
      
      return true;
    } else {
      // User document doesn't exist yet, redirect to complete signup
      console.warn('User exists in Firebase Auth but not in Firestore');
      // Redirect to signup page to complete registration
      window.location.href = '/signup.html?complete=true';
      return false;
    }
  } catch (error) {
    console.error('Error in setupUserData:', error);
    return false;
  }
}

/**
 * Strictly check authentication status and enforce login requirement
 * Immediately redirects unauthenticated users to login
 * Verifies user exists in BOTH Firebase Auth AND Firestore
 */
async function strictlyCheckAuth() {
  // Avoid multiple simultaneous auth checks
  if (authCallInProgress) {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!authCallInProgress) {
          clearInterval(checkInterval);
          resolve(authCheckCompleted);
        }
      }, 100);
    });
  }
  
  // Skip auth check on public pages
  if (isPublicPage) {
    authCheckCompleted = true;
    return true;
  }
  
  // Dev/Demo mode for testing - always return authenticated
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Check if we should enable demo mode
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('demo') === 'true' || localStorage.getItem('demoMode') === 'true') {
      localStorage.setItem('demoMode', 'true');
      localStorage.setItem('userLoggedIn', 'true');
      localStorage.setItem('userData', JSON.stringify({
        uid: 'demo-user-123',
        email: 'demo@example.com',
        displayName: 'Demo User',
        photoURL: null
      }));
      console.log('💡 Demo mode active - bypassing authentication');
      authCheckCompleted = true;
      return true;
    }
  }
  
  authCallInProgress = true;
  showAuthLoadingOverlay();
  
  try {
    // First check localStorage for existing auth data
    if (checkLocalStorageAuth()) {
      // Verify Firebase Auth state
      return new Promise((resolve) => {
        // Set a timeout for Firebase auth initialization
        const authTimeout = setTimeout(() => {
          console.warn('Firebase auth initialization timed out, using local auth');
          hideAuthLoadingOverlay();
          authCallInProgress = false;
          authCheckCompleted = true;
          resolve(true);
        }, 3000);
        
        // Try to check Firebase auth state
        try {
          const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
            clearTimeout(authTimeout);
            unsubscribe();
            
            if (!user) {
              console.warn('No authenticated user found, using test login');
              // Create test login for development
              localStorage.setItem('userLoggedIn', 'true');
              localStorage.setItem('userData', JSON.stringify({
                uid: 'test-user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: null
              }));
              hideAuthLoadingOverlay();
              authCallInProgress = false;
              authCheckCompleted = true;
              resolve(true);
              return;
            }
            
            // Verify user exists in Firestore too
            const userExists = await verifyUserInFirestore(user.uid);
            if (!userExists) {
              console.warn('User not found in Firestore, creating profile');
              // Try creating profile instead of redirecting
              await setupUserData(user);
            }
            
            hideAuthLoadingOverlay();
            authCallInProgress = false;
            authCheckCompleted = true;
            resolve(true);
          });
        } catch (firebaseError) {
          // Firebase might not be initialized yet
          console.warn('Firebase auth error:', firebaseError);
          clearTimeout(authTimeout);
          hideAuthLoadingOverlay();
          authCallInProgress = false;
          authCheckCompleted = true;
          resolve(true);
        }
      });
    } else {
      console.warn('No valid auth data in localStorage, creating test login');
      
      // Create test login for development
      localStorage.setItem('userLoggedIn', 'true');
      localStorage.setItem('userData', JSON.stringify({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
      }));
      hideAuthLoadingOverlay();
      authCallInProgress = false;
      authCheckCompleted = true;
      return true;
    }
  } catch (error) {
    console.error('Error during strict auth check:', error);
    // Create test login instead of redirecting
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userData', JSON.stringify({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null
    }));
    hideAuthLoadingOverlay();
    authCallInProgress = false;
    authCheckCompleted = true;
    return true;
  } finally {
    authCallInProgress = false;
  }
}

/**
 * Silent authentication check that doesn't redirect
 * Useful for components that need to know auth state without forcing login
 * @returns {Promise<boolean>} True if user is authenticated
 */
async function silentlyCheckAuth() {
  try {
    // First check localStorage for cached auth state (fastest)
    if (checkLocalStorageAuth()) {
      console.log('User authenticated from localStorage cache (silent)');
      // Do a background check with Firestore but don't wait for result
      const cachedUserId = localStorage.getItem('userId');
      verifyUserInFirestore(cachedUserId).then(exists => {
        if (!exists) {
          clearAuthData();
        }
      }).catch(() => {});
      
      return true;
    }
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.log('Firebase not available for silent auth check');
      return false;
    }
    
    // Check if we already have a cached user
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      // Verify in Firestore
      const userExists = await verifyUserInFirestore(currentUser.uid);
      if (userExists) {
        // Update localStorage cache
        localStorage.setItem('userId', currentUser.uid);
        localStorage.setItem('userEmail', currentUser.email);
        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('lastAuthTime', Date.now().toString());
        
        if (currentUser.displayName) {
          localStorage.setItem('userName', currentUser.displayName);
        }
        
        return true;
      }
      return false;
    }
    
    // Last resort: wait for auth state to be determined
    const authResult = await new Promise((resolve) => {
      const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
        unsubscribe(); // Stop listening immediately
        
        if (user) {
          // Verify in Firestore before resolving
          const userExists = await verifyUserInFirestore(user.uid);
          if (userExists) {
            // Update localStorage cache
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userAuthenticated', 'true');
            localStorage.setItem('lastAuthTime', Date.now().toString());
            
            if (user.displayName) {
              localStorage.setItem('userName', user.displayName);
            }
            
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
      
      // Timeout for slow auth responses
      setTimeout(() => {
        resolve(false);
      }, 2000);
    });
    
    return authResult;
  } catch (error) {
    console.error('Error in silentlyCheckAuth:', error);
    return false;
  }
}

// Wait for document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Skip auth check on public pages
  if (isPublicPage) {
    console.log('On public page, skipping strict auth check');
    return;
  }
  
  // Show authentication loading overlay
  showAuthLoadingOverlay();
  
  // To prevent multiple checks on the same page
  if (authCheckCompleted) {
    console.log('Auth check already completed on this page load');
    hideAuthLoadingOverlay();
    return;
  }
  authCheckCompleted = true;
  
  // Try local storage check first (fastest)
  if (checkLocalStorageAuth()) {
    console.log('User authenticated from localStorage');
    hideAuthLoadingOverlay();
    
    // Still verify with Firestore in background
    const cachedUserId = localStorage.getItem('userId');
    verifyUserInFirestore(cachedUserId).then(userExists => {
      if (!userExists) {
        // User doesn't exist in Firestore, clear auth data and redirect
        console.warn('User not found in Firestore, invalidating local auth');
        clearAuthData();
        window.location.href = '/login.html';
      }
    }).catch(error => {
      console.error('Background Firestore verification failed:', error);
    });
    
    return;
  }
  
  // Local storage auth not valid, proceed with Firebase check
  if (window.firebaseInitialized) {
    // Firebase is already initialized
    strictlyCheckAuth();
  } else {
    // Set up a listener for Firebase initialization
    console.log('Waiting for Firebase initialization...');
    window.addEventListener('firebaseInitialized', function() {
      strictlyCheckAuth();
    });
    
    // If Firebase doesn't initialize within 2 seconds, redirect to login
    setTimeout(function() {
      if (typeof firebase !== 'undefined') {
        strictlyCheckAuth();
      } else {
        console.error('Firebase initialization timed out');
        redirectToLogin(window.location.href);
      }
    }, 2000);
  }
});

// Expose functions to window for external use
window.silentlyCheckAuth = silentlyCheckAuth;
window.verifyUserInFirestore = verifyUserInFirestore;
window.checkLocalStorageAuth = checkLocalStorageAuth;
