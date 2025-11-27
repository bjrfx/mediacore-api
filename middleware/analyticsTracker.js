/**
 * Analytics Tracker Middleware
 * 
 * Tracks all API requests and stores analytics data in Firestore.
 * Provides comprehensive stats including request counts, response times,
 * endpoint usage, API key usage, and more.
 */

const { db } = require('../config/firebase');

// In-memory cache for batching writes (improves performance)
let requestBuffer = [];
const BUFFER_FLUSH_INTERVAL = 10000; // Flush every 10 seconds
const BUFFER_MAX_SIZE = 50; // Or when buffer reaches 50 items

/**
 * Flush the request buffer to Firestore
 */
const flushBuffer = async () => {
  if (requestBuffer.length === 0) return;

  const batch = db.batch();
  const requests = [...requestBuffer];
  requestBuffer = [];

  try {
    // Add individual request logs
    for (const request of requests) {
      const docRef = db.collection('analytics_requests').doc();
      batch.set(docRef, request);
    }

    // Update daily aggregates
    const today = new Date().toISOString().split('T')[0];
    const dailyRef = db.collection('analytics_daily').doc(today);
    
    const dailyDoc = await dailyRef.get();
    const currentData = dailyDoc.exists ? dailyDoc.data() : {
      date: today,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      endpoints: {},
      methods: {},
      statusCodes: {},
      apiKeys: {},
      hourlyRequests: {}
    };

    // Aggregate the buffered requests
    for (const req of requests) {
      currentData.totalRequests++;
      
      if (req.statusCode >= 200 && req.statusCode < 400) {
        currentData.successfulRequests++;
      } else {
        currentData.failedRequests++;
      }

      currentData.totalResponseTime += req.responseTime || 0;

      // Track by endpoint
      const endpoint = req.endpoint || 'unknown';
      currentData.endpoints[endpoint] = (currentData.endpoints[endpoint] || 0) + 1;

      // Track by method
      const method = req.method || 'unknown';
      currentData.methods[method] = (currentData.methods[method] || 0) + 1;

      // Track by status code
      const statusCode = String(req.statusCode || 'unknown');
      currentData.statusCodes[statusCode] = (currentData.statusCodes[statusCode] || 0) + 1;

      // Track by API key (masked)
      if (req.apiKeyId) {
        currentData.apiKeys[req.apiKeyId] = (currentData.apiKeys[req.apiKeyId] || 0) + 1;
      }

      // Track hourly distribution
      const hour = new Date(req.timestamp).getHours().toString().padStart(2, '0');
      currentData.hourlyRequests[hour] = (currentData.hourlyRequests[hour] || 0) + 1;
    }

    // Calculate average response time
    currentData.avgResponseTime = currentData.totalRequests > 0 
      ? Math.round(currentData.totalResponseTime / currentData.totalRequests) 
      : 0;

    batch.set(dailyRef, currentData, { merge: true });

    // Update overall stats
    const overallRef = db.collection('analytics_stats').doc('overall');
    const overallDoc = await overallRef.get();
    const overallData = overallDoc.exists ? overallDoc.data() : {
      totalRequests: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      createdAt: new Date().toISOString()
    };

    overallData.totalRequests += requests.length;
    overallData.totalSuccessful += requests.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    overallData.totalFailed += requests.filter(r => r.statusCode >= 400).length;
    overallData.lastUpdated = new Date().toISOString();

    batch.set(overallRef, overallData, { merge: true });

    await batch.commit();
    console.log(`📊 Flushed ${requests.length} analytics records to Firestore`);
  } catch (error) {
    console.error('Error flushing analytics buffer:', error);
    // Re-add failed requests to buffer for retry
    requestBuffer = [...requests, ...requestBuffer];
  }
};

// Set up periodic flushing
setInterval(flushBuffer, BUFFER_FLUSH_INTERVAL);

// Flush on process exit
process.on('beforeExit', flushBuffer);
process.on('SIGINT', async () => {
  await flushBuffer();
  process.exit(0);
});

/**
 * Analytics tracking middleware
 * Records details about each API request
 */
const analyticsTracker = (req, res, next) => {
  const startTime = Date.now();

  // Capture the original end function
  const originalEnd = res.end;
  const originalJson = res.json;

  // Override res.json to capture response
  res.json = function(data) {
    res.responseBody = data;
    return originalJson.call(this, data);
  };

  // Override res.end to capture when response is sent
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Don't track health check or static files
    const skipPaths = ['/health', '/favicon.ico'];
    const isStaticFile = req.path.startsWith('/public/');
    
    if (!skipPaths.includes(req.path) && !isStaticFile) {
      const analyticsData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        endpoint: getEndpointCategory(req.path),
        query: Object.keys(req.query).length > 0 ? req.query : null,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent') || 'unknown',
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        apiKeyId: req.apiKey?.id || null,
        apiKeyName: req.apiKey?.name || null,
        userId: req.user?.uid || null,
        isAdmin: req.user?.isAdmin || false,
        contentType: res.get('Content-Type') || 'unknown',
        responseSize: res.get('Content-Length') || null,
        success: res.statusCode >= 200 && res.statusCode < 400
      };

      requestBuffer.push(analyticsData);

      // Flush if buffer is full
      if (requestBuffer.length >= BUFFER_MAX_SIZE) {
        flushBuffer();
      }
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Categorize endpoint for aggregation
 */
const getEndpointCategory = (path) => {
  if (path.startsWith('/api/feed')) return '/api/feed';
  if (path.startsWith('/api/media')) return '/api/media';
  if (path.startsWith('/api/settings')) return '/api/settings';
  if (path.startsWith('/admin/generate-key')) return '/admin/generate-key';
  if (path.startsWith('/admin/api-keys')) return '/admin/api-keys';
  if (path.startsWith('/admin/media')) return '/admin/media';
  if (path.startsWith('/admin/settings')) return '/admin/settings';
  if (path.startsWith('/admin/analytics')) return '/admin/analytics';
  if (path === '/' || path === '/health') return path;
  return 'other';
};

/**
 * Get analytics summary
 */
const getAnalyticsSummary = async (options = {}) => {
  const { days = 30 } = options;
  
  try {
    // Get overall stats
    const overallDoc = await db.collection('analytics_stats').doc('overall').get();
    const overall = overallDoc.exists ? overallDoc.data() : { totalRequests: 0 };

    // Get daily stats for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const dailySnapshot = await db.collection('analytics_daily')
      .where('date', '>=', startDateStr)
      .orderBy('date', 'desc')
      .get();

    const dailyStats = dailySnapshot.docs.map(doc => doc.data());

    // Calculate period totals
    const periodStats = dailyStats.reduce((acc, day) => {
      acc.totalRequests += day.totalRequests || 0;
      acc.successfulRequests += day.successfulRequests || 0;
      acc.failedRequests += day.failedRequests || 0;
      acc.totalResponseTime += day.totalResponseTime || 0;

      // Merge endpoint stats
      for (const [endpoint, count] of Object.entries(day.endpoints || {})) {
        acc.endpoints[endpoint] = (acc.endpoints[endpoint] || 0) + count;
      }

      // Merge method stats
      for (const [method, count] of Object.entries(day.methods || {})) {
        acc.methods[method] = (acc.methods[method] || 0) + count;
      }

      // Merge status code stats
      for (const [code, count] of Object.entries(day.statusCodes || {})) {
        acc.statusCodes[code] = (acc.statusCodes[code] || 0) + count;
      }

      return acc;
    }, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      endpoints: {},
      methods: {},
      statusCodes: {}
    });

    // Calculate averages
    periodStats.avgResponseTime = periodStats.totalRequests > 0
      ? Math.round(periodStats.totalResponseTime / periodStats.totalRequests)
      : 0;

    periodStats.successRate = periodStats.totalRequests > 0
      ? Math.round((periodStats.successfulRequests / periodStats.totalRequests) * 100 * 100) / 100
      : 0;

    return {
      overall,
      period: {
        days,
        ...periodStats
      },
      daily: dailyStats,
      topEndpoints: Object.entries(periodStats.endpoints)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }))
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    throw error;
  }
};

/**
 * Get real-time stats (last 24 hours by hour)
 */
const getRealTimeStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [todayDoc, yesterdayDoc] = await Promise.all([
      db.collection('analytics_daily').doc(today).get(),
      db.collection('analytics_daily').doc(yesterday).get()
    ]);

    const todayData = todayDoc.exists ? todayDoc.data() : null;
    const yesterdayData = yesterdayDoc.exists ? yesterdayDoc.data() : null;

    // Get recent requests (last 100)
    const recentSnapshot = await db.collection('analytics_requests')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const recentRequests = recentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate requests per minute (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    const recentCount = recentRequests.filter(r => 
      new Date(r.timestamp).getTime() > fiveMinutesAgo
    ).length;
    const requestsPerMinute = Math.round((recentCount / 5) * 100) / 100;

    return {
      today: todayData,
      yesterday: yesterdayData,
      recentRequests: recentRequests.slice(0, 20),
      requestsPerMinute,
      bufferSize: requestBuffer.length
    };
  } catch (error) {
    console.error('Error getting real-time stats:', error);
    throw error;
  }
};

/**
 * Get API key usage statistics
 */
const getApiKeyStats = async (keyId = null) => {
  try {
    let query = db.collection('analytics_requests');
    
    if (keyId) {
      query = query.where('apiKeyId', '==', keyId);
    } else {
      query = query.where('apiKeyId', '!=', null);
    }

    const snapshot = await query
      .orderBy('apiKeyId')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();

    const requests = snapshot.docs.map(doc => doc.data());

    // Group by API key
    const keyStats = {};
    for (const req of requests) {
      if (!req.apiKeyId) continue;
      
      if (!keyStats[req.apiKeyId]) {
        keyStats[req.apiKeyId] = {
          id: req.apiKeyId,
          name: req.apiKeyName,
          totalRequests: 0,
          successful: 0,
          failed: 0,
          endpoints: {},
          lastUsed: null
        };
      }

      const stat = keyStats[req.apiKeyId];
      stat.totalRequests++;
      
      if (req.statusCode >= 200 && req.statusCode < 400) {
        stat.successful++;
      } else {
        stat.failed++;
      }

      stat.endpoints[req.endpoint] = (stat.endpoints[req.endpoint] || 0) + 1;

      if (!stat.lastUsed || req.timestamp > stat.lastUsed) {
        stat.lastUsed = req.timestamp;
      }
    }

    return Object.values(keyStats).sort((a, b) => b.totalRequests - a.totalRequests);
  } catch (error) {
    console.error('Error getting API key stats:', error);
    throw error;
  }
};

module.exports = analyticsTracker;
module.exports.getAnalyticsSummary = getAnalyticsSummary;
module.exports.getRealTimeStats = getRealTimeStats;
module.exports.getApiKeyStats = getApiKeyStats;
module.exports.flushBuffer = flushBuffer;
