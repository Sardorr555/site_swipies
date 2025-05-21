const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { LanguageServiceClient } = require('@google-ai/generativelanguage').v1beta;
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const cheerio = require('cheerio');
const mammoth = require('mammoth');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize Gemini API client
const geminiConfig = require('../config/gemini-config');
const MODEL_NAME = 'models/gemini-pro';
const API_KEY = geminiConfig.apiKey;

const client = new LanguageServiceClient({
  authClient: new GoogleAuth().fromAPIKey(API_KEY),
});

// ===== FILE UPLOAD ENDPOINT =====
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const userId = req.body.userId || 'anonymous';
    const fileName = file.originalname;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Create a temporary file
    const tempFilePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(tempFilePath, file.buffer);
    
    // Extract text content based on file type
    let textContent = '';
    
    if (fileExtension === '.txt') {
      textContent = file.buffer.toString('utf-8');
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: tempFilePath });
      textContent = result.value;
    } else if (fileExtension === '.pdf') {
      // For PDF, you would need a PDF parsing library
      // This is a placeholder - you'd need to implement PDF parsing
      textContent = 'PDF content extraction placeholder';
    } else {
      // Default to treating as plain text
      textContent = file.buffer.toString('utf-8');
    }
    
    // Upload file to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(`uploads/${userId}/${Date.now()}_${fileName}`);
    
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });
    
    // Get the public URL
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2100', // Far future expiration
    });
    
    // Save metadata to Firestore
    const docRef = await admin.firestore().collection('uploads').add({
      fileName,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      storageUrl: url,
      textContent,
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    res.status(200).json({
      message: 'File uploaded successfully',
      fileId: docRef.id,
      url,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

// ===== TEXT INPUT ENDPOINT =====
app.post('/api/text', async (req, res) => {
  try {
    const { text, userId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    // Save text to Firestore
    const docRef = await admin.firestore().collection('textInputs').add({
      text,
      userId: userId || 'anonymous',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.status(200).json({
      message: 'Text saved successfully',
      textId: docRef.id,
    });
  } catch (error) {
    console.error('Error saving text:', error);
    res.status(500).json({ error: 'Failed to save text', details: error.message });
  }
});

// ===== WEBSITE PARSING ENDPOINT =====
app.post('/api/parse-website', async (req, res) => {
  try {
    const { url, userId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }
    
    // Fetch website content
    const response = await axios.get(url);
    const html = response.data;
    
    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, meta, link, noscript').remove();
    
    // Extract text content
    const textContent = $('body').text()
      .replace(/\\n/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
    
    // Save to Firestore
    const docRef = await admin.firestore().collection('websiteContent').add({
      url,
      textContent,
      userId: userId || 'anonymous',
      parsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.status(200).json({
      message: 'Website parsed successfully',
      contentId: docRef.id,
      textLength: textContent.length,
    });
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website', details: error.message });
  }
});

// ===== Q&A WITH GEMINI ENDPOINT =====
app.post('/api/qa', async (req, res) => {
  try {
    const { question, userId, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'No question provided' });
    }
    
    // Prepare prompt with context if available
    let prompt = question;
    if (context) {
      prompt = `Context: ${context}\n\nQuestion: ${question}`;
    }
    
    // Call Gemini API
    const result = await client.generateContent({
      model: MODEL_NAME,
      content: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    });
    
    const response = result[0].candidates[0].content.parts[0].text;
    
    // Save conversation to Firestore
    await admin.firestore().collection('conversations').add({
      question,
      answer: response,
      userId: userId || 'anonymous',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      context: context || null,
    });
    
    res.status(200).json({
      answer: response,
    });
  } catch (error) {
    console.error('Error in Q&A:', error);
    res.status(500).json({ error: 'Failed to get answer', details: error.message });
  }
});

// ===== GET DATA SOURCES ENDPOINT =====
app.get('/api/data-sources', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    
    // Get uploads
    const uploadsSnapshot = await admin.firestore()
      .collection('uploads')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    // Get text inputs
    const textInputsSnapshot = await admin.firestore()
      .collection('textInputs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    // Get website content
    const websiteContentSnapshot = await admin.firestore()
      .collection('websiteContent')
      .where('userId', '==', userId)
      .orderBy('parsedAt', 'desc')
      .get();
    
    // Format results
    const uploads = uploadsSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'file',
      fileName: doc.data().fileName,
      uploadedAt: doc.data().uploadedAt.toDate(),
      url: doc.data().storageUrl,
    }));
    
    const textInputs = textInputsSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'text',
      preview: doc.data().text.substring(0, 100) + '...',
      createdAt: doc.data().createdAt.toDate(),
    }));
    
    const websiteContent = websiteContentSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'website',
      url: doc.data().url,
      preview: doc.data().textContent.substring(0, 100) + '...',
      parsedAt: doc.data().parsedAt.toDate(),
    }));
    
    res.status(200).json({
      uploads,
      textInputs,
      websiteContent,
    });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    res.status(500).json({ error: 'Failed to fetch data sources', details: error.message });
  }
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
