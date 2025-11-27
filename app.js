/**
 * app.js - cPanel/Passenger Entry Point
 * 
 * This file is required for cPanel's Phusion Passenger to work properly.
 */

// Wrap in try-catch to capture startup errors
try {
  // Load the main application
  const app = require('./server');
  
  // Export for Passenger
  module.exports = app;
} catch (error) {
  console.error('❌ Application failed to start:', error.message);
  console.error(error.stack);
  
  // Create a minimal error app so Passenger doesn't crash completely
  const express = require('express');
  const errorApp = express();
  
  errorApp.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'Application Startup Error',
      message: error.message,
      hint: 'Check the Passenger log file for details'
    });
  });
  
  module.exports = errorApp;
}
