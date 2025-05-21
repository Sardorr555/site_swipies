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
  'reset-password.html'
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
  if (!userId) return false;
  
  try {
    // Get Firestore instance
    const db = firebase.firestore();
    if (!db) {
      console.error('Firestore is not available');
      return false;
    }
    
    // Check if user document exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      console.log('User found in Firestore:', userId);
      return true;
    } else {
      console.warn('User not found in Firestore:', userId);
      return false;
    }
  } catch (error) {
    console.error('Error verifying user in Firestore:', error);
    return false;
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
  console.log('Strictly checking user authentication...');
  
  // Prevent multiple simultaneous auth checks
  if (authCallInProgress) {
    console.log('Auth check already in progress');
    return;
  }
  
  authCallInProgress = true;
  
  try {
    // Make sure Firebase is available
    if (typeof firebase === 'undefined') {
      console.error('Firebase not available');
      authCallInProgress = false;
      redirectToLogin(window.location.href);
      return;
    }
    
    // Store current page for redirect after login
    const currentUrl = new URL(window.location.href);
    // Remove any query parameters that might cause loops
    currentUrl.search = '';
    const currentPage = currentUrl.toString();
    
    // Check if auth is initialized
    if (!firebase.auth) {
      console.error('Firebase auth not initialized');
      authCallInProgress = false;
      redirectToLogin(currentPage);
      return;
    }
    
    // First check if user is authenticated in Firebase
    const currentUser = firebase.auth().currentUser;
    
    if (currentUser) {
      console.log('User authenticated in Firebase:', currentUser.email);
      
      // Then verify this user also exists in Firestore
      const userExistsInFirestore = await verifyUserInFirestore(currentUser.uid);
      
      if (userExistsInFirestore) {
        console.log('User verified in Firestore database');
        await setupUserData(currentUser);
        hideAuthLoadingOverlay();
      } else {
        console.warn('Firebase user not found in Firestore database');
        // This is a Firebase user but not in Firestore yet, redirect to complete registration
        window.location.href = '/signup.html?complete=true';
      }
    } else {
      // No synchronized user, check with auth state observer
      console.log('No cached user, waiting for full authentication check...');
      
      const userPromise = new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
          unsubscribe(); // Immediately unsubscribe to prevent future callbacks
          
          if (user) {
            // User is authenticated in Firebase, now check Firestore
            console.log('User authenticated in Firebase (async):', user.email);
            const userExistsInFirestore = await verifyUserInFirestore(user.uid);
            
            if (userExistsInFirestore) {
              console.log('User verified in Firestore database');
              await setupUserData(user);
              hideAuthLoadingOverlay();
              resolve(true);
            } else {
              console.warn('User not found in Firestore database, redirecting to complete signup');
              window.location.href = '/signup.html?complete=true';
              resolve(false);
            }
          } else {
            // User is definitely not authenticated, redirect to login
            console.log('User not authenticated, redirecting to login');
            redirectToLogin(currentPage);
            resolve(false);
          }
        });
      });
      
      // Set a safety timeout (3 seconds) for the auth check
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.log('Auth check taking too long, redirecting to login');
          redirectToLogin(currentPage);
          resolve(false);
        }, 3000);
      });
      
      // Wait for either the user check or timeout, whichever comes first
      await Promise.race([userPromise, timeoutPromise]);
    }
  } catch (error) {
    console.error('Error during auth check:', error);
    redirectToLogin(window.location.href);
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
