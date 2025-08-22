// Simple test script to verify API server can start
const { spawn } = require('child_process');
const http = require('http');

console.log('Testing API server startup...');

const apiProcess = spawn('node', ['api/app.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: '3001',
    NODE_ENV: 'production',
  },
});

apiProcess.stdout.on('data', (data) => {
  console.log('[API STDOUT]', data.toString().trim());
});

apiProcess.stderr.on('data', (data) => {
  console.error('[API STDERR]', data.toString().trim());
});

apiProcess.on('error', (err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});

apiProcess.on('exit', (code, signal) => {
  console.log(`API server exited (code=${code}, signal=${signal})`);
  process.exit(code || 0);
});

// Test API readiness after 3 seconds
setTimeout(() => {
  console.log('Testing API readiness...');
  const req = http.get('http://localhost:3001/api/health', (res) => {
    console.log(`API Health Check: Status ${res.statusCode}`);
    res.on('data', (data) => {
      console.log('Response:', data.toString());
    });
    res.on('end', () => {
      console.log('API server is working!');
      apiProcess.kill();
    });
  });
  
  req.on('error', (err) => {
    console.error('API Health Check failed:', err.message);
    apiProcess.kill();
  });
}, 3000);