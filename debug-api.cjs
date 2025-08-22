const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Simulate the production environment
process.env.NODE_ENV = 'production';

console.log('=== API Debug Information ===');
console.log('Process resourcesPath:', process.resourcesPath);
console.log('__dirname:', __dirname);
console.log('app.isPackaged:', app?.isPackaged || 'N/A (app not available)');

const candidates = [
  // Typical electron-builder asar unpack path (most common)
  path.join(process.resourcesPath || '', 'app.asar.unpacked', 'api', 'app.js'),
  // Alternate resource path (some packaging setups)
  path.join(process.resourcesPath || '', 'api', 'app.js'),
  // Fallback relative to this file (useful when running unpacked folder)
  path.join(__dirname, 'api', 'app.js'),
  // Another fallback for different packaging structures
  path.join(process.resourcesPath || '', 'app', 'api', 'app.js'),
  // From electron-dist
  path.join(__dirname, 'electron-dist', 'win-unpacked', 'resources', 'app.asar.unpacked', 'api', 'app.js'),
];

console.log('\n=== Checking API paths ===');
candidates.forEach((p, i) => {
  try {
    const exists = fs.existsSync(p);
    console.log(`${i + 1}. ${p}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    if (exists) {
      const apiDir = path.dirname(p);
      const nodeModulesPath = path.join(apiDir, 'node_modules');
      const packageJsonPath = path.join(apiDir, 'package.json');
      console.log(`   - API directory: ${apiDir}`);
      console.log(`   - node_modules exists: ${fs.existsSync(nodeModulesPath)}`);
      console.log(`   - package.json exists: ${fs.existsSync(packageJsonPath)}`);
      
      if (fs.existsSync(nodeModulesPath)) {
        const modules = fs.readdirSync(nodeModulesPath);
        console.log(`   - Available modules: ${modules.slice(0, 5).join(', ')}${modules.length > 5 ? '...' : ''}`);
      }
    }
  } catch (e) {
    console.log(`${i + 1}. ${p}: ERROR - ${e.message}`);
  }
});

console.log('\n=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('NODE_PATH:', process.env.NODE_PATH);

console.log('\n=== Debug complete ===');