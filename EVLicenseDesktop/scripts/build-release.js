#!/usr/bin/env node

/**
 * Build Release Script for EV License Desktop
 * 
 * This script helps build release packages for different platforms
 * and provides useful utilities for the release process.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
    log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
    log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
    log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
    log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
    try {
        log(`${colors.cyan}Running: ${command}${colors.reset}`);
        const result = execSync(command, { 
            stdio: 'inherit',
            encoding: 'utf8',
            ...options 
        });
        return result;
    } catch (error) {
        logError(`Command failed: ${command}`);
        throw error;
    }
}

function checkPrerequisites() {
    logHeader('Checking Prerequisites');
    
    try {
        // Check Node.js version
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        log(`Node.js version: ${nodeVersion}`);
        
        // Check npm version
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`npm version: ${npmVersion}`);
        
        // Check if package.json exists
        if (!fs.existsSync('package.json')) {
            throw new Error('package.json not found. Are you in the EVLicenseDesktop directory?');
        }
        
        // Check if node_modules exists
        if (!fs.existsSync('node_modules')) {
            logWarning('node_modules not found. Installing dependencies...');
            execCommand('npm install');
        }
        
        logSuccess('All prerequisites met');
        return true;
    } catch (error) {
        logError(`Prerequisites check failed: ${error.message}`);
        return false;
    }
}

function cleanDist() {
    logHeader('Cleaning Distribution Directory');
    
    try {
        if (fs.existsSync('dist')) {
            log('Removing existing dist directory...');
            execCommand('rm -rf dist');
        }
        logSuccess('Distribution directory cleaned');
    } catch (error) {
        logError(`Failed to clean dist directory: ${error.message}`);
    }
}

function buildForPlatform(platform) {
    logHeader(`Building for ${platform.toUpperCase()}`);
    
    try {
        const command = `npm run dist-${platform}`;
        execCommand(command);
        logSuccess(`${platform} build completed`);
        return true;
    } catch (error) {
        logError(`${platform} build failed: ${error.message}`);
        return false;
    }
}

function listOutputFiles() {
    logHeader('Build Output Files');
    
    if (!fs.existsSync('dist')) {
        logWarning('No dist directory found');
        return;
    }
    
    try {
        const files = fs.readdirSync('dist');
        if (files.length === 0) {
            logWarning('No files found in dist directory');
            return;
        }
        
        log('Generated files:');
        files.forEach(file => {
            const filePath = path.join('dist', file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024 / 1024).toFixed(2);
            log(`  ${colors.green}${file}${colors.reset} (${size} MB)`);
        });
    } catch (error) {
        logError(`Failed to list output files: ${error.message}`);
    }
}

function showUsage() {
    log(`
${colors.bright}EV License Desktop Build Script${colors.reset}

Usage: node scripts/build-release.js [options]

Options:
  --platform <platform>   Build for specific platform (win, mac, linux)
  --all                   Build for all platforms
  --clean                 Clean dist directory before building
  --check                 Only check prerequisites
  --help                  Show this help message

Examples:
  node scripts/build-release.js --platform win
  node scripts/build-release.js --all --clean
  node scripts/build-release.js --check
`);
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        showUsage();
        return;
    }
    
    logHeader('EV License Desktop Release Builder');
    
    // Check prerequisites
    if (!checkPrerequisites()) {
        process.exit(1);
    }
    
    if (args.includes('--check')) {
        logSuccess('Prerequisites check completed');
        return;
    }
    
    // Clean if requested
    if (args.includes('--clean')) {
        cleanDist();
    }
    
    // Determine what to build
    const platformIndex = args.indexOf('--platform');
    const buildAll = args.includes('--all');
    
    if (platformIndex !== -1 && platformIndex + 1 < args.length) {
        const platform = args[platformIndex + 1];
        if (['win', 'mac', 'linux'].includes(platform)) {
            buildForPlatform(platform);
        } else {
            logError(`Invalid platform: ${platform}. Use win, mac, or linux.`);
            process.exit(1);
        }
    } else if (buildAll) {
        const platforms = ['win', 'mac', 'linux'];
        let successCount = 0;
        
        for (const platform of platforms) {
            if (buildForPlatform(platform)) {
                successCount++;
            }
        }
        
        logHeader('Build Summary');
        log(`Successfully built ${successCount}/${platforms.length} platforms`);
    } else {
        logWarning('No build target specified. Use --platform <platform> or --all');
        showUsage();
        return;
    }
    
    // List output files
    listOutputFiles();
    
    logHeader('Build Process Complete');
    logSuccess('All builds completed successfully!');
    log(`${colors.yellow}Next steps:${colors.reset}`);
    log('1. Test the built applications on target platforms');
    log('2. Check file signatures and code signing');
    log('3. Prepare release notes');
    log('4. Upload to distribution channels');
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Run the main function
if (require.main === module) {
    main();
}

module.exports = {
    checkPrerequisites,
    cleanDist,
    buildForPlatform,
    listOutputFiles
};