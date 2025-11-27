/**
 * Middleware Index
 * Export all middleware functions for easy importing
 */

const checkAdminAuth = require('./checkAdminAuth');
const checkApiKeyPermissions = require('./checkApiKeyPermissions');
const analyticsTracker = require('./analyticsTracker');

module.exports = {
  checkAdminAuth,
  checkApiKeyPermissions,
  analyticsTracker
};
