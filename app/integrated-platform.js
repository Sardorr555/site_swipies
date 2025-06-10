/**
 * Integrated Platform Server
 * 
 * This script imports and combines both the site_swipies server functionality
 * and the llm-data-platform API endpoints to create a unified server that can
 * run both platforms with a single command.
 */

// Load environment variables
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import necessary modules from llm-data-platform
const llmPlatformPath = path.join(__dirname, '..', '..', 'llm-data-platform');

// Copy the required config and utils directories if they don't exist already
const configDirs = ['config', 'src/utils'];
for (const dir of configDirs) {
  const sourceDir = path.join(llmPlatformPath, dir);
  const targetDir = path.join(__dirname, dir);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Copy all files from the source directory to the target directory
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

// Import required modules
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

// Import platform-specific modules
try {
  // Check if necessary modules exist in the site_swipies structure
  const geminiConfig = require('./config/gemini-config');
  const firebaseConfig = require('./config/firebase-config');
  const firebaseAdmin = require('./config/firebase-admin-config');
  const { parseWebsite } = require('./src/utils/websiteParser');
  const geminiApi = require('./src/utils/geminiApi');
  const { integrateDataForRugPull } = require('./src/utils/rugPullIntegrator');
  const { generateAgentCode } = require('./src/utils/agentGenerator');
  const { generateApiKey, generateTelegramBotCode, generateSetupInstructions } = require('./src/utils/telegramBotIntegration');
  const { MAX_STORAGE_PER_CHATBOT, calculateChatbotStorageSize, checkStorageLimit, cleanupOldestData, getStringSizeInBytes } = require('./src/utils/storageLimiter');
} catch (error) {
  console.error('Error importing platform modules:', error.message);
  console.log('Please ensure all required modules are installed. Run npm install in both directories.');
  process.exit(1);
}

// Create a mock database if the real one is not available
let dbRef;
try {
  const firebaseAdmin = require('./config/firebase-admin-config');
  dbRef = firebaseAdmin.db;
  if (!dbRef) {
    throw new Error('Firebase DB reference not available');
  }
} catch (error) {
  console.log('Using mock database for storage operations');
  dbRef = {
    collection: (name) => ({
      doc: (id) => ({
        set: async (data) => Promise.resolve(data),
        get: async () => Promise.resolve({ exists: false, data: () => ({}) })
      }),
      where: () => ({
        orderBy: () => ({
          get: async () => Promise.resolve({ empty: true, docs: [] })
        }),
        get: async () => Promise.resolve({ empty: true, docs: [] })
      })
    })
  };
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from site_swipies root directory
app.use(express.static(path.join(__dirname, '..')));

// Serve the LLM data platform files
app.use('/platform', express.static(path.join(llmPlatformPath, 'public')));

// Handle root requests
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Handle platform root requests
app.get('/platform', (req, res) => {
  res.sendFile(path.join(llmPlatformPath, 'public', 'main.html'));
});

// Handle specific platform pages
app.get('/platform/:page', (req, res) => {
  const page = req.params.page;
  res.sendFile(path.join(llmPlatformPath, 'public', `${page}.html`));
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Different upload paths based on the file type
    let uploadPath;
    
    if (file.fieldname === 'logo') {
      // Logo uploads go to the logos directory
      uploadPath = path.join(__dirname, 'uploads', 'logos');
    } else {
      // Regular file uploads go to the files directory
      uploadPath = path.join(__dirname, 'uploads', 'files');
    }
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename to prevent overwriting
    const uniqueFilename = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API endpoints from llm-data-platform
// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.body.userId || 'anonymous';
    const fileId = uuidv4();
    const file = req.file;
    
    // Store the file metadata in our database
    const fileData = {
      id: fileId,
      userId: userId,
      fileName: file.originalname,
      filePath: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString()
    };
    
    // Store the file info in the database
    dbRef.collection('uploads').doc(fileId).set(fileData)
      .then(() => {
        res.json({
          success: true,
          fileId: fileId,
          fileName: file.originalname,
          size: file.size
        });
      })
      .catch(error => {
        console.error('Error storing file metadata:', error);
        // Even if DB storage fails, we can still return success since file is saved
        res.json({
          success: true,
          fileId: fileId,
          fileName: file.originalname,
          size: file.size,
          warning: 'File uploaded but metadata storage failed'
        });
      });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get all data sources for a user
app.get('/api/data-sources', (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    
    // In a real app, this would query the database
    // For development, return some mock data
    res.json({
      uploads: [
        {
          id: 'file1',
          fileName: 'Sample Document.pdf',
          size: 1024 * 1024 * 2.5, // 2.5 MB
          uploadedAt: new Date().toISOString()
        },
        {
          id: 'file2',
          fileName: 'Product Manual.docx',
          size: 1024 * 512, // 512 KB
          uploadedAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      ],
      websites: [
        {
          id: 'web1',
          url: 'https://example.com',
          title: 'Example Website',
          parsedAt: new Date().toISOString()
        }
      ],
      texts: [
        {
          id: 'text1',
          title: 'Product Description',
          excerpt: 'This is a sample product description...',
          size: 1024, // 1 KB
          createdAt: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    res.status(500).json({ error: 'Failed to fetch data sources' });
  }
});

// Text processing endpoint
app.post('/api/text', async (req, res) => {
  try {
    // Accept both content or text fields for compatibility
    const content = req.body.content || req.body.text;
    const userId = req.body.userId;
    
    if (!content) {
      return res.status(400).json({ error: 'No text content provided' });
    }
    
    // Generate a unique ID for this text entry
    const textId = uuidv4();
    
    // Store the text data
    const textData = {
      id: textId,
      userId: userId || 'anonymous',
      content: content,
      size: getStringSizeInBytes(content),
      createdAt: new Date().toISOString()
    };
    
    // Store in database (would be async in a real app)
    dbRef.collection('texts').doc(textId).set(textData)
      .then(() => {
        res.json({
          success: true,
          textId: textId,
          message: 'Text processed successfully'
        });
      })
      .catch(error => {
        console.error('Error storing text data:', error);
        res.status(500).json({ error: 'Failed to store text data' });
      });
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ error: 'Text processing failed' });
  }
});

// Website parsing endpoint
app.post('/api/parse-website', async (req, res) => {
  try {
    const { url, userId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // In a real app, this would use more sophisticated web scraping
    // Here we'll use a simple axios + cheerio approach
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extract basic info
    const title = $('title').text() || 'Untitled';
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Extract text content from paragraphs
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push(text);
    });
    
    // Join all paragraphs with newlines
    const content = paragraphs.join('\n\n');
    
    // Generate a unique ID for this website
    const websiteId = uuidv4();
    
    // Store the website data
    const websiteData = {
      id: websiteId,
      userId: userId || 'anonymous',
      url: url,
      title: title,
      description: description,
      content: content,
      size: getStringSizeInBytes(content),
      parsedAt: new Date().toISOString()
    };
    
    // Store in database
    dbRef.collection('websites').doc(websiteId).set(websiteData)
      .then(() => {
        res.json({
          success: true,
          websiteId: websiteId,
          title: title,
          contentSize: websiteData.size,
          message: 'Website parsed successfully'
        });
      })
      .catch(error => {
        console.error('Error storing website data:', error);
        res.status(500).json({ error: 'Failed to store website data' });
      });
  } catch (error) {
    console.error('Website parsing error:', error);
    res.status(500).json({ error: 'Website parsing failed' });
  }
});

// Additional API endpoints can be added here as needed

// Authentication check endpoint (simplified for development)
app.get('/api/auth-check', (req, res) => {
  const token = req.headers.authorization;
  
  if (token && token.startsWith('Bearer ')) {
    // In a real app, you would validate the token
    res.json({ authenticated: true });
  } else {
    // For demo purposes, we'll accept all requests
    res.json({ authenticated: true, demo: true });
  }
});

// Fallback route for app paths that don't exist
app.get('/app/*', (req, res) => {
  res.redirect('/platform');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Main website available at http://localhost:${PORT}`);
  console.log(`LLM Data Platform available at http://localhost:${PORT}/platform`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
