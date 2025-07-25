# EV License Desktop

A cross-platform desktop application for Electric Vehicle License Management with ACR122U NFC Reader support, built with Electron.js.

## 🚀 Features

### 📱 **Dual NFC Support**
- **Built-in NFC**: Compatible with any desktop NFC reader
- **ACR122U Support**: Specialized support for ACR122U NFC reader via USB
- **Real-time Card Detection**: Automatic polling and card detection
- **Card-License Association**: Link NFC cards to vehicle licenses
- **Data Writing**: Write license information to NFC cards

### 📊 **License Management**
- **Complete CRUD Operations**: Create, read, update, and delete licenses
- **Advanced Search**: Search by license number, owner, vehicle details
- **Bulk Operations**: Import/export license data
- **Status Tracking**: Active, expired, and pending license states
- **Expiry Notifications**: Automatic tracking of license expiration dates

### 🎨 **Modern Interface**
- **Material Design 3**: Clean and intuitive user interface
- **Dark/Light Themes**: User preference support
- **Responsive Layout**: Adapts to different screen sizes
- **Real-time Updates**: Live status updates and notifications
- **Multi-language Support**: Internationalization ready

### 🔐 **Security & Data**
- **Local SQLite Database**: Secure local data storage
- **Data Encryption**: Sensitive information protection
- **Audit Logging**: Track all license operations
- **Backup/Restore**: Data backup and recovery features
- **Role-based Access**: User permission management

### 🖥️ **Cross-Platform**
- **Windows**: Native Windows application (.exe)
- **macOS**: Native macOS application (.dmg)
- **Linux**: AppImage distribution
- **Auto-updates**: Seamless application updates

## 📋 Prerequisites

### Hardware Requirements
- **ACR122U NFC Reader**: USB-connected NFC reader
- **USB Port**: Available USB port for reader connection
- **RAM**: Minimum 4GB recommended
- **Storage**: 500MB free space

### Software Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For development and updates

## 🛠️ Installation

### Option 1: Download Pre-built Application
1. Visit the [Releases](../../releases) page
2. Download the appropriate version for your operating system:
   - **Windows**: `EV-License-Desktop-Setup-1.0.0.exe`
   - **macOS**: `EV-License-Desktop-1.0.0.dmg`
   - **Linux**: `EV-License-Desktop-1.0.0.AppImage`
3. Install and run the application

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/asifshaonproton/EVLicenseCursor.git
cd EVLicenseCursor/EVLicenseDesktop

# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build
```

## 🔧 Development Setup

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. ACR122U Setup
1. Connect the ACR122U NFC Reader to a USB port
2. The application will automatically detect the reader
3. Grant USB permissions when prompted
4. Test card detection with a compatible NFC card

### 3. Build Commands
```bash
# Development mode
npm run dev

# Production build (all platforms)
npm run build

# Platform-specific builds
npm run build-win     # Windows
npm run build-mac     # macOS
npm run build-linux   # Linux
```

## 📱 Usage

### First Launch
1. **Connect ACR122U**: Plug in your ACR122U NFC reader
2. **Grant Permissions**: Allow USB device access
3. **Create Account**: Set up administrative access
4. **Test NFC**: Verify card detection functionality

### License Management
1. **Add License**: Create new vehicle licenses
2. **Link NFC Card**: Associate physical cards with digital licenses
3. **Search/Filter**: Find licenses quickly
4. **Status Updates**: Track license validity and renewals

### NFC Operations
1. **Card Detection**: Place card near reader
2. **Read License**: View license information from card
3. **Write License**: Program new cards with license data
4. **Update Cards**: Modify existing card information

## 🏗️ Architecture

### Main Process (`src/main/`)
- **main.js**: Application entry point and window management
- **acr122u-manager.js**: NFC reader communication
- **database-manager.js**: SQLite database operations
- **ipc-handlers.js**: Inter-process communication

### Renderer Process (`src/renderer/`)
- **index.html**: Main application interface
- **app.js**: Frontend application logic
- **styles.css**: User interface styling
- **components/**: Reusable UI components

### Shared (`src/shared/`)
- **constants.js**: Application constants
- **utils.js**: Utility functions
- **types.js**: Type definitions

## 🔌 NFC Reader Support

### ACR122U Configuration
```javascript
// Reader specifications
Vendor ID: 0x072F
Product ID: 0x2200
Interface: USB HID
Protocols: ISO14443 Type A/B, MIFARE, FeliCa
```

### Supported Card Types
- **MIFARE Classic**: 1K, 4K variants
- **MIFARE Ultralight**: Standard and C variants
- **NTAG**: 213, 215, 216 series
- **DESFire**: EV1, EV2 versions
- **ISO14443**: Type A and B cards

## 📊 Database Schema

### Licenses Table
```sql
CREATE TABLE licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    nfc_card_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Activity Log Table
```sql
CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    user_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses (id)
);
```

## 🚀 Deployment

### Building Executables
```bash
# Install build dependencies
npm install

# Build for all platforms
npm run build

# Outputs will be in dist/ directory
```

### Distribution
- **Windows**: NSIS installer (.exe)
- **macOS**: DMG package (.dmg)
- **Linux**: AppImage (.AppImage)

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

### Code Standards
- **ESLint**: Follow configured linting rules
- **Prettier**: Use for code formatting
- **Testing**: Write tests for new features
- **Documentation**: Update README and code comments

## 📝 API Reference

### IPC Communications
```javascript
// License operations
ipcRenderer.invoke('db-get-licenses')
ipcRenderer.invoke('db-add-license', licenseData)
ipcRenderer.invoke('db-update-license', licenseId, updates)
ipcRenderer.invoke('db-delete-license', licenseId)

// NFC operations
ipcRenderer.invoke('nfc-detect-card')
ipcRenderer.invoke('nfc-read-card', cardId)
ipcRenderer.invoke('nfc-write-card', cardId, data)
```

### Events
```javascript
// NFC events
ipcRenderer.on('nfc-card-detected', (event, cardData) => {})
ipcRenderer.on('nfc-device-connected', (event, deviceInfo) => {})
ipcRenderer.on('nfc-error', (event, error) => {})
```

## 🔍 Troubleshooting

### Common Issues

**ACR122U Not Detected**
- Verify USB connection
- Check device drivers
- Try different USB port
- Restart application

**Cards Not Reading**
- Clean the card surface
- Check card compatibility
- Verify reader distance
- Test with known working card

**Database Errors**
- Check file permissions
- Verify SQLite installation
- Clear application cache
- Restore from backup

### Debug Mode
```bash
# Enable debug logging
npm run dev -- --debug

# View detailed logs
tail -f ~/.evlicense/logs/app.log
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 👥 Support

- **Documentation**: [Wiki](../../wiki)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Email**: support@ektai.com

## 🙏 Acknowledgments

- **Electron.js**: Cross-platform desktop framework
- **node-hid**: USB HID device communication
- **SQLite**: Local database engine
- **Material Design**: UI/UX inspiration
- **ACR122U Community**: NFC development resources

---

**Built with ❤️ by Talukdar & Son's Software Engineering Team**