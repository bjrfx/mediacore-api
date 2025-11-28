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
  "private_key_id": "9f2d802d0021ed508f0452b182c5adc1aad94d47",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCkkxm8n9rb0ubj\nIvtvdHBcfJPI+EXcUHlcvSSSs7lU0eX6yjsty3crjDKxZhK5V5KZWXucYAPDRaVP\nLYsxG+gK+xWCKToy5mSr/FAlc3lWbyyfQlUb3WhPi5wJt/llIwx0jwq3IgsXizy6\naHshbij6HWXKSzuUJE11YQ2BIO7JvH6RXj8L86OVjpUkSekUJ/IPfmnHU73ybEDa\nPsCZX7wr4DQ+L/LwdIZB1ew0m7V1BhqXlMoXQgCTuTFYJuCCp0rv0lieCL+vwIpi\nG9FkW5Tlihg/wC5OXNR2rkPWuxVFKRxPRshdTgfE9GKrhts8Tj/51pI6KVEzHXk+\nrLpI7nF1AgMBAAECggEAG4er73zCLLGcA/TvIJbW0PHZ+u1lKlSf6J6PRqcf4ot2\nMDyyJ5f4qGU8eaZ8jVqT4Gkyn1cEah71Z0hUF3P2nhegYnSpEqitwINlmM43Rvkz\n+rQq7o1cDKprAMkww/VX+QuQnE/qkRauovQlXNNDsYtHYs6w+bgU6QTCMI6kw0Qq\n/ZBtgaOiIPIa6/vHSNuGnxdXZeGmNnODRQF5EqtZjIRYhOjHq9QVGQpk80CBt4ra\neldTgo8JHclpOsHN2Akm3IdtWxoXNGDC6as2KvSnPBXe6CYT8jEHYTLnA+0lgvUX\nCGS0OdGH3JD7rfJLWIVEE08f3tPANzf5jzpdoEgRxQKBgQDdZMDfcUQgig/Yht2J\nJ3/s5OVwqDeNRw6R3tchPrlHw69mNx/X36azCXjEavP/pKFWkEmtboA9bfU1dscI\nA5Awy4D/El+LK0Hjj3hfM9EYdwe+bzFwuUhlzVuJ+upPX44W3Eh6vxlvwhEI6XnW\n0sq3YvALtcUBZOoOxIwmuunb2wKBgQC+TLCLDzSGspFlxPzF0IXAr6FwLzitLRC5\naHAY3uzghsiEZSNhXLOOfpfQZGSxWlD2oEunCqH3J6sFYWKiQVODpn6Pf3wJYHbq\nZC8dI+950osnifeP7J/TdqrrNDJBHn+hZquIJb3uGuuQhLUptV4oWG5hBCHUZQut\nX6wImX2Q7wKBgBZcJaqriuDqcL1Cqb8/cQkg+RdOtgWbxpnu8rVV22qnFeDx8lJg\nMTrl2v+jea85Fl5ixj4w6dzKbTiQHXvuuDJla0rXtTSeEtKD2/lph1W8N9kA6/Jh\nlDFL81HVOLL5iKVAbEWRZWVHKWdIBVkwAu9Qm8PjANmqMoV5TlpfCF1/AoGAexN6\nctWosR04cEuQ+Bc/CjoM/VNtIoOs910Wct9q8GP7t7T5xvR/pL83TK5BeXriNj/B\n7g0wZ3seXuJ3Ol1puBGsdP6MqDvdbQbSedROA8op+a5/kHQHgmqTbH9bqUYiYa7X\nbbyLND3w8I0D5i/I7+sRqGlVv9qCTOU9jGpJDb0CgYEA16vJUXAS0pC50ORme4hN\nAH3iqog9lE+lV5XXaKChDN9rsTIYFECpuTJic66oJG5/ax2MIF2L2UFqbAWdAjGK\nDyrrk/5tLBBni3mz5A6QuDSdkG7Nz9JSpdtxEnGL7OOmlESCcUnCFVfDkpRR5g4K\nZ1BLYEu87rSa8RNRZlYJrdc=\n-----END PRIVATE KEY-----\n",
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
