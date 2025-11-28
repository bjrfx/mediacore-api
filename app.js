/**
 * app.js - cPanel/Passenger Entry Point
 */

'use strict';

console.log('========================================');
console.log('MediaCore API Starting...');
console.log('Node:', process.version);
console.log('Time:', new Date().toISOString());
console.log('========================================');

let app;

try {
  app = require('./server');
  console.log('✅ Application loaded successfully');
  
  // For Passenger - we MUST call listen()
  // CloudLinux Passenger requires listening on 'passenger'
  if (typeof(PhusionPassenger) !== 'undefined') {
    PhusionPassenger.configure({ autoInstall: false });
    
    // Listen on 'passenger' - this is the key for CloudLinux cPanel!
    app.listen('passenger', () => {
      console.log('🚀 Server listening via Passenger');
    });
  } else {
    // Local development - use regular port
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log('🚀 Server listening on port', PORT);
    });
  }
  
} catch (error) {
  console.error('❌ Failed to load:', error.message);
  console.error(error.stack);
  
  const express = require('express');
  app = express();
  
  app.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'Startup Failed',
      message: error.message
    });
  });
  
  // Still need to listen even for error app
  if (typeof(PhusionPassenger) !== 'undefined') {
    app.listen('passenger');
  } else {
    app.listen(process.env.PORT || 3000);
  }
}

module.exports = app;
