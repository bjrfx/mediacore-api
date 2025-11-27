/**
 * MediaCore API Server
 * 
 * A Node.js/Express backend for managing media content with Firebase
 * authentication and role-based API key permissions.
 * 
 * Compatible with cPanel's Node.js App environment.
 */

// Load environment variables first (for local development)
// In cPanel, environment variables are set via the control panel
require('dotenv').config();

// Debug: Log environment status (remove in production)
console.log('🔧 Environment Check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  - PORT:', process.env.PORT || 'not set (will use 3000)');
console.log('  - FIREBASE_SERVICE_ACCOUNT_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'SET ✓' : 'NOT SET ✗');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Firebase and middleware imports
const { db } = require('./config/firebase');
const { checkAdminAuth, checkApiKeyPermissions, analyticsTracker } = require('./middleware');
const { 
  PERMISSION_PRESETS, 
  validatePermissions, 
  getPermissionsByAccessType 
} = require('./middleware/checkApiKeyPermissions');
const {
  getAnalyticsSummary,
  getRealTimeStats,
  getApiKeyStats,
  flushBuffer: flushAnalyticsBuffer
} = require('./middleware/analyticsTracker');

// Initialize Express app
const app = express();

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024; // 500MB default

// Allowed file types
const ALLOWED_MIME_TYPES = {
  video: ['video/mp4'],
  audio: ['audio/mpeg', 'audio/mp3']
};

const ALLOWED_EXTENSIONS = {
  video: ['.mp4'],
  audio: ['.mp3']
};

// =============================================================================
// ENSURE UPLOAD DIRECTORY EXISTS
// =============================================================================

const ensureUploadDir = () => {
  const uploadPath = path.resolve(UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Created upload directory: ${uploadPath}`);
  }
  return uploadPath;
};

const uploadPath = ensureUploadDir();

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'video';
    const typeDir = path.join(uploadPath, type === 'audio' ? 'audio' : 'video');
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uniqueId}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const type = req.body.type || 'video';
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ALLOWED_MIME_TYPES[type] || ALLOWED_MIME_TYPES.video;
  const allowedExts = ALLOWED_EXTENSIONS[type] || ALLOWED_EXTENSIONS.video;
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExts.join(', ')} for ${type}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded media)
app.use('/public', express.static(path.resolve('./public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Analytics tracking middleware (after logging, before routes)
app.use(analyticsTracker);

// =============================================================================
// HEALTH CHECK ROUTE
// =============================================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MediaCore API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// PUBLIC API ROUTES (Require API Key with appropriate permissions)
// =============================================================================

/**
 * GET /api/feed
 * Returns a list of all media content
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/feed', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { type, limit = 50, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    let query = db.collection('media_content');
    
    // Filter by type if specified
    if (type && ['video', 'audio'].includes(type)) {
      query = query.where('type', '==', type);
    }
    
    // Order results
    query = query.orderBy(orderBy, order);
    
    // Limit results
    query = query.limit(parseInt(limit));
    
    const snapshot = await query.get();
    
    const mediaList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: mediaList.length,
      data: mediaList
    });
  } catch (error) {
    console.error('Error fetching media feed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch media content'
    });
  }
});

/**
 * GET /api/media/:id
 * Get a single media item by ID
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/media/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('media_content').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch media content'
    });
  }
});

/**
 * GET /api/settings
 * Get app settings
 * Requires: API Key with 'read:settings' permission
 */
app.get('/api/settings', checkApiKeyPermissions(), async (req, res) => {
  try {
    const doc = await db.collection('app_settings').doc('general').get();
    
    const settings = doc.exists ? doc.data() : {
      appName: 'MediaCore',
      version: '1.0.0',
      defaultSettings: true
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch settings'
    });
  }
});

// =============================================================================
// ADMIN ROUTES (Require Firebase Admin Authentication)
// =============================================================================

/**
 * POST /admin/generate-key
 * Generate a new API key with specified permissions
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/generate-key', checkAdminAuth, async (req, res) => {
  try {
    const { 
      name, 
      accessType = 'read_only', 
      customPermissions = [], 
      expiresInDays = null,
      description = ''
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'API key name is required'
      });
    }

    // Validate access type
    const validAccessTypes = ['read_only', 'full_access', 'custom'];
    if (!validAccessTypes.includes(accessType)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid access type. Must be one of: ${validAccessTypes.join(', ')}`
      });
    }

    // Get permissions based on access type
    let permissions;
    if (accessType === 'custom') {
      // Validate custom permissions
      const validation = validatePermissions(customPermissions);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: validation.message,
          availablePermissions: PERMISSION_PRESETS.available_permissions
        });
      }
      permissions = customPermissions;
    } else {
      permissions = getPermissionsByAccessType(accessType);
    }

    // Generate unique API key
    const apiKey = `mc_${uuidv4().replace(/-/g, '')}`;

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key document
    const keyData = {
      key: apiKey,
      name,
      description,
      accessType,
      permissions,
      isActive: true,
      createdBy: req.user.uid,
      createdByEmail: req.user.email,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      lastUsedAt: null,
      usageCount: 0
    };

    const docRef = await db.collection('api_keys').add(keyData);

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        id: docRef.id,
        key: apiKey,
        name,
        accessType,
        permissions,
        expiresAt: expiresAt ? expiresAt.toISOString() : 'Never'
      }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate API key'
    });
  }
});

/**
 * GET /admin/api-keys
 * List all API keys
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('api_keys')
      .orderBy('createdAt', 'desc')
      .get();
    
    const keys = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        accessType: data.accessType,
        permissions: data.permissions,
        isActive: data.isActive,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        lastUsedAt: data.lastUsedAt,
        usageCount: data.usageCount,
        // Mask the key for security (show only last 8 chars)
        keyPreview: `mc_****${data.key.slice(-8)}`
      };
    });

    res.json({
      success: true,
      count: keys.length,
      data: keys
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list API keys'
    });
  }
});

/**
 * DELETE /admin/api-keys/:id
 * Revoke/delete an API key
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/api-keys/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;

    const docRef = db.collection('api_keys').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found'
      });
    }

    if (hardDelete === 'true') {
      await docRef.delete();
    } else {
      // Soft delete - just deactivate
      await docRef.update({
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: req.user.uid
      });
    }

    res.json({
      success: true,
      message: hardDelete === 'true' ? 'API key deleted permanently' : 'API key deactivated'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete API key'
    });
  }
});

/**
 * POST /admin/media
 * Upload new media content
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/media', checkAdminAuth, upload.single('file'), async (req, res) => {
  try {
    const { title, subtitle, type = 'video' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    if (!title) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title is required'
      });
    }

    // Construct the file path for storage
    const relativePath = `/public/uploads/${type}/${file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    // Save metadata to Firestore
    const mediaData = {
      title,
      subtitle: subtitle || '',
      type,
      filename: file.filename,
      originalName: file.originalname,
      filePath: relativePath,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user.uid,
      uploadedByEmail: req.user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('media_content').add(mediaData);

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        id: docRef.id,
        ...mediaData
      }
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload media'
    });
  }
});

/**
 * PUT /admin/media/:id
 * Update media metadata
 * Requires: Firebase Admin Authentication
 */
app.put('/admin/media/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle } = req.body;

    const docRef = db.collection('media_content').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update media'
    });
  }
});

/**
 * DELETE /admin/media/:id
 * Delete media content (file and metadata)
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/media/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFile = true } = req.query;

    const docRef = db.collection('media_content').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    const mediaData = doc.data();

    // Delete the physical file if requested
    if (deleteFile !== 'false' && mediaData.filePath) {
      const filePath = path.resolve('.' + mediaData.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      }
    }

    // Delete the Firestore document
    await docRef.delete();

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete media'
    });
  }
});

/**
 * PUT /admin/settings
 * Update app settings
 * Requires: Firebase Admin Authentication
 */
app.put('/admin/settings', checkAdminAuth, async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || Object.keys(settings).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No settings provided'
      });
    }

    const docRef = db.collection('app_settings').doc('general');
    
    await docRef.set({
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    }, { merge: true });

    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update settings'
    });
  }
});

/**
 * GET /admin/permissions
 * Get available permissions list
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/permissions', checkAdminAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      presets: {
        read_only: PERMISSION_PRESETS.read_only,
        full_access: PERMISSION_PRESETS.full_access
      },
      available: PERMISSION_PRESETS.available_permissions
    }
  });
});

// =============================================================================
// ANALYTICS ROUTES (Require Firebase Admin Authentication)
// =============================================================================

/**
 * GET /admin/analytics/summary
 * Get analytics summary for the specified period
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/analytics/summary', checkAdminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const summary = await getAnalyticsSummary({ days: parseInt(days) });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics summary'
    });
  }
});

/**
 * GET /admin/analytics/realtime
 * Get real-time analytics (last 24 hours, recent requests)
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/analytics/realtime', checkAdminAuth, async (req, res) => {
  try {
    const realtime = await getRealTimeStats();
    
    res.json({
      success: true,
      data: realtime
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch real-time analytics'
    });
  }
});

/**
 * GET /admin/analytics/api-keys
 * Get API key usage statistics
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/analytics/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const { keyId } = req.query;
    const stats = await getApiKeyStats(keyId);
    
    res.json({
      success: true,
      count: stats.length,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching API key stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch API key statistics'
    });
  }
});

/**
 * GET /admin/analytics/dashboard
 * Get comprehensive dashboard data in a single request
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/analytics/dashboard', checkAdminAuth, async (req, res) => {
  try {
    const [summary, realtime, apiKeyStats] = await Promise.all([
      getAnalyticsSummary({ days: 7 }),
      getRealTimeStats(),
      getApiKeyStats()
    ]);

    // Get media and API key counts
    const [mediaSnapshot, apiKeysSnapshot] = await Promise.all([
      db.collection('media_content').count().get(),
      db.collection('api_keys').where('isActive', '==', true).count().get()
    ]);

    const dashboard = {
      overview: {
        totalMediaItems: mediaSnapshot.data().count,
        activeApiKeys: apiKeysSnapshot.data().count,
        totalRequests: summary.overall.totalRequests || 0,
        requestsToday: realtime.today?.totalRequests || 0,
        requestsPerMinute: realtime.requestsPerMinute,
        successRate: summary.period.successRate,
        avgResponseTime: summary.period.avgResponseTime
      },
      charts: {
        dailyRequests: summary.daily.map(d => ({
          date: d.date,
          requests: d.totalRequests,
          successful: d.successfulRequests,
          failed: d.failedRequests
        })),
        hourlyDistribution: realtime.today?.hourlyRequests || {},
        topEndpoints: summary.topEndpoints,
        methodDistribution: summary.period.methods,
        statusCodeDistribution: summary.period.statusCodes
      },
      apiKeys: apiKeyStats.slice(0, 5),
      recentRequests: realtime.recentRequests
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * POST /admin/analytics/flush
 * Manually flush analytics buffer to Firestore
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/analytics/flush', checkAdminAuth, async (req, res) => {
  try {
    await flushAnalyticsBuffer();
    res.json({
      success: true,
      message: 'Analytics buffer flushed successfully'
    });
  } catch (error) {
    console.error('Error flushing analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to flush analytics buffer'
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File Too Large',
        message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload Error',
      message: error.message
    });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(415).json({
      success: false,
      error: 'Unsupported Media Type',
      message: error.message
    });
  }

  next(error);
});

// Generic error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// =============================================================================
// START SERVER (only for direct execution, NOT for Passenger/cPanel)
// =============================================================================

// Passenger sets this environment variable
const isPassenger = typeof(PhusionPassenger) !== 'undefined' || process.env.PASSENGER_APP_ENV;

if (require.main === module && !isPassenger) {
  // Running directly via `node server.js` (local development)
  const server = app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎬 MediaCore API Server');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📁 Upload directory: ${uploadPath}`);
    console.log(`  📊 Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    console.log(`  🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('═══════════════════════════════════════════════════════');
  });
} else {
  // Being required as module (Passenger/cPanel) - don't start server
  console.log('📦 MediaCore API module loaded');
  console.log(`  📁 Upload directory: ${uploadPath}`);
  console.log(`  🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Export the Express app for Passenger
module.exports = app;
