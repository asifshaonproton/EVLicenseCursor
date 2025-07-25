const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // System operations
    system: {
        getVersion: async () => {
            return await ipcRenderer.invoke('app-get-version');
        },
        platform: process.platform,
        showMessageBox: async (options) => {
            return await ipcRenderer.invoke('app-show-message-box', options);
        }
    },

    // Menu event listeners
    menu: {
        onNewLicense: (callback) => {
            ipcRenderer.on('menu-new-license', callback);
        },
        onReadCard: (callback) => {
            ipcRenderer.on('menu-read-card', callback);
        },
        onAbout: (callback) => {
            ipcRenderer.on('menu-about', callback);
        }
    },

    // Database operations
    database: {
        getLicenses: async () => {
            return await ipcRenderer.invoke('db-get-licenses');
        },
        addLicense: async (licenseData) => {
            return await ipcRenderer.invoke('db-add-license', licenseData);
        },
        updateLicense: async (licenseData) => {
            return await ipcRenderer.invoke('db-update-license', licenseData);
        },
        deleteLicense: async (licenseId) => {
            return await ipcRenderer.invoke('db-delete-license', licenseId);
        },
        searchLicenses: async (searchTerm) => {
            return await ipcRenderer.invoke('db-search-licenses', searchTerm);
        },
        getDashboardStats: async () => {
            return await ipcRenderer.invoke('db-get-dashboard-stats');
        }
    },

    // NFC operations (placeholder for now)
    nfc: {
        getStatus: async () => {
            return {
                devicesFound: 0,
                activeDevice: null,
                isPolling: false
            };
        },
        onDeviceConnected: (callback) => {
            // Placeholder for NFC device events
        },
        onDeviceDisconnected: (callback) => {
            // Placeholder for NFC device events
        },
        onCardDetected: (callback) => {
            // Placeholder for card detection events
        },
        onError: (callback) => {
            // Placeholder for error events
        }
    }
});

// Additional security: Remove access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;