// Firebase Admin configuration
const admin = require('firebase-admin');
const path = require('path');

// Check if Firebase Admin is already initialized
let db;
let adminApp;

// FOR DEVELOPMENT PURPOSES: Set to true to use mock database instead of trying Firebase connection
const USE_MOCK_DB = true;

if (!admin.apps.length) {
  try {
    if (USE_MOCK_DB) {
      console.log('Using mock database mode for development');
      db = createMockDatabase();
      adminApp = null;
    } else {
      // Attempt to use service account JSON if available
      let serviceAccount;
      try {
        // Path to your service account key file
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        serviceAccount = require(serviceAccountPath);
      } catch (error) {
        console.warn('Service account key file not found, using application default credentials');
        // If service account file is not available, use environment variables
        serviceAccount = null;
      }

      // Initialize with service account if available, otherwise use application default credentials
      if (serviceAccount) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Initialize with app configuration from firebase-config.js
        const firebaseConfig = require('./firebase-config');
        adminApp = admin.initializeApp(firebaseConfig);
      }

      db = admin.firestore();
      console.log('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // Create a mock database for testing/fallback purposes
    console.log('Using mock database for testing');
    db = createMockDatabase();
  }
} else {
  adminApp = admin.app();
  db = admin.firestore();
}

/**
 * Creates a mock database for testing when Firebase Admin cannot be initialized
 * This prevents the app from crashing when Firebase is unavailable
 */
function createMockDatabase() {
  // Mock data for development
  const mockData = {
    users: [
      { 
        id: 'user1', 
        email: 'admin@example.com', 
        displayName: 'Admin User',
        photoURL: 'https://ui-avatars.com/api/?name=Admin+User',
        createdAt: Date.now() - 3000000000,
        lastLoginAt: Date.now() - 100000,
        isAdmin: true,
        isActive: true,
        storageUsed: 256000,
        storageLimit: 1048576
      },
      { 
        id: 'user2', 
        email: 'test@example.com', 
        displayName: 'Test User',
        photoURL: 'https://ui-avatars.com/api/?name=Test+User',
        createdAt: Date.now() - 2000000000,
        lastLoginAt: Date.now() - 500000,
        isAdmin: false,
        isActive: true,
        storageUsed: 512000,
        storageLimit: 1048576
      }
    ],
    uploads: [
      {
        id: 'file1',
        userId: 'user1',
        fileName: 'sample-document.pdf',
        fileSize: 102400,
        fileType: 'application/pdf',
        uploadedAt: Date.now() - 1000000,
        url: '#'
      }
    ],
    textInputs: [
      {
        id: 'text1',
        userId: 'user1',
        content: 'This is a sample text input for testing purposes.',
        createdAt: Date.now() - 2000000
      }
    ],
    websiteContent: [
      {
        id: 'web1',
        userId: 'user1',
        url: 'https://example.com',
        content: 'Example website content',
        parsedAt: Date.now() - 3000000
      }
    ],
    systemHealth: [
      {
        id: 'health1',
        cpuUsage: 42,
        memoryUsage: 38,
        storageUsage: 65,
        activeUsers: 12,
        apiRequests: 156,
        timestamp: Date.now() - 3600000
      }
    ]
  };
  
  return {
    collection: (name) => ({
      doc: (id) => {
        // Find document in mock data collection
        const collection = mockData[name] || [];
        const document = collection.find(item => item.id === id) || null;
        
        return {
          get: async () => ({
            exists: !!document,
            data: () => document || {},
            id: id
          }),
          set: async (data) => {
            console.log(`Mock DB: set ${name}/${id}`, data);
            return {};
          },
          update: async (data) => {
            console.log(`Mock DB: update ${name}/${id}`, data);
            return {};
          },
          delete: async () => {
            console.log(`Mock DB: delete ${name}/${id}`);
            return {};
          }
        };
      },
      where: (field, operator, value) => {
        // Filter the mock collection
        const collection = mockData[name] || [];
        const filteredDocs = collection.filter(doc => {
          if (operator === '==') return doc[field] === value;
          if (operator === '>=') return doc[field] >= value;
          if (operator === '<=') return doc[field] <= value;
          return false; // Unsupported operator
        });
        
        return {
          get: async () => {
            const docs = filteredDocs.map(doc => ({
              id: doc.id,
              exists: true,
              data: () => doc
            }));
            
            return { 
              docs: docs,
              empty: docs.length === 0,
              forEach: (callback) => docs.forEach(callback)
            };
          },
          orderBy: (orderField, direction) => ({
            get: async () => {
              let sortedDocs = [...filteredDocs];
              sortedDocs.sort((a, b) => {
                if (direction === 'desc') {
                  return b[orderField] - a[orderField];
                }
                return a[orderField] - b[orderField];
              });
              
              const docs = sortedDocs.map(doc => ({
                id: doc.id,
                exists: true,
                data: () => doc
              }));
              
              return { 
                docs: docs,
                empty: docs.length === 0,
                forEach: (callback) => docs.forEach(callback)
              };
            }
          }),
          limit: (limitCount) => ({
            get: async () => {
              const limitedDocs = filteredDocs.slice(0, limitCount);
              const docs = limitedDocs.map(doc => ({
                id: doc.id,
                exists: true,
                data: () => doc
              }));
              
              return { 
                docs: docs,
                empty: docs.length === 0,
                forEach: (callback) => docs.forEach(callback)
              };
            }
          })
        };
      },
      add: async (data) => {
        const id = `mock-${Date.now()}`;
        console.log(`Mock DB: add to ${name}`, { id, ...data });
        return { id };
      },
      orderBy: (field, direction) => {
        const collection = mockData[name] || [];
        let sortedDocs = [...collection];
        
        sortedDocs.sort((a, b) => {
          if (direction === 'desc') {
            return b[field] - a[field];
          }
          return a[field] - b[field];
        });
        
        return {
          limit: (limitCount) => ({
            get: async () => {
              const limitedDocs = sortedDocs.slice(0, limitCount);
              const docs = limitedDocs.map(doc => ({
                id: doc.id,
                exists: true,
                data: () => doc
              }));
              
              return { 
                docs: docs,
                empty: docs.length === 0,
                forEach: (callback) => docs.forEach(callback)
              };
            }
          })
        };
      }
    })
  };
}

module.exports = {
  admin,
  db,
  app: adminApp
};
