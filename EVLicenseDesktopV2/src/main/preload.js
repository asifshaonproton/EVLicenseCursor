const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Database operations
    database: {
        getLicenses: () => ipcRenderer.invoke('db-get-licenses'),
        addLicense: (licenseData) => ipcRenderer.invoke('db-add-license', licenseData),
        updateLicense: (licenseData) => ipcRenderer.invoke('db-update-license', licenseData),
        deleteLicense: (licenseId) => ipcRenderer.invoke('db-delete-license', licenseId),
        searchLicenses: (searchTerm) => ipcRenderer.invoke('db-search-licenses', searchTerm),
        associateCard: (cardId, licenseId) => ipcRenderer.invoke('nfc-associate-card', cardId, licenseId)
    },

    // NFC operations
    nfc: {
        getStatus: () => ipcRenderer.invoke('nfc-get-status'),
        readCard: () => ipcRenderer.invoke('nfc-read-card'),
        writeCard: (data) => ipcRenderer.invoke('nfc-write-card', data),
        
        // Event listeners for NFC events
        onDeviceConnected: (callback) => {
            ipcRenderer.on('nfc-device-connected', (event, data) => callback(data));
        },
        onDeviceDisconnected: (callback) => {
            ipcRenderer.on('nfc-device-disconnected', (event, data) => callback(data));
        },
        onCardDetected: (callback) => {
            ipcRenderer.on('nfc-card-detected', (event, data) => callback(data));
        },
        onError: (callback) => {
            ipcRenderer.on('nfc-error', (event, data) => callback(data));
        },
        
        // Remove event listeners
        removeListener: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        }
    },

    // System operations
    system: {
        getVersion: () => ipcRenderer.invoke('app-get-version'),
        showMessageBox: (options) => ipcRenderer.invoke('app-show-message-box', options),
        showSaveDialog: (options) => ipcRenderer.invoke('app-show-save-dialog', options),
        showOpenDialog: (options) => ipcRenderer.invoke('app-show-open-dialog', options)
    },

    // Menu event listeners
    menu: {
        onNewLicense: (callback) => {
            ipcRenderer.on('menu-new-license', callback);
        },
        onImport: (callback) => {
            ipcRenderer.on('menu-import', callback);
        },
        onExport: (callback) => {
            ipcRenderer.on('menu-export', callback);
        },
        onReadCard: (callback) => {
            ipcRenderer.on('menu-read-card', callback);
        },
        onWriteCard: (callback) => {
            ipcRenderer.on('menu-write-card', callback);
        },
        onAbout: (callback) => {
            ipcRenderer.on('menu-about', callback);
        },
        onDocumentation: (callback) => {
            ipcRenderer.on('menu-documentation', callback);
        },
        
        // Remove menu event listeners
        removeMenuListener: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        }
    },

    // Utility functions
    utils: {
        // Platform information
        platform: process.platform,
        
        // File system operations (secure)
        readFile: (filePath) => {
            // This would need to be implemented as an IPC call for security
            // For now, we'll use the dialog API
            return null;
        },
        
        // Logging
        log: (level, message, data = null) => {
            console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }
    }
});

// Additional security: Remove access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;