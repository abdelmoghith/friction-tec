# Whary Desktop App - Build Instructions

## Available Build Scripts

### Development
- `npm run electron:dev` - Run app in development mode with hot reload
- `npm run electron:dev-only` - Run electron with frontend only (no backend)

### Production Builds
- `npm run electron:installer` - Build both portable and NSIS installer
- `npm run electron:portable` - Build portable executable only
- `npm run electron:nsis` - Build NSIS installer only
- `npm run electron:dir` - Build unpacked directory (for testing)

## Output Files

After running the build commands, you'll find the following files in the `electron-dist` folder:

1. **Whary 0.0.0.exe** - Portable executable (no installation required)
2. **Whary Setup 0.0.0.exe** - NSIS installer with the following features:
   - Custom installation directory selection
   - Desktop shortcut creation
   - Start menu shortcuts
   - Proper uninstaller
   - Windows registry integration

## Installer Features

The NSIS installer includes:
- ✅ Custom installation directory
- ✅ Desktop shortcut creation
- ✅ Start menu integration
- ✅ Proper uninstaller
- ✅ Windows "Add/Remove Programs" integration
- ✅ Elevation handling for system-wide installation

## Build Requirements

- Node.js and npm installed
- All dependencies installed (`npm install`)
- Windows environment (for Windows builds)

## Troubleshooting

If the API server doesn't start after installation:

1. **Check the logs**: The app creates logs in `%APPDATA%\Whary\api.log`
2. **Dependencies**: The build process automatically merges API dependencies into the main package
3. **Node modules**: The installer includes all necessary Node.js modules in the unpacked resources

## Recent Fixes Applied

- ✅ Fixed API server startup in installed version
- ✅ Proper node_modules path resolution for packaged app
- ✅ Enhanced logging for debugging API issues
- ✅ Automatic dependency consolidation from API package.json

## Notes

- The app maintains the same functionality as your working .exe file
- Code signing is disabled for development builds
- The installer creates shortcuts and registry entries for proper Windows integration
- API server logs are saved to user data directory for debugging