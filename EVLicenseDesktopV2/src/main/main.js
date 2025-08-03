const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Import our custom modules
const NFCPCSCManager = require('./nfc-pcsc-manager');
const DatabaseManager = require('./database-manager');

class EVLicenseDesktop {
    constructor() {
        this.mainWindow = null;
        this.nfcManager = null;
        this.databaseManager = null;
        this.isDev = process.argv.includes('--dev');
        
        this.initializeApp();
    }

    initializeApp() {
        // Handle app ready
        app.whenReady().then(() => {
            this.createWindow();
            this.initializeServices();
            this.setupIpcHandlers();
            this.createApplicationMenu();
        });

        // Handle app activation (macOS)
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        // Handle window closed
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                app.quit();
            }
        });

        // Handle before quit
        app.on('before-quit', () => {
            this.cleanup();
        });
    }

    createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, '../../assets/icon.png'),
            title: 'EV License Desktop',
            show: false
        });

        // Load the app
        const startUrl = this.isDev 
            ? 'http://localhost:3000' 
            : `file://${path.join(__dirname, '../renderer/index.html')}`;
        
        this.mainWindow.loadURL(startUrl);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    async initializeServices() {
        try {
            // Initialize database
            this.databaseManager = new DatabaseManager();
            await this.databaseManager.initialize();
            
            // Initialize NFC-PCSC manager
            this.nfcManager = new NFCPCSCManager();
            await this.nfcManager.initialize();
            
            // Set up NFC event handlers
            this.setupNFCEventHandlers();

            console.log('✅ Services initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize services:', error);
            this.showErrorDialog('Initialization Error', 
                'Failed to initialize application services. Some features may not work correctly.');
        }
    }

    setupNFCEventHandlers() {
        if (!this.nfcManager) return;
        
        console.log('🔗 Setting up NFC-PCSC event handlers...');
        
        // Reader connection events
        this.nfcManager.on('reader-connected', (readerInfo) => {
            console.log('📱 NFC reader connected:', readerInfo.name);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-reader-connected', readerInfo);
            }
        });
        
        this.nfcManager.on('reader-disconnected', (info) => {
            console.log('📱 NFC reader disconnected:', info.name);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-reader-disconnected', info);
            }
        });
        
        // Card events
        this.nfcManager.on('card-detected', (cardData) => {
            console.log('💳 NFC card detected:', cardData.uid);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-card-detected', cardData);
            }
        });
        
        this.nfcManager.on('card-removed', (info) => {
            console.log('📤 NFC card removed');
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-card-removed', info);
            }
        });
        
        // Initialization and status events
        this.nfcManager.on('initialized', () => {
            console.log('✅ NFC-PCSC Manager initialized');
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-initialized');
            }
        });
        
        this.nfcManager.on('error', (error) => {
            console.error('🚨 NFC Error:', error);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-error', error);
            }
        });
    }

    setupIpcHandlers() {
        // Database operations
        ipcMain.handle('db-get-licenses', async () => {
            try {
                return await this.databaseManager.getAllLicenses();
            } catch (error) {
                console.error('Error getting licenses:', error);
                throw error;
            }
        });

        ipcMain.handle('db-add-license', async (event, licenseData) => {
            try {
                return await this.databaseManager.addLicense(licenseData);
            } catch (error) {
                console.error('Error adding license:', error);
                throw error;
            }
        });

        ipcMain.handle('db-update-license', async (event, licenseData) => {
            try {
                return await this.databaseManager.updateLicense(licenseData);
            } catch (error) {
                console.error('Error updating license:', error);
                throw error;
            }
        });

        ipcMain.handle('db-delete-license', async (event, licenseId) => {
            try {
                return await this.databaseManager.deleteLicense(licenseId);
            } catch (error) {
                console.error('Error deleting license:', error);
                throw error;
            }
        });

        ipcMain.handle('db-search-licenses', async (event, searchTerm) => {
            try {
                return await this.databaseManager.searchLicenses(searchTerm);
            } catch (error) {
                console.error('Error searching licenses:', error);
                throw error;
            }
        });

        // NFC operations
        ipcMain.handle('nfc-get-status', async () => {
            try {
                return await this.nfcManager.getStatus();
            } catch (error) {
                console.error('Error getting NFC status:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-read-card', async () => {
            try {
                return await this.nfcManager.readCard();
            } catch (error) {
                console.error('Error reading NFC card:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-write-card', async (event, data) => {
            try {
                return await this.nfcManager.writeCard(data);
            } catch (error) {
                console.error('Error writing NFC card:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-associate-card', async (event, cardId, licenseId) => {
            try {
                return await this.databaseManager.associateCardWithLicense(cardId, licenseId);
            } catch (error) {
                console.error('Error associating card with license:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-refresh-devices', async () => {
            try {
                return await this.nfcManager.refreshReaders();
            } catch (error) {
                console.error('Error refreshing NFC devices:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-test-card-reading', async () => {
            try {
                return await this.nfcManager.testCardReading();
            } catch (error) {
                console.error('Error starting NFC card reading test:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-stop-card-reading-test', async () => {
            try {
                return await this.nfcManager.stopCardReadingTest();
            } catch (error) {
                console.error('Error stopping NFC card reading test:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-write-test-license', async () => {
            try {
                return await this.nfcManager.writeTestLicenseToCard();
            } catch (error) {
                console.error('Error writing test license to card:', error);
                throw error;
            }
        });

        // System operations
        ipcMain.handle('app-get-version', () => {
            return app.getVersion();
        });

        ipcMain.handle('app-show-message-box', async (event, options) => {
            try {
                const result = await dialog.showMessageBox(this.mainWindow, options);
                return result;
            } catch (error) {
                console.error('Error showing message box:', error);
                throw error;
            }
        });

        ipcMain.handle('app-show-save-dialog', async (event, options) => {
            try {
                const result = await dialog.showSaveDialog(this.mainWindow, options);
                return result;
            } catch (error) {
                console.error('Error showing save dialog:', error);
                throw error;
            }
        });

        ipcMain.handle('app-show-open-dialog', async (event, options) => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, options);
                return result;
            } catch (error) {
                console.error('Error showing open dialog:', error);
                throw error;
            }
        });
    }

    createApplicationMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New License',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.sendToRenderer('menu-new-license');
                        }
                    },
                    {
                        label: 'Import',
                        accelerator: 'CmdOrCtrl+I',
                        click: () => {
                            this.sendToRenderer('menu-import');
                        }
                    },
                    {
                        label: 'Export',
                        accelerator: 'CmdOrCtrl+E',
                        click: () => {
                            this.sendToRenderer('menu-export');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' }
                ]
            },
            {
                label: 'NFC',
                submenu: [
                    {
                        label: 'Read Card',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => {
                            this.sendToRenderer('menu-read-card');
                        }
                    },
                    {
                        label: 'Write Card',
                        accelerator: 'CmdOrCtrl+W',
                        click: () => {
                            this.sendToRenderer('menu-write-card');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Refresh Readers',
                        click: () => {
                            this.nfcManager.refreshReaders();
                        }
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: () => {
                            this.sendToRenderer('menu-about');
                        }
                    },
                    {
                        label: 'Documentation',
                        click: () => {
                            this.sendToRenderer('menu-documentation');
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    sendToRenderer(channel, data) {
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.send(channel, data);
        }
    }

    showErrorDialog(title, content) {
        if (this.mainWindow) {
            dialog.showErrorBox(title, content);
        }
    }

    cleanup() {
        try {
            if (this.nfcManager) {
                this.nfcManager.cleanup();
            }
            if (this.databaseManager) {
                this.databaseManager.cleanup();
            }
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// Initialize the application
new EVLicenseDesktop();