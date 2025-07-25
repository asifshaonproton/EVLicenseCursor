# Release Guide for EV License Desktop

This document provides comprehensive instructions for building and releasing the EV License Desktop application for Windows, macOS, and Linux.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git for version control

### Install Dependencies
```bash
cd EVLicenseDesktop
npm install
```

### Development Build
```bash
npm run dev        # Run in development mode
npm start          # Run production build
```

### Local Distribution Builds
```bash
npm run dist           # Build for current platform
npm run dist-win       # Build for Windows
npm run dist-mac       # Build for macOS  
npm run dist-linux     # Build for Linux
```

## Release Process

### 1. Manual Release (Local Build)

#### Build for All Platforms
```bash
# Make sure you're in the EVLicenseDesktop directory
cd EVLicenseDesktop

# Install dependencies
npm ci

# Build for all platforms (requires proper setup)
npm run dist-win      # Windows .exe installer + portable
npm run dist-mac      # macOS .dmg + .zip
npm run dist-linux    # Linux .AppImage + .deb + .rpm
```

#### Output Files
All built files will be in the `dist/` directory:

**Windows:**
- `EV License Desktop Setup {version}.exe` - NSIS Installer
- `EV License Desktop {version}.exe` - Portable executable

**macOS:**
- `EV License Desktop-{version}.dmg` - Disk image installer
- `EV License Desktop-{version}-mac.zip` - ZIP archive

**Linux:**
- `EV License Desktop-{version}.AppImage` - Universal Linux package
- `EV License Desktop_{version}_amd64.deb` - Debian package
- `EV License Desktop-{version}.x86_64.rpm` - RPM package

### 2. Automated Release (GitHub Actions)

#### Setup GitHub Repository
1. Push your code to GitHub
2. Update the `publish` section in `package.json`:
   ```json
   "publish": {
     "provider": "github",
     "owner": "your-username",
     "repo": "your-repo-name"
   }
   ```

#### Create a Release
**Option A: Tag-based Release**
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

**Option B: Manual Trigger**
1. Go to GitHub Actions tab
2. Select "Release Electron App" workflow
3. Click "Run workflow"
4. Enter version (e.g., v1.0.0)

#### Automated Process
The GitHub Actions workflow will:
1. Create a GitHub release
2. Build for Windows, macOS, and Linux
3. Upload all installers to the release
4. Generate release notes

## Configuration Details

### Package.json Scripts
- `start` - Run the application
- `dev` - Run in development mode with DevTools
- `build` - Build using electron-builder
- `dist` - Create distribution packages
- `dist-win` - Windows-specific build
- `dist-mac` - macOS-specific build  
- `dist-linux` - Linux-specific build
- `release` - Build and publish to GitHub
- `pack` - Package without creating installers

### Electron Builder Configuration

The `build` section in `package.json` configures:

**Windows:**
- NSIS installer with custom options
- Portable executable
- Code signing ready (requires certificates)
- Both x64 and ia32 architectures

**macOS:**
- DMG and ZIP distributions
- Universal builds (Intel + Apple Silicon)
- Hardened runtime and entitlements
- Notarization ready (requires Apple Developer account)

**Linux:**
- AppImage (universal)
- Debian (.deb) packages
- RPM packages
- x64 architecture

### Icons and Assets

Replace placeholder files with actual icons:

1. **PNG Icon** (`build/icon.png`): 512x512 pixels
2. **Windows Icon** (`build/icon.ico`): Multi-size ICO file
3. **macOS Icon** (`build/icon.icns`): Apple icon format

#### Creating Icons
```bash
# For macOS (requires macOS)
mkdir icon.iconset
# Add all required sizes to icon.iconset/
iconutil -c icns icon.iconset

# For Windows (use online tools or software like IcoFX)
# Convert PNG to ICO with multiple sizes

# For Linux  
# Use the PNG directly (512x512 recommended)
```

## Code Signing and Notarization

### Windows Code Signing
1. Obtain a code signing certificate
2. Set environment variables:
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate_password"
   ```

### macOS Code Signing and Notarization
1. Join Apple Developer Program
2. Create certificates in Xcode or Developer Portal
3. Set environment variables:
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate_password"
   export APPLE_ID="your_apple_id"
   export APPLE_ID_PASSWORD="app_specific_password"
   export APPLE_TEAM_ID="your_team_id"
   ```

### GitHub Secrets (for CI/CD)
Set these secrets in your GitHub repository:
- `MAC_CERTIFICATE_P12` - Base64 encoded certificate
- `MAC_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_ID` - Apple ID email
- `APPLE_ID_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Apple Developer Team ID

## Troubleshooting

### Common Issues

**Build Fails on Native Dependencies:**
```bash
# Rebuild native modules
npm rebuild
# Or install with specific flags
npm install --build-from-source
```

**Permission Denied on Linux:**
```bash
# Make scripts executable
chmod +x node_modules/.bin/*
```

**macOS Gatekeeper Issues:**
```bash
# Allow unsigned apps (for testing)
sudo spctl --master-disable
```

**Windows Antivirus False Positives:**
- Submit builds to antivirus vendors for whitelisting
- Use extended validation (EV) code signing certificates

### Build Environment Setup

**Windows:**
- Install Visual Studio Build Tools
- Install Python 2.7 or 3.x
- Install Windows SDK

**macOS:**
- Install Xcode Command Line Tools
- Install certificates in Keychain

**Linux:**
- Install build-essential
- Install libgtk-3-dev and other dependencies

## Version Management

### Updating Version
```bash
# Update package.json version
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0  
npm version major   # 1.0.0 -> 2.0.0
```

### Release Checklist
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Test on all target platforms
- [ ] Verify icons and assets
- [ ] Check code signing certificates
- [ ] Update documentation
- [ ] Create release tag
- [ ] Monitor build process
- [ ] Test downloaded installers

## Advanced Configuration

### Custom NSIS Installer
Create `build/installer.nsh` for custom NSIS script modifications.

### Auto-Updates
Configure using electron-updater:
```json
"publish": {
  "provider": "github",
  "publishAutoUpdate": true
}
```

### Build Optimization
- Use `electronVersion` to pin Electron version
- Configure `compression` for smaller installers
- Use `buildDependenciesFromSource` for native modules

## Support

For issues with the release process:
1. Check electron-builder documentation
2. Review GitHub Actions logs
3. Verify platform-specific requirements
4. Test locally before CI/CD deployment