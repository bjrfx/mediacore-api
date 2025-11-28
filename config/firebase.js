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
  "private_key_id": "2536ac9b863a8e41b3d04a4059562d5518783c54",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCv7+LbIGiEv7fa\nsDCLA/V4xRhlJS3iOMrBIwDsBYvAXw3XL8/YSqmCxRr4iEUyqaO1MB2kl47zoLh+\n0EPb/2+jfBNLZW58jh5dDAaiRWtvLviMaa82HA6MxYMtJ93e/GF/nM2x+v5La1xj\nVZqG/R24aEVxkacYHObWwyUN2GukVhmsumLG4b1RJkTtAtstV1BzR2YS/v20cgsd\nttVM2tBSJpEtawOF8hXRpwaBpYUAMsmqx1Wo7dZolZDGSK0W0y9lNQP9pJfg/nuf\nrQntiuF/inIb7916XNt4Q4lA6is+pk4aMpM9WzPe918TNdY2LZgm+kB1A7Ed+CQB\njC63FG7bAgMBAAECggEAQzCtZfsT/3KKX/G+sDCEXCmFXgdbZRREVossLHcXvpFu\nozomudcVspPc74J3TthbZXRpNbUNynwcSY33BHsiYwCdC8PCdL3/2ZAgrnMtiuoY\n0OMBn3wKkHdT1/hsMt8WyxoSskCFQj9Pqr4EBD6BTa5AqxUxh7Nt8yHWsllvDnSS\nxBOD4+/9Jg8NsaenfRK9fvfazQ7uw6aKuDvk9ky3lOSEoUOSkTKCC+VHFX7xyiyg\naw1Xp4vSXAkKYxbnqKdkGblQlFAGSvy0Zzxa7sV6qCs+UBNzRGaIy9S0u5ow7TTg\n1ywWEQc6UB4hU2hRkEeENHIAZ4KRkwFPFu0wsofpEQKBgQDle1L67vnrpDpWBldy\nV3Cp6FgfmRQ9VdrLEPZszR4oBt8ROWO1pnC8TYkYP0sO645nfIQMERF8XRyylfpi\nf0tvvFfaN9ZYto4qElXIbQ3psk1F0VKfedvr8Bmlf9lfMlwevcfb6L3mO5sf9i6v\nfaOitr0mSN8LO/FjLKyOLtJRawKBgQDERJGndYKZODwR1XTyfxc5Z3l7pN+mgEzg\nS1z7S0temQYda7af8UgHDmKqVHpJ9u9Mz9elvdAw8uT7dfvAUcr+BpeY3dIbWzJ/\n5bdW06KeharLoWDoJZVawxbNjObgPBQeFbbWjnU0ZroxxSegZB0FoAs4XHuJb+j1\nBjuO4YkEUQKBgHS2yHl/2fSTTmg6SXeKKW8BEPDhNn4LkH//XJXxrQjGleV4vtHA\nmU3sUXHXnyEzhPX1SmOouq/524Ko7PPzsjZeIICILahpEN0s/hw1+wGFAfAkilU5\n8TSKpUCbSb81Kc0o0OFz+kGCx172IsB2sicrsgAqx+Y60oaSTiDyh12JAoGAQuo9\n3qIpzKNnl4z3OlYqTOACgy1LMzE7BJ2tLeAV6kKx2wYGVbGlpQI6kWgL6XvPSpjy\nJQf6GzY066bmFkPMuZ71wKCgKcOGDCT9xRSStQlNme+DYqKtsSwiciI/9OOG2Fr+\n41fejecYRC+7uutnGavfJ3AgjlMhUai2VZh/ZoECgYAei+i+HJJEhvWugf7Qu/Rb\n3Mc8lr9BvsCMeNRvuiR/SLwoiti97TrfHtWjq19JZxK1O/b/JjjB1d4DJYI5LZQx\n1Xm+szfccS0apccaQ0NAdwXe1wEiiooG+e0tzgbnzRn+5LDOrwsrWucEBLw7ZpJ4\n0D1bdkxQ4eZFsgXy2CHnew==\n-----END PRIVATE KEY-----\n",
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
