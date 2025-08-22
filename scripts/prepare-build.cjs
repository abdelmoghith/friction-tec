const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Preparing build - installing API dependencies...');

// Read API package.json
const apiPackagePath = path.join(__dirname, '..', 'api', 'package.json');
const apiPackage = JSON.parse(fs.readFileSync(apiPackagePath, 'utf8'));

// Read main package.json
const mainPackagePath = path.join(__dirname, '..', 'package.json');
const mainPackage = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));

// Merge API dependencies into main package dependencies
const apiDeps = apiPackage.dependencies || {};
let updated = false;

for (const [dep, version] of Object.entries(apiDeps)) {
    if (!mainPackage.dependencies[dep]) {
        console.log(`Adding API dependency: ${dep}@${version}`);
        mainPackage.dependencies[dep] = version;
        updated = true;
    } else if (mainPackage.dependencies[dep] !== version) {
        console.log(`Updating dependency version: ${dep} from ${mainPackage.dependencies[dep]} to ${version}`);
        mainPackage.dependencies[dep] = version;
        updated = true;
    }
}

if (updated) {
    // Write updated package.json
    fs.writeFileSync(mainPackagePath, JSON.stringify(mainPackage, null, 2));
    console.log('Updated main package.json with API dependencies');

    // Install dependencies
    console.log('Installing updated dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} else {
    console.log('No dependency updates needed');
}

console.log('Build preparation complete');