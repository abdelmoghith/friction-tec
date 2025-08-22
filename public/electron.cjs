// public/electron.cjs
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

// Detect dev mode based on packaging status
const isDev = !app.isPackaged;

// Keep a global reference of the window object and API process
let mainWindow;
let apiProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      zoomFactor: 0.9,
    },
    icon: path.join(process.resourcesPath || __dirname, 'favicon.ico'),
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:8080'
    : pathToFileURL(path.join(__dirname, '../dist/index.html')).toString();

  console.log('Loading URL:', startUrl);
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(0.9);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setTitle('whary');
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startApiServer() {
  if (isDev) {
    console.log('Dev mode; skipping embedded API spawn.');
    return Promise.resolve();
  }

  console.log('Starting API server in production mode...');
  console.log('Process resourcesPath:', process.resourcesPath);
  console.log('__dirname:', __dirname);
  console.log('app.getAppPath():', app.getAppPath());

  const candidates = [
    // Typical electron-builder asar unpack path (most common)
    path.join(process.resourcesPath, 'app.asar.unpacked', 'api', 'app.js'),
    // Alternate resource path (some packaging setups)
    path.join(process.resourcesPath, 'api', 'app.js'),
    // Fallback relative to this file (useful when running unpacked folder)
    path.join(__dirname, '..', 'api', 'app.js'),
    // Another fallback for different packaging structures
    path.join(process.resourcesPath, 'app', 'api', 'app.js'),
    // Try app path
    path.join(app.getAppPath(), 'api', 'app.js'),
    // Try from resources/app.asar.unpacked
    path.join(process.resourcesPath, 'app.asar.unpacked', 'api', 'app.js'),
  ];

  console.log('Checking API paths:', candidates);

  const apiPath = candidates.find((p) => {
    try {
      const exists = fs.existsSync(p);
      console.log(`Path ${p}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      return exists;
    } catch (e) {
      console.log(`Path ${p}: ERROR - ${e.message}`);
      return false;
    }
  });

  if (!apiPath) {
    console.error('Could not locate API entry file. Tried paths:', candidates);
    console.error('Continuing without backend server...');
    return Promise.resolve(); // continue without backend to avoid hard crash
  }

  console.log('Found API server at:', apiPath);
  
  // Also check if node_modules exists for the API
  const apiDir = path.dirname(apiPath);
  const apiNodeModules = path.join(apiDir, 'node_modules');
  console.log('API directory:', apiDir);
  console.log('API node_modules exists:', fs.existsSync(apiNodeModules));

  // Create a log file to capture API output when packaged
  const logPath = path.join(app.getPath('userData'), 'api.log');
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  } catch (e) {
    console.error('Failed to create log directory:', e);
  }
  
  let logStream;
  try {
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write(`\n=== API Server Start - ${new Date().toISOString()} ===\n`);
  } catch (e) {
    console.error('Failed to create log stream:', e);
  }

  // Use Node.js to run the API server
  const nodeExecutable = process.platform === 'win32' ? 'node.exe' : 'node';
  
  console.log('Spawning API server process...');
  console.log('Working directory:', apiDir);
  console.log('Node executable:', nodeExecutable);
  console.log('API script path:', apiPath);
  
  // Find the correct node_modules path
  const possibleNodeModulesPaths = [
    path.join(apiDir, 'node_modules'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'),
    path.join(process.resourcesPath, 'node_modules'),
    path.join(path.dirname(process.resourcesPath), 'node_modules'),
  ];
  
  const nodeModulesPath = possibleNodeModulesPaths.find(p => fs.existsSync(p));
  console.log('Using node_modules path:', nodeModulesPath);
  
  apiProcess = spawn(nodeExecutable, [apiPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: apiDir,
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'production',
      NODE_PATH: nodeModulesPath || path.join(apiDir, 'node_modules'),
    },
  });

  console.log('API process spawned with PID:', apiProcess.pid);

  // Pipe logs to file and console
  if (apiProcess.stdout) {
    apiProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (logStream) logStream.write(msg);
      console.log('[API STDOUT]', msg.trim());
    });
  }
  
  if (apiProcess.stderr) {
    apiProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      if (logStream) logStream.write(msg);
      console.error('[API STDERR]', msg.trim());
    });
  }

  apiProcess.on('error', (err) => {
    console.error('Failed to start API server:', err);
    if (logStream) {
      logStream.write(`ERROR: ${err.message}\n`);
      logStream.end();
    }
  });

  apiProcess.on('exit', (code, signal) => {
    console.error(`API server exited (code=${code}, signal=${signal})`);
    if (logStream) {
      logStream.write(`API server exited with code ${code}, signal ${signal}\n`);
      logStream.end();
    }
  });

  // Wait for the API server to be ready
  return waitForApiReady(30000);
}

function waitForApiReady(timeoutMs) {
  const start = Date.now();
  console.log('Waiting for API server to be ready...');
  
  return new Promise((resolve, reject) => {
    const hosts = ['127.0.0.1', 'localhost'];
    const paths = ['/api/health', '/', '/fournisseurs']; // Added more endpoints to test
    let attemptCount = 0;

    const attempt = () => {
      attemptCount++;
      const elapsed = Date.now() - start;
      console.log(`API readiness check attempt ${attemptCount} (${elapsed}ms elapsed)`);
      
      let resolved = false;
      let requestsCompleted = 0;
      const totalRequests = hosts.length * paths.length;

      for (const host of hosts) {
        for (const p of paths) {
          const req = http.get({ 
            host, 
            port: 3001, 
            path: p,
            timeout: 2000 
          }, (res) => {
            requestsCompleted++;
            console.log(`API responded: ${host}:3001${p} - Status: ${res.statusCode}`);
            if (!resolved) {
              resolved = true;
              console.log('API server is ready!');
              res.resume();
              resolve();
            } else {
              res.resume();
            }
          });
          
          req.on('error', (err) => {
            requestsCompleted++;
            console.log(`API request failed: ${host}:3001${p} - ${err.message}`);
            
            if (requestsCompleted === totalRequests && !resolved) {
              if (elapsed > timeoutMs) {
                console.error('API server timeout reached');
                return reject(new Error(`API server did not become ready in ${timeoutMs}ms`));
              }
              setTimeout(attempt, 1000); // Increased retry interval
            }
          });
          
          req.on('timeout', () => {
            req.destroy();
            console.log(`API request timeout: ${host}:3001${p}`);
          });
        }
      }
    };
    
    attempt();
  });
}

// App lifecycle
app.whenReady().then(() => {
  startApiServer()
    .catch((e) => {
      console.warn('Continuing without waiting for API readiness:', e.message);
    })
    .finally(() => {
      createWindow();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function stopApiServer() {
  if (apiProcess && !apiProcess.killed) {
    try {
      apiProcess.kill(); // On Windows this terminates the child
    } catch (e) {
      console.warn('Error killing API process:', e);
    }
  }
}

app.on('before-quit', stopApiServer);
app.on('window-all-closed', () => {
  stopApiServer();
  if (process.platform !== 'darwin') app.quit();
});