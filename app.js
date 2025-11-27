/**
 * app.js - cPanel/Passenger Entry Point
 * 
 * This is the entry point for Phusion Passenger on cPanel.
 * Passenger expects this file to export an Express app.
 */

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

// Create a basic app for error handling
const errorApp = express();

// Startup logging
console.log('========================================');
console.log('MediaCore API - Passenger Startup');
console.log('========================================');
console.log('Node version:', process.version);
console.log('Directory:', __dirname);
console.log('Time:', new Date().toISOString());

// Check for required files
const configDir = path.join(__dirname, 'config');
const serviceKeyPath = path.join(configDir, 'serviceAccountKey.json');

console.log('Config directory:', configDir);
console.log('Service key path:', serviceKeyPath);
console.log('Service key exists:', fs.existsSync(serviceKeyPath));

// List config directory contents
if (fs.existsSync(configDir)) {
  console.log('Config files:', fs.readdirSync(configDir));
} else {
  console.log('ERROR: Config directory does not exist!');
}

let app;
let startupError = null;

try {
  // Attempt to load the full application
  app = require('./server');
  console.log('✅ Application loaded successfully');
} catch (error) {
  startupError = error;
  console.error('❌ Failed to load application:');
  console.error('   Error:', error.message);
  console.error('   Stack:', error.stack);
  
  // Create error response app
  app = errorApp;
  
  app.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'Application Startup Failed',
      message: error.message,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  });
}

// Export for Passenger
module.exports = app;
