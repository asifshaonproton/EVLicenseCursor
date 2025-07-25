const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');

class EVLicenseDesktop {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.argv.includes('--dev');
        this.initializeApp();
    }

    initializeApp() {
        app.whenReady().then(() => {
            this.createWindow();
            this.createApplicationMenu();
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
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
}

// Initialize the application
new EVLicenseDesktop();