/**
 * Admin Authentication Middleware
 * 
 * Verifies Firebase ID Tokens to authenticate admin users.
 * Only authenticated admins can access protected routes like
 * uploading files or generating API keys.
 */

const { auth, db } = require('../config/firebase');

/**
 * Middleware to verify Firebase ID Token
 * 
 * Expects the Authorization header in format: "Bearer <idToken>"
 * Verifies the token with Firebase Admin SDK and optionally
 * checks if the user has admin privileges.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected format: Bearer <token>'
      });
    }

    // Extract the token
    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided in Authorization header'
      });
    }

    // Verify the ID token with Firebase
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if token is expired (Firebase SDK handles this, but double-check)
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < currentTime) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token has expired. Please sign in again.'
      });
    }

    // Optionally verify admin status from Firestore
    // You can store admin users in a 'admins' collection or use custom claims
    const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
    
    // Check if user exists in admins collection OR has admin custom claim
    const isAdmin = adminDoc.exists || decodedToken.admin === true;

    if (!isAdmin) {
      // If no explicit admin record, check if this is the first user (auto-admin for setup)
      const adminsSnapshot = await db.collection('admins').limit(1).get();
      
      if (adminsSnapshot.empty) {
        // First authenticated user becomes admin automatically
        await db.collection('admins').doc(decodedToken.uid).set({
          email: decodedToken.email || null,
          uid: decodedToken.uid,
          createdAt: new Date().toISOString(),
          role: 'super_admin',
          autoCreated: true
        });
        console.log(`✅ Auto-created first admin: ${decodedToken.email || decodedToken.uid}`);
      } else {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'User does not have admin privileges'
        });
      }
    }

    // Attach user info to request for use in route handlers
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      isAdmin: true
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token has expired. Please sign in again.'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token has been revoked. Please sign in again.'
      });
    }

    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate user'
    });
  }
};

module.exports = checkAdminAuth;
