const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // System operations
    system: {
        getVersion: () => '1.0.0',
        platform: process.platform
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

    // Database operations (placeholder for now)
    database: {
        getLicenses: async () => {
            // Sample data for demo
            return [
                {
                    id: 1,
                    license_number: 'EV001-2024',
                    owner_name: 'John Smith',
                    vehicle_make: 'Tesla',
                    vehicle_model: 'Model 3',
                    vehicle_year: 2023,
                    status: 'Active',
                    expiry_date: '2025-01-15',
                    card_uid: null
                },
                {
                    id: 2,
                    license_number: 'EV002-2024',
                    owner_name: 'Sarah Johnson',
                    vehicle_make: 'Nissan',
                    vehicle_model: 'Leaf',
                    vehicle_year: 2022,
                    status: 'Active',
                    expiry_date: '2025-02-01',
                    card_uid: 'AB123456'
                }
            ];
        },
        searchLicenses: async (searchTerm) => {
            // Placeholder search functionality
            const licenses = await electronAPI.database.getLicenses();
            return licenses.filter(license => 
                license.license_number.includes(searchTerm) || 
                license.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
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