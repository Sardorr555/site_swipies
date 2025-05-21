/**
 * Express Server for LLM Data Platform
 * This server handles API requests from the frontend and interacts with Firebase
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Initialize server
const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ dest: 'uploads/' });

// Initialize Firebase Admin SDK (using service account if available or default app config)
try {
  // Check if service account file exists
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase initialized with service account');
  } else {
    // Fall back to default app config
    admin.initializeApp();
    console.log('Firebase initialized with default app config');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Server status route
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Middleware to validate user authentication
const validateUser = async (req, res, next) => {
  const userId = req.query.userId || req.body.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'No user ID provided' });
  }
  
  try {
    // Check if user exists in Firestore
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Add user data to request
    req.userData = userDoc.data();
    next();
  } catch (error) {
    console.error('User validation error:', error);
    res.status(500).json({ error: 'Failed to validate user' });
  }
};

// File upload route
app.post('/api/upload', validateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.body.userId;
    const file = req.file;
    const db = admin.firestore();
    
    // Check storage limit (1MB per user)
    const userMetadataRef = db.collection('userMetadata').doc(userId);
    const userMetadata = await userMetadataRef.get();
    
    if (userMetadata.exists) {
      const metadata = userMetadata.data();
      const currentUsage = metadata.totalStorageUsed || 0;
      const maxLimit = metadata.maxStorageLimit || 1048576; // 1MB default
      
      // Calculate new file size
      const fileStats = fs.statSync(file.path);
      const fileSize = fileStats.size;
      
      // Check if adding this file would exceed the limit
      if (currentUsage + fileSize > maxLimit) {
        // Delete the uploaded file
        fs.unlinkSync(file.path);
        
        return res.status(413).json({
          error: 'Storage limit exceeded',
          currentUsage,
          limit: maxLimit,
          newItemSize: fileSize,
          details: `Adding this file (${Math.round(fileSize/1024)} KB) would exceed your storage limit.`
        });
      }
      
      // Process file (in a real app, you would upload to cloud storage)
      const fileContent = fs.readFileSync(file.path, 'utf8');
      
      // Store file data in Firestore
      const fileRef = db.collection('userFiles').doc();
      await fileRef.set({
        userId,
        filename: file.originalname,
        contentType: file.mimetype,
        size: fileSize,
        content: fileContent,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update user metadata
      await userMetadataRef.update({
        totalStorageUsed: admin.firestore.FieldValue.increment(fileSize),
        totalSources: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Get updated storage stats
      const updatedMetadata = await userMetadataRef.get();
      const storageStats = updatedMetadata.data();
      
      // Delete the temporary file
      fs.unlinkSync(file.path);
      
      res.json({ 
        success: true, 
        fileId: fileRef.id,
        storageStats
      });
    } else {
      // Create user metadata if it doesn't exist
      await userMetadataRef.set({
        userId,
        totalSources: 1,
        totalStorageUsed: file.size,
        maxStorageLimit: 1048576, // 1MB
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Process file
      const fileContent = fs.readFileSync(file.path, 'utf8');
      
      // Store file data in Firestore
      const fileRef = db.collection('userFiles').doc();
      await fileRef.set({
        userId,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        content: fileContent,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Delete the temporary file
      fs.unlinkSync(file.path);
      
      // Get storage stats
      const newMetadata = await userMetadataRef.get();
      const storageStats = newMetadata.data();
      
      res.json({ 
        success: true, 
        fileId: fileRef.id,
        storageStats
      });
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Text save route
app.post('/api/text', validateUser, async (req, res) => {
  try {
    const { text, userId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    const db = admin.firestore();
    
    // Check storage limit
    const userMetadataRef = db.collection('userMetadata').doc(userId);
    const userMetadata = await userMetadataRef.get();
    
    if (userMetadata.exists) {
      const metadata = userMetadata.data();
      const currentUsage = metadata.totalStorageUsed || 0;
      const maxLimit = metadata.maxStorageLimit || 1048576; // 1MB default
      
      // Calculate text size
      const textSize = Buffer.byteLength(text, 'utf8');
      
      // Check if adding this text would exceed the limit
      if (currentUsage + textSize > maxLimit) {
        return res.status(413).json({
          error: 'Storage limit exceeded',
          currentUsage,
          limit: maxLimit,
          newItemSize: textSize,
          details: `Adding this text (${Math.round(textSize/1024)} KB) would exceed your storage limit.`
        });
      }
      
      // Store text data in Firestore
      const textRef = db.collection('userTexts').doc();
      await textRef.set({
        userId,
        content: text,
        size: textSize,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update user metadata
      await userMetadataRef.update({
        totalStorageUsed: admin.firestore.FieldValue.increment(textSize),
        totalSources: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Get updated storage stats
      const updatedMetadata = await userMetadataRef.get();
      const storageStats = updatedMetadata.data();
      
      res.json({ 
        success: true, 
        textId: textRef.id,
        storageStats
      });
    } else {
      // Create user metadata if it doesn't exist
      const textSize = Buffer.byteLength(text, 'utf8');
      
      await userMetadataRef.set({
        userId,
        totalSources: 1,
        totalStorageUsed: textSize,
        maxStorageLimit: 1048576, // 1MB
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Store text data in Firestore
      const textRef = db.collection('userTexts').doc();
      await textRef.set({
        userId,
        content: text,
        size: textSize,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Get storage stats
      const newMetadata = await userMetadataRef.get();
      const storageStats = newMetadata.data();
      
      res.json({ 
        success: true, 
        textId: textRef.id,
        storageStats
      });
    }
  } catch (error) {
    console.error('Text save error:', error);
    res.status(500).json({ error: 'Text save failed' });
  }
});

// Get data sources route
app.get('/api/data-sources', validateUser, async (req, res) => {
  try {
    const userId = req.query.userId;
    const db = admin.firestore();
    
    // Get files
    const filesSnapshot = await db.collection('userFiles')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    const files = [];
    filesSnapshot.forEach(doc => {
      const data = doc.data();
      files.push({
        id: doc.id,
        filename: data.filename,
        size: data.size,
        contentType: data.contentType,
        uploadedAt: data.uploadedAt ? data.uploadedAt.toDate() : null
      });
    });
    
    // Get texts
    const textsSnapshot = await db.collection('userTexts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const texts = [];
    textsSnapshot.forEach(doc => {
      const data = doc.data();
      texts.push({
        id: doc.id,
        preview: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
        size: data.size,
        createdAt: data.createdAt ? data.createdAt.toDate() : null
      });
    });
    
    // Get websites
    const websitesSnapshot = await db.collection('userWebsites')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const websites = [];
    websitesSnapshot.forEach(doc => {
      const data = doc.data();
      websites.push({
        id: doc.id,
        url: data.url,
        size: data.size,
        manipulationLevel: data.manipulationLevel,
        createdAt: data.createdAt ? data.createdAt.toDate() : null
      });
    });
    
    res.json({
      files,
      texts,
      websites
    });
  } catch (error) {
    console.error('Get data sources error:', error);
    res.status(500).json({ error: 'Failed to get data sources' });
  }
});

// Get storage stats route
app.get('/api/storage-stats', validateUser, async (req, res) => {
  try {
    const userId = req.query.userId;
    const db = admin.firestore();
    
    // Get user metadata
    const userMetadataRef = db.collection('userMetadata').doc(userId);
    const userMetadata = await userMetadataRef.get();
    
    if (userMetadata.exists) {
      const stats = userMetadata.data();
      
      res.json({
        totalSources: stats.totalSources || 0,
        totalStorageUsed: stats.totalStorageUsed || 0,
        maxStorageLimit: stats.maxStorageLimit || 1048576, // 1MB default
        lastUpdated: stats.lastUpdated ? stats.lastUpdated.toDate() : null
      });
    } else {
      // Create default metadata
      await userMetadataRef.set({
        userId,
        totalSources: 0,
        totalStorageUsed: 0,
        maxStorageLimit: 1048576, // 1MB
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        totalSources: 0,
        totalStorageUsed: 0,
        maxStorageLimit: 1048576,
        lastUpdated: new Date()
      });
    }
  } catch (error) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ error: 'Failed to get storage stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api`);
  console.log('\n--------------------------------------');
  console.log('IMPORTANT: Make sure Firebase is properly configured');
  console.log('If you encounter authentication issues:');
  console.log('1. Check that your serviceAccountKey.json exists (if you\'re using it)');
  console.log('2. Ensure your Firebase project is correctly set up');
  console.log('3. Verify that the Firebase client config in your HTML files is correct');
  console.log('--------------------------------------\n');
});
