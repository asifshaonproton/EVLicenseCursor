# 🔥 EV License Management System

A comprehensive cross-platform license management system with NFC support, featuring both desktop and mobile applications.

## 📁 Project Structure

```
EVLicenseCursor/
├── EVLicenseDesktop/          # Desktop App V1 (Original)
│   ├── src/main/             # Main process files
│   ├── src/renderer/         # Renderer process files
│   └── package.json          # V1 dependencies
├── EVLicenseDesktopV2/       # Desktop App V2 (Enhanced)
│   ├── src/main/             # Main process files (nfc-pcsc)
│   ├── src/renderer/         # Renderer process files
│   └── package.json          # V2 dependencies
├── EVLicenseApp/             # Android Mobile App
│   ├── app/src/main/         # Android source code
│   └── build.gradle          # Android build config
├── assets/                   # Shared assets
├── tasks/                    # Development tasks
└── package.json              # Workspace configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Android Studio (for mobile app)
- ACR122U NFC Reader (for desktop apps)

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install individually
npm install
cd EVLicenseDesktop && npm install
cd EVLicenseDesktopV2 && npm install
```

### Running Applications

#### Desktop V1 (Original - node-hid based)
```bash
npm run start:v1
# or
cd EVLicenseDesktop && npm start
```

#### Desktop V2 (Enhanced - nfc-pcsc based) ⭐ **Recommended**
```bash
npm run start:v2
# or
cd EVLicenseDesktopV2 && npm start
```

#### Development Mode
```bash
npm run dev:v1    # V1 development mode
npm run dev:v2    # V2 development mode
```

## 🔧 Key Features

### Desktop Applications
- **V1**: Original implementation using `node-hid`
- **V2**: Enhanced implementation using `nfc-pcsc` with better compatibility
- Cross-platform support (Windows, macOS, Linux)
- Real-time NFC card detection and management
- License data encryption and secure storage
- SQLite database for local data management

### Mobile Application (Android)
- Built-in NFC support
- External ACR122U reader support via USB OTG
- Material Design 3 UI
- Offline-first architecture
- Secure data storage

## 📋 Technology Stack

### Desktop V1
- **Electron.js**: Cross-platform desktop framework
- **node-hid**: USB HID device communication
- **SQLite**: Local database engine
- **Material Design**: UI/UX inspiration

### Desktop V2 ⭐ **Enhanced**
- **Electron.js**: Cross-platform desktop framework
- **nfc-pcsc**: PC/SC NFC reader communication (industry standard)
- **ndef**: Proper NDEF message handling
- **SQLite**: Local database engine
- **Material Design**: UI/UX inspiration

### Mobile
- **Android**: Native Android development
- **Kotlin**: Programming language
- **Material Design 3**: Modern UI components
- **Room Database**: Local data persistence

## 🔄 Migration from V1 to V2

The V2 desktop application includes several improvements:

1. **Industry Standard NFC**: Uses PC/SC protocol instead of direct USB HID
2. **Better Compatibility**: Works with more NFC readers and systems
3. **Enhanced NDEF Support**: Proper text record handling with TLV format
4. **Multi-Reader Support**: Can handle multiple NFC readers simultaneously
5. **Improved Error Handling**: More robust error detection and recovery

## 🛠️ Development

### Building Applications

```bash
# Build V1
npm run build:v1

# Build V2
npm run build:v2

# Build both
npm run build:v1 && npm run build:v2
```

### Rebuilding Native Modules

```bash
# Rebuild V1
npm run rebuild:v1

# Rebuild V2
npm run rebuild:v2
```

### Cleaning

```bash
# Clean all node_modules
npm run clean
```

## 📱 NFC Reader Setup

### Desktop Applications
1. Connect ACR122U reader via USB
2. Install PC/SC drivers from [ACS website](https://www.acs.com.hk/en/products/3/acr122u-usb-nfc-reader/#tab_download)
3. Restart the application
4. The reader should be automatically detected

### Mobile Application
1. Enable NFC in device settings
2. For external readers, connect via USB OTG
3. Grant necessary permissions when prompted

## 🔐 Security Features

- License data encryption
- Secure NFC communication
- Local data storage
- Permission-based access control

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Talukdar & Son's, Software Eng. Asif Hossain**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the documentation in each application folder
- Review the migration guide in `NFC_PCSC_MIGRATION_SUMMARY.md`
- Open an issue on GitHub

---

**Note**: V2 is the recommended version for new deployments due to its enhanced NFC support and better compatibility.
