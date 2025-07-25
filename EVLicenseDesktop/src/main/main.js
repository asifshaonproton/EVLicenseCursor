const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');

// Import our custom modules
const DatabaseManager = require('./database-manager');

class EVLicenseDesktop {
    constructor() {
        this.mainWindow = null;
        this.databaseManager = null;
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
            
            console.log('✅ Services initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize services:', error);
            this.showErrorDialog('Initialization Error', 
                'Failed to initialize application services. Some features may not work correctly.');
        }
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
    }

    createWindow() {
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