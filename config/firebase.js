/**
 * Firebase Admin SDK Configuration
 * 
 * This module initializes the Firebase Admin SDK using environment variables.
 * For cPanel deployment, set these variables in the Node.js App configuration.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

/**
 * Initialize Firebase Admin SDK
 * 
 * The service account credentials can be provided in three ways:
 * 1. As a JSON file at config/serviceAccountKey.json (RECOMMENDED for cPanel)
 * 2. As a JSON string in FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 * 3. As individual environment variables (FIREBASE_PROJECT_ID, etc.)
 */
const initializeFirebase = () => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  let serviceAccount;

  // Option 1: Load from JSON file (BEST for cPanel - avoids env var length limits)
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log('📋 Firebase credentials loaded from serviceAccountKey.json');
      console.log('   Project:', serviceAccount.project_id);
    } catch (error) {
      console.error('Error reading serviceAccountKey.json:', error.message);
    }
  }

  // Option 2: Full service account JSON as environment variable
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      serviceAccount = JSON.parse(keyString);
      
      // Fix the private key - replace escaped newlines with actual newlines
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      console.log('📋 Firebase credentials loaded from environment variable');
      console.log('   Project:', serviceAccount.project_id);
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
      console.error('Key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);
    }
  }
  
  // Option 3: Individual environment variables
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && 
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
    console.log('📋 Firebase credentials loaded from individual env vars');
  }
  
  if (!serviceAccount) {
    console.error('❌ Firebase credentials not found!');
    console.error('   Checked: config/serviceAccountKey.json - NOT FOUND');
    console.error('   Checked: FIREBASE_SERVICE_ACCOUNT_KEY env var - NOT SET or INVALID');
    console.error('   Checked: Individual env vars - NOT SET');
    throw new Error(
      'Firebase credentials not found. Please either:\n' +
      '1. Add config/serviceAccountKey.json file (recommended for cPanel)\n' +
      '2. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable\n' +
      '3. Set individual FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY variables'
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
