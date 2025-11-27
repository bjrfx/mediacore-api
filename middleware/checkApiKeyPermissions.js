/**
 * API Key Permissions Middleware
 * 
 * Validates API keys from the x-api-key header and checks if the key's
 * stored permissions grant access to the requested HTTP Method and Resource Path.
 */

const { db } = require('../config/firebase');

/**
 * Permission mapping from HTTP methods to permission actions
 */
const METHOD_TO_ACTION = {
  GET: 'read',
  POST: 'write',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete'
};

/**
 * Resource mapping from URL paths to resource names
 * Maps URL patterns to their corresponding permission resource
 */
const PATH_TO_RESOURCE = {
  '/api/feed': 'media',
  '/api/media': 'media',
  '/api/settings': 'settings',
  '/admin/media': 'media',
  '/admin/settings': 'settings'
};

/**
 * Predefined permission sets for different access levels
 */
const PERMISSION_PRESETS = {
  // Read Access Only: GET requests on media and settings
  read_only: [
    'read:media',
    'read:settings'
  ],
  
  // All Access (CRUD): Full permissions on all resources
  full_access: [
    'read:media',
    'write:media',
    'update:media',
    'delete:media',
    'read:settings',
    'update:settings'
  ],
  
  // Available permissions for custom selection
  available_permissions: [
    'read:media',
    'write:media',
    'update:media',
    'delete:media',
    'read:settings',
    'update:settings'
  ]
};

/**
 * Extract resource name from request path
 * 
 * @param {string} path - The request path
 * @returns {string|null} - The resource name or null if not found
 */
const getResourceFromPath = (path) => {
  // Direct match
  if (PATH_TO_RESOURCE[path]) {
    return PATH_TO_RESOURCE[path];
  }

  // Pattern matching for dynamic routes (e.g., /api/media/:id)
  const pathSegments = path.split('/').filter(Boolean);
  
  // Check common patterns
  if (pathSegments.includes('media') || pathSegments.includes('feed')) {
    return 'media';
  }
  if (pathSegments.includes('settings')) {
    return 'settings';
  }

  // Check parent paths
  for (const [registeredPath, resource] of Object.entries(PATH_TO_RESOURCE)) {
    if (path.startsWith(registeredPath)) {
      return resource;
    }
  }

  return null;
};

/**
 * Build required permission string from method and resource
 * 
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} resource - Resource name (media, settings)
 * @returns {string} - Permission string (e.g., "read:media")
 */
const buildPermissionString = (method, resource) => {
  const action = METHOD_TO_ACTION[method.toUpperCase()];
  if (!action || !resource) {
    return null;
  }
  return `${action}:${resource}`;
};

/**
 * Check if the provided permissions include the required permission
 * 
 * @param {string[]} grantedPermissions - Array of permissions the key has
 * @param {string} requiredPermission - The permission needed for this request
 * @returns {boolean} - Whether access is granted
 */
const hasPermission = (grantedPermissions, requiredPermission) => {
  if (!Array.isArray(grantedPermissions) || !requiredPermission) {
    return false;
  }
  return grantedPermissions.includes(requiredPermission);
};

/**
 * Middleware factory to check API key permissions
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowAdminBypass - If true, admin auth bypasses API key check
 * @returns {Function} Express middleware function
 */
const checkApiKeyPermissions = (options = {}) => {
  const { allowAdminBypass = true } = options;

  return async (req, res, next) => {
    try {
      // Check if admin is already authenticated and bypass is allowed
      if (allowAdminBypass && req.user && req.user.isAdmin) {
        return next();
      }

      // Get API key from header
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Missing x-api-key header'
        });
      }

      // Look up the API key in Firestore
      const keySnapshot = await db.collection('api_keys')
        .where('key', '==', apiKey)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (keySnapshot.empty) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or inactive API key'
        });
      }

      const keyDoc = keySnapshot.docs[0];
      const keyData = keyDoc.data();

      // Check if key has expired
      if (keyData.expiresAt) {
        const expirationDate = keyData.expiresAt.toDate ? 
          keyData.expiresAt.toDate() : 
          new Date(keyData.expiresAt);
        
        if (expirationDate < new Date()) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'API key has expired'
          });
        }
      }

      // Determine the required permission for this request
      const resource = getResourceFromPath(req.path);
      
      if (!resource) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Unknown resource path'
        });
      }

      const requiredPermission = buildPermissionString(req.method, resource);

      if (!requiredPermission) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Unable to determine required permission'
        });
      }

      // Check if the key has the required permission
      const permissions = keyData.permissions || [];

      if (!hasPermission(permissions, requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `API key does not have '${requiredPermission}' permission`,
          required: requiredPermission,
          granted: permissions
        });
      }

      // Update last used timestamp (fire and forget)
      db.collection('api_keys').doc(keyDoc.id).update({
        lastUsedAt: new Date().toISOString(),
        usageCount: (keyData.usageCount || 0) + 1
      }).catch(err => console.error('Failed to update API key usage:', err));

      // Attach API key info to request
      req.apiKey = {
        id: keyDoc.id,
        name: keyData.name,
        permissions: permissions,
        createdBy: keyData.createdBy
      };

      next();
    } catch (error) {
      console.error('API key validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to validate API key'
      });
    }
  };
};

/**
 * Helper function to validate custom permissions array
 * 
 * @param {string[]} permissions - Array of permission strings to validate
 * @returns {Object} - Validation result with isValid and invalidPermissions
 */
const validatePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return { isValid: false, message: 'Permissions must be an array' };
  }

  const validPermissions = PERMISSION_PRESETS.available_permissions;
  const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

  return {
    isValid: invalidPermissions.length === 0,
    invalidPermissions,
    message: invalidPermissions.length > 0 
      ? `Invalid permissions: ${invalidPermissions.join(', ')}`
      : 'All permissions are valid'
  };
};

/**
 * Get permissions array based on access type
 * 
 * @param {string} accessType - 'read_only', 'full_access', or 'custom'
 * @param {string[]} customPermissions - Custom permissions array (for 'custom' type)
 * @returns {string[]} - Array of permission strings
 */
const getPermissionsByAccessType = (accessType, customPermissions = []) => {
  switch (accessType) {
    case 'read_only':
      return [...PERMISSION_PRESETS.read_only];
    case 'full_access':
      return [...PERMISSION_PRESETS.full_access];
    case 'custom':
      return customPermissions;
    default:
      return [...PERMISSION_PRESETS.read_only];
  }
};

module.exports = checkApiKeyPermissions;
module.exports.PERMISSION_PRESETS = PERMISSION_PRESETS;
module.exports.validatePermissions = validatePermissions;
module.exports.getPermissionsByAccessType = getPermissionsByAccessType;
module.exports.buildPermissionString = buildPermissionString;
module.exports.getResourceFromPath = getResourceFromPath;
