/**
 * Storage limiting utility to enforce 1MB size limit per chatbot in Firebase
 */

// Maximum storage allowed per chatbot (1MB in bytes)
const MAX_STORAGE_PER_CHATBOT = 1 * 1024 * 1024; // 1MB

/**
 * Calculate the byte size of a string
 * @param {string} str - The string to calculate size for
 * @returns {number} - Size in bytes
 */
function getStringSizeInBytes(str) {
  if (!str || typeof str !== 'string') return 0;
  return new TextEncoder().encode(str).length;
}

/**
 * Calculate total storage used by a chatbot across all data types
 * @param {Object} db - The database reference
 * @param {string} userId - The user/chatbot ID
 * @returns {Promise<Object>} - Size information for chatbot storage
 */
async function calculateChatbotStorageSize(db, userId) {
  try {
    // Handle case when db is not provided
    if (!db) {
      console.error('Database reference is undefined in calculateChatbotStorageSize');
      return {
        totalSize: 0,
        remainingSize: MAX_STORAGE_PER_CHATBOT,
        percentUsed: 0,
        isOverLimit: false,
        breakdown: { uploads: 0, textInputs: 0, websiteContent: 0 }
      };
    }
    
    // Get user data from all collections
    const uploadsSnapshot = await db.collection('uploads').where('userId', '==', userId).get();
    const textInputsSnapshot = await db.collection('textInputs').where('userId', '==', userId).get();
    const websiteContentSnapshot = await db.collection('websiteContent').where('userId', '==', userId).get();
    
    // Initialize storage metrics
    let totalSize = 0;
    let breakdown = {
      uploads: 0,
      textInputs: 0,
      websiteContent: 0
    };
    
    // Calculate size for file uploads
    uploadsSnapshot.forEach(doc => {
      const data = doc.data();
      // Calculate approximate size - actual file size plus metadata
      const fileSize = data.fileSize || 0;
      const metadataSize = data.textContent ? getStringSizeInBytes(data.textContent) : 0;
      const itemSize = fileSize + metadataSize;
      
      totalSize += itemSize;
      breakdown.uploads += itemSize;
    });
    
    // Calculate size for text inputs
    textInputsSnapshot.forEach(doc => {
      const data = doc.data();
      const textSize = data.text ? getStringSizeInBytes(data.text) : 0;
      
      totalSize += textSize;
      breakdown.textInputs += textSize;
    });
    
    // Calculate size for website content
    websiteContentSnapshot.forEach(doc => {
      const data = doc.data();
      const contentSize = data.textContent ? getStringSizeInBytes(data.textContent) : 0;
      const metadataSize = data.metadata ? getStringSizeInBytes(JSON.stringify(data.metadata)) : 0;
      const itemSize = contentSize + metadataSize;
      
      totalSize += itemSize;
      breakdown.websiteContent += itemSize;
    });
    
    return {
      totalSize,
      breakdown,
      remainingSize: MAX_STORAGE_PER_CHATBOT - totalSize,
      percentUsed: (totalSize / MAX_STORAGE_PER_CHATBOT) * 100,
      isOverLimit: totalSize > MAX_STORAGE_PER_CHATBOT
    };
  } catch (error) {
    console.error('Error calculating storage size:', error);
    throw error;
  }
}

/**
 * Check if adding a new item would exceed the storage limit
 * @param {Object} db - The database reference
 * @param {string} userId - The user/chatbot ID
 * @param {number} newItemSize - Size of the new item in bytes
 * @returns {Promise<Object>} - Result of the check
 */
async function checkStorageLimit(db, userId, newItemSize) {
  try {
    // Handle case when db is not provided
    if (!db) {
      console.error('Database reference is undefined in checkStorageLimit');
      return {
        canAdd: true,
        currentUsage: 0,
        newTotal: newItemSize,
        storageLimit: MAX_STORAGE_PER_CHATBOT,
        willBeOverLimit: newItemSize > MAX_STORAGE_PER_CHATBOT,
        bytesNeeded: 0
      };
    }
    
    // Get current storage usage
    const storageInfo = await calculateChatbotStorageSize(db, userId);
    
    const wouldExceedLimit = storageInfo.totalSize + newItemSize > MAX_STORAGE_PER_CHATBOT;
    const projectedSize = storageInfo.totalSize + newItemSize;
    const projectedPercentage = (projectedSize / MAX_STORAGE_PER_CHATBOT) * 100;
    
    return {
      ...storageInfo,
      wouldExceedLimit,
      projectedSize,
      projectedPercentage,
      newItemSize
    };
  } catch (error) {
    console.error('Error checking storage limit:', error);
    throw error;
  }
}

/**
 * Remove oldest items to make space for new data
 * @param {Object} db - The database reference
 * @param {string} userId - The user/chatbot ID
 * @param {number} bytesNeeded - Size needed in bytes
 * @returns {Promise<Object>} - Result of the cleanup operation
 */
async function cleanupOldestData(db, userId, bytesNeeded) {
  try {
    // Handle case when db is not provided
    if (!db) {
      console.error('Database reference is undefined in cleanupOldestData');
      return {
        success: false,
        freedBytes: 0,
        deletedItems: 0,
        error: 'Database reference is missing'
      };
    }
    
    // First get all user data sorted by timestamp (oldest first)
    const uploadsPromise = db.collection('uploads')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'asc')
      .get();
    
    const textInputsPromise = db.collection('textInputs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'asc')
      .get();
    
    const websiteContentPromise = db.collection('websiteContent')
      .where('userId', '==', userId)
      .orderBy('parsedAt', 'asc')
      .get();
    
    // Get data
    const [uploadsSnapshot, textInputsSnapshot, websiteContentSnapshot] = await Promise.all([
      uploadsPromise,
      textInputsPromise,
      websiteContentPromise
    ]);
    
    // Combine and sort all items by timestamp
    const allItems = [];
    
    uploadsSnapshot.forEach(doc => {
      const data = doc.data();
      allItems.push({
        id: doc.id,
        collection: 'uploads',
        timestamp: data.uploadedAt.toDate(),
        size: data.fileSize + getStringSizeInBytes(data.textContent || ''),
        data: data
      });
    });
    
    textInputsSnapshot.forEach(doc => {
      const data = doc.data();
      allItems.push({
        id: doc.id,
        collection: 'textInputs',
        timestamp: data.createdAt.toDate(),
        size: getStringSizeInBytes(data.text || ''),
        data: data
      });
    });
    
    websiteContentSnapshot.forEach(doc => {
      const data = doc.data();
      allItems.push({
        id: doc.id,
        collection: 'websiteContent',
        timestamp: data.parsedAt.toDate(),
        size: getStringSizeInBytes(data.textContent || '') + getStringSizeInBytes(JSON.stringify(data.metadata || {})),
        data: data
      });
    });
    
    // Sort by timestamp (oldest first)
    allItems.sort((a, b) => a.timestamp - b.timestamp);
    
    // Delete oldest items until we have enough space
    let freedBytes = 0;
    const deletedItems = [];
    
    for (const item of allItems) {
      // Delete item
      await db.collection(item.collection).doc(item.id).delete();
      
      // If it's a file, delete from storage too
      if (item.collection === 'uploads' && item.data.storageRef) {
        try {
          // Delete the actual file from storage
          const storageRef = firebase.storage().ref(item.data.storageRef);
          await storageRef.delete();
        } catch (storageError) {
          console.warn('Error deleting file from storage:', storageError);
          // Continue with cleanup even if storage deletion fails
        }
      }
      
      freedBytes += item.size;
      deletedItems.push(item);
      
      // Check if we've freed enough space
      if (freedBytes >= bytesNeeded) {
        break;
      }
    }
    
    return {
      success: freedBytes >= bytesNeeded,
      freedBytes,
      deletedCount: deletedItems.length,
      deletedItems: deletedItems.map(item => ({
        id: item.id,
        collection: item.collection,
        size: item.size,
        timestamp: item.timestamp
      }))
    };
  } catch (error) {
    console.error('Error cleaning up oldest data:', error);
    throw error;
  }
}

module.exports = {
  MAX_STORAGE_PER_CHATBOT,
  calculateChatbotStorageSize,
  checkStorageLimit,
  cleanupOldestData,
  getStringSizeInBytes
};
