/**
 * Firebase Admin SDK Configuration
 * 
 * Hardcoded credentials for cPanel deployment
 */

const admin = require('firebase-admin');

// Firebase Service Account Credentials (Hardcoded)
const serviceAccount = {
  "type": "service_account",
  "project_id": "eckhart-tolle-7a33f",
  "private_key_id": "",
  "private_key": "",
  "client_email": "firebase-adminsdk-fbsvc@eckhart-tolle-7a33f.iam.gserviceaccount.com",
  "client_id": "107429782563275261448",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40eckhart-tolle-7a33f.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('   Project:', serviceAccount.project_id);
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
