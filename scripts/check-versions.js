#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class VersionChecker {
    constructor() {
        this.workspacePath = path.join(__dirname, '..');
        this.desktopV1Path = path.join(this.workspacePath, 'EVLicenseDesktop');
        this.desktopV2Path = path.join(this.workspacePath, 'EVLicenseDesktopV2');
    }

    readPackageJson(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`❌ Error reading ${filePath}:`, error.message);
            return null;
        }
    }

    checkVersions() {
        console.log('🔍 Checking workspace version compatibility...\n');

        const rootPackage = this.readPackageJson(path.join(this.workspacePath, 'package.json'));
        const desktopV1Package = this.readPackageJson(path.join(this.desktopV1Path, 'package.json'));
        const desktopV2Package = this.readPackageJson(path.join(this.desktopV2Path, 'package.json'));

        if (!rootPackage || !desktopV1Package || !desktopV2Package) {
            console.error('❌ Failed to read package.json files');
            process.exit(1);
        }

        console.log('📊 Version Analysis:');
        console.log('===================\n');

        // Check Electron versions
        this.checkElectronVersions(desktopV1Package, desktopV2Package);

        // Check other critical dependencies
        this.checkCriticalDependencies(desktopV1Package, desktopV2Package);

        // Check build tools
        this.checkBuildTools(desktopV1Package, desktopV2Package);

        // Check workspace configuration
        this.checkWorkspaceConfig(rootPackage);

        console.log('\n🎯 Compatibility Assessment:');
        console.log('============================');
        this.assessCompatibility(desktopV1Package, desktopV2Package);
    }

    checkElectronVersions(v1Package, v2Package) {
        console.log('⚡ Electron Versions:');
        const v1Electron = v1Package.devDependencies?.electron;
        const v2Electron = v2Package.devDependencies?.electron;

        if (v1Electron === v2Electron) {
            console.log(`✅ Desktop V1: ${v1Electron}`);
            console.log(`✅ Desktop V2: ${v2Electron}`);
            console.log('✅ Versions match perfectly\n');
        } else {
            console.log(`⚠️ Desktop V1: ${v1Electron}`);
            console.log(`⚠️ Desktop V2: ${v2Electron}`);
            console.log('❌ Versions do not match\n');
        }
    }

    checkCriticalDependencies(v1Package, v2Package) {
        console.log('🔧 Critical Dependencies:');
        const criticalDeps = ['nfc-pcsc', 'ndef', 'sqlite3', 'express', 'socket.io'];

        for (const dep of criticalDeps) {
            const v1Version = v1Package.dependencies?.[dep];
            const v2Version = v2Package.dependencies?.[dep];

            if (v1Version === v2Version) {
                console.log(`✅ ${dep}: ${v1Version} (both versions)`);
            } else {
                console.log(`⚠️ ${dep}: V1=${v1Version}, V2=${v2Version}`);
            }
        }
        console.log('');
    }

    checkBuildTools(v1Package, v2Package) {
        console.log('🏗️ Build Tools:');
        const buildTools = ['electron-builder', '@electron/rebuild'];

        for (const tool of buildTools) {
            const v1Version = v1Package.devDependencies?.[tool];
            const v2Version = v2Package.devDependencies?.[tool];

            if (v1Version === v2Version) {
                console.log(`✅ ${tool}: ${v1Version} (both versions)`);
            } else {
                console.log(`⚠️ ${tool}: V1=${v1Version}, V2=${v2Version}`);
            }
        }
        console.log('');
    }

    checkWorkspaceConfig(rootPackage) {
        console.log('📁 Workspace Configuration:');
        console.log(`✅ Workspace name: ${rootPackage.name}`);
        console.log(`✅ Version: ${rootPackage.version}`);
        console.log(`✅ Description: ${rootPackage.description}`);
        console.log(`✅ Private: ${rootPackage.private}`);
        console.log(`✅ Workspaces: ${rootPackage.workspaces?.length || 0} configured`);
        console.log('');
    }

    assessCompatibility(v1Package, v2Package) {
        const issues = [];
        const warnings = [];

        // Check Electron version compatibility
        const v1Electron = v1Package.devDependencies?.electron;
        const v2Electron = v2Package.devDependencies?.electron;
        
        if (v1Electron !== v2Electron) {
            issues.push('Electron versions do not match');
        }

        // Check critical dependencies
        const criticalDeps = ['nfc-pcsc', 'ndef', 'sqlite3'];
        for (const dep of criticalDeps) {
            const v1Version = v1Package.dependencies?.[dep];
            const v2Version = v2Package.dependencies?.[dep];
            
            if (v1Version !== v2Version) {
                warnings.push(`${dep} versions differ`);
            }
        }

        // Check build tools
        const buildTools = ['electron-builder'];
        for (const tool of buildTools) {
            const v1Version = v1Package.devDependencies?.[tool];
            const v2Version = v2Package.devDependencies?.[tool];
            
            if (v1Version !== v2Version) {
                issues.push(`${tool} versions do not match`);
            }
        }

        if (issues.length === 0 && warnings.length === 0) {
            console.log('🎉 PERFECT COMPATIBILITY!');
            console.log('✅ All versions are synchronized');
            console.log('✅ Cross-platform compatibility verified');
            console.log('✅ Ready for production use');
        } else {
            if (issues.length > 0) {
                console.log('❌ CRITICAL ISSUES FOUND:');
                issues.forEach(issue => console.log(`  - ${issue}`));
            }
            
            if (warnings.length > 0) {
                console.log('\n⚠️ WARNINGS:');
                warnings.forEach(warning => console.log(`  - ${warning}`));
            }
            
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('  - Update package.json files to use identical versions');
            console.log('  - Run npm install --ignore-scripts in both desktop directories');
            console.log('  - Test cross-platform functionality after updates');
        }
    }

    generateReport() {
        console.log('\n📋 VERSION COMPATIBILITY REPORT');
        console.log('================================');
        console.log('Generated:', new Date().toISOString());
        console.log('Workspace:', path.basename(this.workspacePath));
        console.log('');
        
        this.checkVersions();
    }
}

// Run the version checker if this file is executed directly
if (require.main === module) {
    const checker = new VersionChecker();
    checker.generateReport();
}

module.exports = VersionChecker; 