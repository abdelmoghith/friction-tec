const { spawn } = require('child_process');

// Set development environment
process.env.NODE_ENV = 'development';

// Resolve the Electron binary path (points to electron.exe on Windows)
const electronBinary = require('electron');

// Start the main Electron process
const electronProcess = spawn(electronBinary, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
});

electronProcess.on('close', () => {
  process.exit();
});