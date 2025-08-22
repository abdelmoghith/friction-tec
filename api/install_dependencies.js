const { exec } = require('child_process');
const path = require('path');

console.log('Installing new dependencies for staff management...');

// Change to api directory and install dependencies
const apiDir = __dirname;
const command = 'npm install bcrypt@^5.1.1 jsonwebtoken@^9.0.2';

exec(command, { cwd: apiDir }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error installing dependencies:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️ Warning:', stderr);
  }
  
  console.log('✅ Dependencies installed successfully!');
  console.log(stdout);
  
  console.log('\nNext steps:');
  console.log('1. Run: node run_staff_migration.js');
  console.log('2. Restart your API server');
  console.log('3. The staff management system will be ready to use!');
});