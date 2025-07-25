const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');

// Import our custom modules
const DatabaseManager = require('./database-manager');
const NFCPCSCManager = require('./nfc-pcsc-manager');

class EVLicenseDesktop {
    constructor() {
        this.mainWindow = null;
        this.databaseManager = null;
        this.nfcManager = null;
        this.isDev = process.argv.includes('--dev');
        this.initializeApp();
    }

    initializeApp() {
        app.whenReady().then(async () => {
            this.createWindow();
            await this.initializeServices();
            this.setupIpcHandlers();
            this.createApplicationMenu();
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                app.quit();
            }
        });

        app.on('before-quit', () => {
            this.cleanup();
        });
    }

    async initializeServices() {
        try {
            // Initialize database
            this.databaseManager = new DatabaseManager();
            await this.databaseManager.initialize();
            
            // Initialize enhanced NFC manager
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
        
        this.nfcManager.on('readers-refreshed', (status) => {
            console.log('🔄 NFC readers refreshed');
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-readers-refreshed', status);
            }
        });
        
        // Error events
        this.nfcManager.on('error', (error) => {
            console.error('❌ NFC-PCSC error:', error);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-error', error);
            }
        });
        
        this.nfcManager.on('reader-error', (error) => {
            console.error('❌ NFC reader error:', error);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-reader-error', error);
            }
        });
        
        // Card write events
        this.nfcManager.on('card-written', (result) => {
            console.log('✅ Card written successfully:', result);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-card-written', result);
            }
        });
        
        this.nfcManager.on('card-write-error', (error) => {
            console.error('❌ Card write error:', error);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('nfc-card-write-error', error);
            }
        });
        
        console.log('✅ Enhanced NFC event handlers set up successfully');
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

        ipcMain.handle('db-get-dashboard-stats', async () => {
            try {
                return await this.databaseManager.getDashboardStats();
            } catch (error) {
                console.error('Error getting dashboard stats:', error);
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

        // Authentication operations
        ipcMain.handle('auth-login', async (event, username, password) => {
            try {
                return await this.databaseManager.authenticateUser(username, password);
            } catch (error) {
                console.error('Error during login:', error);
                throw error;
            }
        });

        ipcMain.handle('auth-validate-session', async (event, sessionToken) => {
            try {
                return await this.databaseManager.validateSession(sessionToken);
            } catch (error) {
                console.error('Error validating session:', error);
                throw error;
            }
        });

        ipcMain.handle('auth-logout', async (event, sessionToken) => {
            try {
                return await this.databaseManager.logout(sessionToken);
            } catch (error) {
                console.error('Error during logout:', error);
                throw error;
            }
        });

        ipcMain.handle('auth-change-password', async (event, userId, oldPassword, newPassword) => {
            try {
                return await this.databaseManager.changePassword(userId, oldPassword, newPassword);
            } catch (error) {
                console.error('Error changing password:', error);
                throw error;
            }
        });

        // User management operations
        ipcMain.handle('users-get-all', async () => {
            try {
                return await this.databaseManager.getAllUsers();
            } catch (error) {
                console.error('Error getting users:', error);
                throw error;
            }
        });

        ipcMain.handle('users-create', async (event, userData, createdBy) => {
            try {
                return await this.databaseManager.createUser(userData, createdBy);
            } catch (error) {
                console.error('Error creating user:', error);
                throw error;
            }
        });

        ipcMain.handle('users-update', async (event, userId, userData, updatedBy) => {
            try {
                return await this.databaseManager.updateUser(userId, userData, updatedBy);
            } catch (error) {
                console.error('Error updating user:', error);
                throw error;
            }
        });

        ipcMain.handle('users-delete', async (event, userId, deletedBy) => {
            try {
                return await this.databaseManager.deleteUser(userId, deletedBy);
            } catch (error) {
                console.error('Error deleting user:', error);
                throw error;
            }
        });

        // Role management operations
        ipcMain.handle('roles-get-all', async () => {
            try {
                return await this.databaseManager.getAllRoles();
            } catch (error) {
                console.error('Error getting roles:', error);
                throw error;
            }
        });

        // Enhanced NFC operations
        ipcMain.handle('nfc-get-status', async () => {
            try {
                return this.nfcManager ? this.nfcManager.getStatus() : { connected: false, error: 'NFC Manager not initialized' };
            } catch (error) {
                console.error('Error getting NFC status:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-start-polling', async () => {
            try {
                if (this.nfcManager) {
                    await this.nfcManager.startPolling();
                    return { success: true };
                } else {
                    throw new Error('NFC Manager not initialized');
                }
            } catch (error) {
                console.error('Error starting NFC polling:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-stop-polling', async () => {
            try {
                if (this.nfcManager) {
                    this.nfcManager.stopPolling();
                    return { success: true };
                } else {
                    throw new Error('NFC Manager not initialized');
                }
            } catch (error) {
                console.error('Error stopping NFC polling:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-read-card', async () => {
            try {
                if (this.nfcManager) {
                    return await this.nfcManager.readCard();
                } else {
                    throw new Error('NFC Manager not initialized');
                }
            } catch (error) {
                console.error('Error reading NFC card:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-write-card', async (event, data) => {
            try {
                if (this.nfcManager) {
                    return await this.nfcManager.writeCard(data);
                } else {
                    throw new Error('NFC Manager not initialized');
                }
            } catch (error) {
                console.error('Error writing to NFC card:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-refresh-devices', async () => {
            try {
                if (this.nfcManager) {
                    const status = await this.nfcManager.refreshReaders();
                    return status;
                } else {
                    throw new Error('NFC Manager not initialized');
                }
            } catch (error) {
                console.error('Error refreshing NFC readers:', error);
                throw error;
            }
        });

        ipcMain.handle('nfc-get-detailed-readers', async () => {
            try {
                if (this.nfcManager) {
                    return this.nfcManager.getDetailedReaderInfo();
                } else {
                    throw new Error('NFC Manager not initialized');
                }
            } catch (error) {
                console.error('Error getting detailed reader info:', error);
                throw error;
            }
        });

        // Window management
        ipcMain.handle('window-open-main-app', async () => {
            try {
                this.createMainWindow();
                return { success: true };
            } catch (error) {
                console.error('Error opening main app:', error);
                throw error;
            }
        });
    }

    createWindow() {
        // Create login window first
        this.createLoginWindow();
    }

    createLoginWindow() {
        this.loginWindow = new BrowserWindow({
            width: 500,
            height: 700,
            resizable: false,
            frame: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: 'EV License Desktop - Login',
            show: false,
            center: true,
            titleBarStyle: 'default'
        });

        const loginUrl = this.isDev 
            ? 'http://localhost:3000/login.html' 
            : `file://${path.join(__dirname, '../renderer/login.html')}`;
        
        this.loginWindow.loadURL(loginUrl);

        this.loginWindow.once('ready-to-show', () => {
            this.loginWindow.show();
            if (this.isDev) {
                this.loginWindow.webContents.openDevTools();
            }
        });

        this.loginWindow.on('closed', () => {
            // If login window is closed, quit the app
            if (!this.mainWindow) {
                app.quit();
            }
            this.loginWindow = null;
        });
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: 'EV License Desktop',
            show: false
        });

        const startUrl = this.isDev 
            ? 'http://localhost:3000' 
            : `file://${path.join(__dirname, '../renderer/index.html')}`;
        
        this.mainWindow.loadURL(startUrl);

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
            
            // Close login window
            if (this.loginWindow) {
                this.loginWindow.close();
                this.loginWindow = null;
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
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
                        click: () => this.sendToRenderer('menu-new-license')
                    },
                    { type: 'separator' },
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'NFC',
                submenu: [
                    {
                        label: 'Read Card',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => this.sendToRenderer('menu-read-card')
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: () => this.sendToRenderer('menu-about')
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

    showErrorDialog(title, message) {
        if (this.mainWindow) {
            dialog.showErrorBox(title, message);
        }
    }

    cleanup() {
        try {
            console.log('🧹 Cleaning up application...');
            
            if (this.nfcManager) {
                this.nfcManager.cleanup();
                this.nfcManager = null;
            }
            
            if (this.databaseManager) {
                this.databaseManager.cleanup();
                this.databaseManager = null;
            }
            
            console.log('✅ Application cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// Initialize the application
new EVLicenseDesktop();