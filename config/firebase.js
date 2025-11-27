/**
 * Firebase Admin SDK Configuration
 * 
 * This module initializes the Firebase Admin SDK using environment variables.
 * For cPanel deployment, set these variables in the Node.js App configuration.
 */

const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK
 * 
 * The service account credentials can be provided in two ways:
 * 1. As a JSON string in FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 * 2. As individual environment variables (FIREBASE_PROJECT_ID, etc.)
 */
const initializeFirebase = () => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  let serviceAccount;

  // Option 1: Full service account JSON as environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      // Handle escaped newlines in the JSON string (common in cPanel)
      let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      // Parse the JSON
      serviceAccount = JSON.parse(keyString);
      
      // Fix the private key - replace escaped newlines with actual newlines
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      console.log('📋 Firebase service account loaded for project:', serviceAccount.project_id);
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
      console.error('Key preview:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 100) + '...');
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
    }
  } 
  // Option 2: Individual environment variables
  else if (process.env.FIREBASE_PROJECT_ID && 
           process.env.FIREBASE_CLIENT_EMAIL && 
           process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
    };
  } else {
    console.error('❌ Firebase credentials not found!');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('FIREBASE')));
    throw new Error(
      'Firebase credentials not found. Please set either FIREBASE_SERVICE_ACCOUNT_KEY ' +
      'or individual variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
    );
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }

  return admin;
};

// Initialize on module load
initializeFirebase();

// Export the admin instance and Firestore reference
module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth()
};
