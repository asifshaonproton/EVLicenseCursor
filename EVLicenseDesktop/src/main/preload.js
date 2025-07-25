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
            },
            redirectToMainApp: async () => {
                return await ipcRenderer.invoke('window-open-main-app');
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

    // Authentication operations
    auth: {
        login: async (username, password) => {
            return await ipcRenderer.invoke('auth-login', username, password);
        },
        validateSession: async (sessionToken) => {
            return await ipcRenderer.invoke('auth-validate-session', sessionToken);
        },
        logout: async (sessionToken) => {
            return await ipcRenderer.invoke('auth-logout', sessionToken);
        },
        changePassword: async (userId, oldPassword, newPassword) => {
            return await ipcRenderer.invoke('auth-change-password', userId, oldPassword, newPassword);
        }
    },

    // User management operations
    users: {
        getAll: async () => {
            return await ipcRenderer.invoke('users-get-all');
        },
        create: async (userData, createdBy) => {
            return await ipcRenderer.invoke('users-create', userData, createdBy);
        },
        update: async (userId, userData, updatedBy) => {
            return await ipcRenderer.invoke('users-update', userId, userData, updatedBy);
        },
        delete: async (userId, deletedBy) => {
            return await ipcRenderer.invoke('users-delete', userId, deletedBy);
        }
    },

    // Role management operations
    roles: {
        getAll: async () => {
            return await ipcRenderer.invoke('roles-get-all');
        }
    },

    // NFC operations
    nfc: {
        getStatus: async () => {
            return await ipcRenderer.invoke('nfc-get-status');
        },
        startPolling: async () => {
            return await ipcRenderer.invoke('nfc-start-polling');
        },
        stopPolling: async () => {
            return await ipcRenderer.invoke('nfc-stop-polling');
        },
        readCard: async () => {
            return await ipcRenderer.invoke('nfc-read-card');
        },
        writeCard: async (data) => {
            return await ipcRenderer.invoke('nfc-write-card', data);
        },
        // Event listeners
        onDeviceConnected: (callback) => {
            ipcRenderer.on('nfc-device-connected', (event, data) => callback(data));
        },
        onDeviceDisconnected: (callback) => {
            ipcRenderer.on('nfc-device-disconnected', (event, data) => callback(data));
        },
        onCardDetected: (callback) => {
            ipcRenderer.on('nfc-card-detected', (event, data) => callback(data));
        },
        onCardRemoved: (callback) => {
            ipcRenderer.on('nfc-card-removed', (event, data) => callback(data));
        },
        onError: (callback) => {
            ipcRenderer.on('nfc-error', (event, data) => callback(data));
        }
    }
});

// Additional security: Remove access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;