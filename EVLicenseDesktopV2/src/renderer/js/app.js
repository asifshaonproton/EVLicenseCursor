// EV License Desktop - Main Application JavaScript

class EVLicenseApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.licenses = [];
        this.activityLog = [];
        this.nfcStatus = {
            connected: false,
            deviceInfo: null
        };
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            console.log('🚀 Initializing EV License Desktop App...');
            
            // Initialize Material Design Components
            this.initializeMDCComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Set up NFC event listeners
            this.setupNfcEventListeners();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize application', error.message);
        }
    }

    initializeMDCComponents() {
        // Initialize Top App Bar
        const topAppBar = mdc.topAppBar.MDCTopAppBar.attachTo(document.querySelector('.mdc-top-app-bar'));
        
        // Initialize Drawer
        this.drawer = mdc.drawer.MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));
        topAppBar.setScrollTarget(document.getElementById('main-content'));
        topAppBar.listen('MDCTopAppBar:nav', () => {
            this.drawer.open = !this.drawer.open;
        });

        // Initialize Buttons
        document.querySelectorAll('.mdc-button').forEach(button => {
            mdc.ripple.MDCRipple.attachTo(button);
        });

        // Initialize Icon Buttons
        document.querySelectorAll('.mdc-icon-button').forEach(button => {
            mdc.ripple.MDCRipple.attachTo(button).unbounded = true;
        });

        // Initialize Text Fields
        document.querySelectorAll('.mdc-text-field').forEach(textField => {
            mdc.textField.MDCTextField.attachTo(textField);
        });

        // Initialize Cards
        document.querySelectorAll('.mdc-card__primary-action').forEach(card => {
            mdc.ripple.MDCRipple.attachTo(card);
        });

        // Initialize List Items
        document.querySelectorAll('.mdc-deprecated-list-item').forEach(listItem => {
            mdc.ripple.MDCRipple.attachTo(listItem);
        });

        console.log('✅ Material Design Components initialized');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(navItem => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // App bar actions
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.navigateToPage('settings');
        });

        // License management
        document.getElementById('new-license-btn').addEventListener('click', () => {
            this.showLicenseDialog();
        });

        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchLicenses(e.target.value);
        });

        // NFC operations
        document.getElementById('read-card-btn').addEventListener('click', () => {
            this.readNfcCard();
        });

        document.getElementById('write-card-btn').addEventListener('click', () => {
            this.writeNfcCard();
        });

        document.getElementById('test-card-btn').addEventListener('click', () => {
            this.testCardReading();
        });

        document.getElementById('write-test-btn').addEventListener('click', () => {
            this.writeTestLicense();
        });

        // Menu event listeners
        window.electronAPI.menu.onNewLicense(() => {
            this.showLicenseDialog();
        });

        window.electronAPI.menu.onReadCard(() => {
            this.readNfcCard();
        });

        window.electronAPI.menu.onWriteCard(() => {
            this.writeNfcCard();
        });

        window.electronAPI.menu.onAbout(() => {
            this.navigateToPage('about');
        });

        console.log('✅ Event listeners set up');
    }

    setupNfcEventListeners() {
        // NFC reader events
        window.electronAPI.nfc.onReaderConnected((readerInfo) => {
            console.log('📱 NFC reader connected in UI:', readerInfo);
            this.nfcStatus.connected = true;
            this.nfcStatus.deviceInfo = readerInfo;
            this.updateNfcStatus();
            this.showNotification('NFC reader connected', `${readerInfo.name} is ready`, 'success');
        });

        window.electronAPI.nfc.onReaderDisconnected((info) => {
            console.log('📱 NFC reader disconnected in UI:', info);
            this.nfcStatus.connected = false;
            this.nfcStatus.deviceInfo = null;
            this.updateNfcStatus();
            this.showNotification('NFC reader disconnected', 'Please check your ACR122U connection', 'warning');
        });

        window.electronAPI.nfc.onCardDetected((cardData) => {
            console.log('💳 Card detected in UI:', cardData);
            this.handleCardDetected(cardData);
        });

        window.electronAPI.nfc.onCardRemoved((info) => {
            console.log('📤 Card removed in UI:', info);
            this.showNotification('NFC card removed', 'Card has been removed from reader', 'info');
        });

        window.electronAPI.nfc.onNfcInitialized(() => {
            console.log('✅ NFC initialized in UI');
            this.showNotification('NFC system ready', 'NFC system has been initialized', 'success');
        });

        window.electronAPI.nfc.onError((error) => {
            console.error('🚨 NFC error in UI:', error);
            this.showError('NFC Error', error.message || error);
        });

        console.log('✅ NFC event listeners set up');
    }

    async loadInitialData() {
        this.showLoading(true);
        try {
            // Load app version
            const version = await window.electronAPI.system.getVersion();
            document.getElementById('appVersion').textContent = version;

            // Load licenses
            await this.loadLicenses();

            // Load dashboard stats
            await this.loadDashboardStats();

            // Get NFC status
            await this.updateNfcStatus();

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showError('Data Loading Error', 'Failed to load application data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadLicenses() {
        try {
            this.licenses = await window.electronAPI.database.getLicenses();
            this.renderLicensesTable();
            console.log(`✅ Loaded ${this.licenses.length} licenses`);
        } catch (error) {
            console.error('❌ Error loading licenses:', error);
            throw error;
        }
    }

    async loadDashboardStats() {
        try {
            const stats = {
                totalLicenses: this.licenses.length,
                activeLicenses: this.licenses.filter(l => l.status === 'Active').length,
                expiredLicenses: this.licenses.filter(l => l.status === 'Expired').length,
                expiringIn30Days: this.getExpiringLicenses().length,
                associatedCards: this.licenses.filter(l => l.nfcCardNumber).length,
                recentActivity: []
            };

            this.updateDashboardStats(stats);
            await this.loadRecentActivity();
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
            throw error;
        }
    }

    async loadRecentActivity() {
        try {
            // For now, show sample activity
            const sampleActivity = [
                {
                    action_type: 'CREATE',
                    description: 'New license created for John Smith',
                    timestamp: new Date().toISOString()
                },
                {
                    action_type: 'READ',
                    description: 'NFC card read successfully',
                    timestamp: new Date(Date.now() - 30000).toISOString()
                },
                {
                    action_type: 'UPDATE',
                    description: 'License EV001-2024 updated',
                    timestamp: new Date(Date.now() - 60000).toISOString()
                }
            ];
            
            this.renderRecentActivity(sampleActivity);
        } catch (error) {
            console.error('❌ Error loading activity:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('totalLicenses').textContent = stats.totalLicenses;
        document.getElementById('activeLicenses').textContent = stats.activeLicenses;
        document.getElementById('expiringLicenses').textContent = stats.expiringIn30Days;
        document.getElementById('associatedCards').textContent = stats.associatedCards;
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        container.innerHTML = '';

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <span class="material-icons activity-icon">info</span>
                    <div class="activity-content">
                        <div class="activity-description">No recent activity</div>
                        <div class="activity-time">-</div>
                    </div>
                </div>
            `;
            return;
        }

        activities.forEach(activity => {
            const timeAgo = this.getTimeAgo(activity.timestamp);
            const icon = this.getActivityIcon(activity.action_type);
            
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.innerHTML = `
                <span class="material-icons activity-icon">${icon}</span>
                <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
            container.appendChild(activityElement);
        });
    }

    renderLicensesTable() {
        const tbody = document.getElementById('licenses-table-body');
        tbody.innerHTML = '';

        if (this.licenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">No licenses found</td>
                </tr>
            `;
            return;
        }

        this.licenses.forEach(license => {
            const row = document.createElement('tr');
            row.className = 'mdc-data-table__row';
            row.innerHTML = `
                <td class="mdc-data-table__cell">${license.licenseNumber}</td>
                <td class="mdc-data-table__cell">${license.holderName}</td>
                <td class="mdc-data-table__cell">${license.vehicleMake || ''} ${license.vehicleModel || ''} (${license.vehicleYear || 'N/A'})</td>
                <td class="mdc-data-table__cell">
                    <span class="status-badge ${license.status.toLowerCase()}">${license.status}</span>
                </td>
                <td class="mdc-data-table__cell">${this.formatDate(license.validityDate)}</td>
                <td class="mdc-data-table__cell">${license.nfcCardNumber || 'Not associated'}</td>
                <td class="mdc-data-table__cell">${license.city || 'Not specified'}</td>
                <td class="mdc-data-table__cell">
                    <div class="action-buttons">
                        <button class="action-button" onclick="app.showLicenseDetails(${license.id})" title="View Details">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="action-button" onclick="app.editLicense(${license.id})" title="Edit">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="action-button" onclick="app.deleteLicense(${license.id})" title="Delete">
                            <span class="material-icons">delete</span>
                        </button>
                        <button class="action-button" onclick="app.associateCard(${license.id})" title="Associate NFC Card">
                            <span class="material-icons">nfc</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateNfcStatus() {
        try {
            const status = await window.electronAPI.nfc.getStatus();
            const indicator = document.getElementById('nfcStatus');
            const deviceInfo = document.getElementById('nfcDeviceInfo');

            console.log('📊 NFC Status:', status);

            if (status.readers && status.readers.length > 0) {
                const reader = status.readers[0]; // Get the first reader
                this.nfcStatus.connected = true;
                this.nfcStatus.deviceInfo = reader;
                
                indicator.className = 'nfc-status-indicator connected';
                indicator.querySelector('.status-text').textContent = reader.name || 'NFC Reader';
                
                // Enhanced device information display
                const lastCard = status.lastCardUID ? `Last Card: ${status.lastCardUID}` : 'No card detected';
                const hasCard = status.hasActiveCard ? 'Card Present' : 'No Card';
                
                deviceInfo.innerHTML = `
                    <div class="device-status enhanced">
                        <div class="device-header">
                            <span class="status-indicator online"></span>
                            <span class="device-name">${reader.name || 'NFC Reader'}</span>
                            <span class="device-type">PC/SC NFC Reader</span>
                        </div>
                        <div class="device-details">
                            <div class="detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value status-${reader.connected ? 'active' : 'inactive'}">${reader.connected ? 'Connected' : 'Disconnected'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Card Status:</span>
                                <span class="detail-value status-${reader.hasCard ? 'active' : 'inactive'}">${hasCard}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Last Seen:</span>
                                <span class="detail-value">${reader.lastSeen ? new Date(reader.lastSeen).toLocaleString() : 'Unknown'}</span>
                            </div>
                            <div class="detail-row last-card">
                                <span class="detail-label">${lastCard}</span>
                            </div>
                        </div>
                        ${reader.capabilities ? `
                        <div class="device-capabilities">
                            <div class="capabilities-header">Capabilities:</div>
                            <div class="capabilities-list">
                                <div class="capability-item">Protocols: ${reader.capabilities.iso14443a ? 'ISO14443-A' : ''} ${reader.capabilities.iso14443b ? 'ISO14443-B' : ''} ${reader.capabilities.iso15693 ? 'ISO15693' : ''}</div>
                                <div class="capability-item">Cards: ${reader.capabilities.mifare ? 'MIFARE' : ''} ${reader.capabilities.desfire ? 'DESFire' : ''} ${reader.capabilities.felica ? 'FeliCa' : ''}</div>
                            </div>
                        </div>` : ''}
                    </div>
                `;
            } else {
                this.nfcStatus.connected = false;
                this.nfcStatus.deviceInfo = null;
                
                indicator.className = 'nfc-status-indicator';
                indicator.querySelector('.status-text').textContent = 'No Device';
                
                deviceInfo.innerHTML = `
                    <div class="device-status">
                        <span class="status-indicator offline"></span>
                        <span class="status-text">No compatible NFC device detected</span>
                        <button onclick="app.refreshNfcDevices()" class="refresh-button">
                            <span class="material-icons">refresh</span>
                            Refresh Devices
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error updating NFC status:', error);
            
            // Show error state
            const indicator = document.getElementById('nfcStatus');
            const deviceInfo = document.getElementById('nfcDeviceInfo');
            
            if (indicator) {
                indicator.className = 'nfc-status-indicator error';
                const statusText = indicator.querySelector('.status-text');
                if (statusText) statusText.textContent = 'Error';
            }
            
            if (deviceInfo) {
                deviceInfo.innerHTML = `
                    <div class="device-status error">
                        <span class="status-indicator error"></span>
                        <span class="status-text">Error: ${error.message || 'Failed to get NFC status'}</span>
                        <button onclick="app.refreshNfcDevices()" class="refresh-button">
                            <span class="material-icons">refresh</span>
                            Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    navigateToPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = pageId;
        }

        // Update navigation
        document.querySelectorAll('.mdc-deprecated-list-item').forEach(item => {
            item.classList.remove('mdc-deprecated-list-item--activated');
        });
        
        const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('mdc-deprecated-list-item--activated');
        }

        // Close drawer on mobile
        if (this.drawer.open) {
            this.drawer.open = false;
        }

        // Load page-specific data
        this.loadPageData(pageId);
    }

    async loadPageData(pageId) {
        switch (pageId) {
            case 'dashboard':
                await this.loadDashboardStats();
                break;
            case 'licenses':
                await this.loadLicenses();
                break;
            case 'nfc':
                await this.updateNfcStatus();
                break;
            case 'activity':
                await this.loadActivityLog();
                break;
        }
    }

    async loadActivityLog() {
        // Implementation for activity log loading
        console.log('📊 Loading activity log...');
    }

    async readNfcCard() {
        if (!this.nfcStatus.connected) {
            this.showError('NFC Error', 'No NFC device connected');
            return;
        }

        try {
            this.showLoading(true, 'Reading NFC card...');
            const cardData = await window.electronAPI.nfc.readCard();
            
            this.displayCardData(cardData);
            this.showNotification('Card Read', 'NFC card read successfully', 'success');
        } catch (error) {
            console.error('❌ Error reading card:', error);
            this.showError('Read Error', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async writeNfcCard() {
        if (!this.nfcStatus.connected) {
            this.showError('NFC Error', 'No NFC device connected');
            return;
        }

        // Show write dialog using a simple input dialog
        const data = await this.showInputDialog('Enter data to write to card:', 'Write NFC Card');
        if (!data) return;

        try {
            this.showLoading(true, 'Writing to NFC card...');
            const result = await window.electronAPI.nfc.writeCard(data);
            
            this.showNotification('Card Write', 'Data written to NFC card successfully', 'success');
            console.log('💾 Card write result:', result);
        } catch (error) {
            console.error('❌ Error writing card:', error);
            this.showError('Write Error', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async testCardReading() {
        if (!this.nfcStatus.connected) {
            this.showError('NFC Error', 'No NFC device connected');
            return;
        }

        try {
            this.showLoading(true, 'Starting card reading test...');
            
            // Start the test mode
            const result = await window.electronAPI.nfc.testCardReading();
            
            if (result.success) {
                this.showNotification('Test Mode Started', 'Place different NFC cards on the reader to test. Check console for detailed results.', 'info');
                
                // Add a button to stop the test
                const testSection = document.querySelector('.nfc-operations');
                if (testSection && !document.getElementById('stop-test-btn')) {
                    const stopButton = document.createElement('button');
                    stopButton.id = 'stop-test-btn';
                    stopButton.className = 'mdc-button mdc-button--outlined';
                    stopButton.innerHTML = `
                        <span class="mdc-button__ripple"></span>
                        <i class="material-icons mdc-button__icon">stop</i>
                        <span class="mdc-button__label">Stop Test</span>
                    `;
                    stopButton.addEventListener('click', () => {
                        this.stopCardReadingTest();
                    });
                    testSection.appendChild(stopButton);
                }
            } else {
                this.showError('Test Error', result.message || 'Failed to start test mode');
            }
            
        } catch (error) {
            console.error('❌ Error starting card reading test:', error);
            this.showError('Test Error', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async stopCardReadingTest() {
        try {
            this.showLoading(true, 'Stopping test...');
            
            const result = await window.electronAPI.nfc.stopCardReadingTest();
            
            // Remove the stop button
            const stopButton = document.getElementById('stop-test-btn');
            if (stopButton) {
                stopButton.remove();
            }
            
            if (result.success) {
                this.showNotification('Test Complete', result.message, 'success');
                
                // Show summary in console if there are results
                if (result.results && result.results.length > 0) {
                    console.log('\n🧪 CARD READING TEST SUMMARY:');
                    console.log('=====================================');
                    result.results.forEach((result, index) => {
                        console.log(`${index + 1}. UID: ${result.uid} | Text: "${result.extractedText}"`);
                    });
                    
                    // Check if all cards show the same text
                    const uniqueTexts = [...new Set(result.results.map(r => r.extractedText))];
                    if (uniqueTexts.length === 1 && result.results.length > 1) {
                        console.log(`\n⚠️ WARNING: All ${result.results.length} cards show the same text: "${uniqueTexts[0]}"`);
                        console.log('This suggests the text might be static data or a reading error.');
                    } else if (uniqueTexts.length > 1) {
                        console.log(`\n✅ Different cards show different text (${uniqueTexts.length} unique texts)`);
                        console.log('This suggests the text is coming from actual card data.');
                    }
                    console.log('=====================================\n');
                }
            } else {
                this.showError('Test Error', result.message || 'Failed to stop test mode');
            }
        } catch (error) {
            console.error('❌ Error stopping card reading test:', error);
            this.showError('Test Error', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async writeTestLicense() {
        if (!this.nfcStatus.connected) {
            this.showError('NFC Error', 'No NFC device connected');
            return;
        }

        try {
            this.showLoading(true, 'Writing test license to card...');
            const result = await window.electronAPI.nfc.writeTestLicense();
            
            if (result.success) {
                this.showNotification('Test License Written', 'Test license data has been written to the card successfully. Now try reading it to see the decrypted data.', 'success');
                console.log('📝 Test license written:', result.licenseData);
            } else {
                this.showError('Write Error', result.message || 'Failed to write test license');
            }
        } catch (error) {
            console.error('❌ Error writing test license:', error);
            this.showError('Write Error', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    showInputDialog(message, title = 'Input') {
        return new Promise((resolve) => {
            // Create a simple modal dialog
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                min-width: 300px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 15px 0;">${title}</h3>
                <p style="margin: 0 0 15px 0;">${message}</p>
                <input type="text" id="inputField" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
                <div style="text-align: right;">
                    <button id="cancelBtn" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ccc; background: #f5f5f5; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="okBtn" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">OK</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            const inputField = dialog.querySelector('#inputField');
            const okBtn = dialog.querySelector('#okBtn');
            const cancelBtn = dialog.querySelector('#cancelBtn');
            
            inputField.focus();
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            okBtn.onclick = () => {
                const value = inputField.value.trim();
                cleanup();
                resolve(value);
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };
            
            inputField.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    okBtn.click();
                } else if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            };
        });
    }

    async refreshNfcDevices() {
        try {
            this.showLoading(true, 'Refreshing NFC devices...');
            const result = await window.electronAPI.nfc.refreshDevices();
            
            if (result.success) {
                this.showNotification('Devices Refreshed', 'NFC devices refreshed successfully', 'success');
                await this.updateNfcStatus();
            } else {
                this.showNotification('Refresh Failed', 'No compatible NFC devices found', 'warning');
            }
        } catch (error) {
            this.showError('Refresh Error', error.message || error);
        } finally {
            this.showLoading(false);
        }
    }

    displayCardData(cardData) {
        const section = document.getElementById('cardDataSection');
        const container = document.getElementById('cardData');
        
        console.log('📊 Displaying card data:', cardData);
        
        // Enhanced card data display with comprehensive information
        const capabilities = cardData.capabilities ? cardData.capabilities.join(', ') : 'Unknown';
        const technology = cardData.standard || 'Unknown';
        const atr = cardData.atr ? cardData.atr.toString('hex') : 'Not available';
        const extractedText = cardData.extractedText || cardData.ndefMessage || 'No text content';
        
        // Display blocks information
        let blocksInfo = '';
        if (cardData.blocks && cardData.blocks.length > 0) {
            blocksInfo = `
                <div class="blocks-info">
                    <h4>Block Data:</h4>
                    ${cardData.blocks.map(block => `
                        <div class="block-item">
                            <strong>Block ${block.block}:</strong> 
                            <span class="data-hex">${block.data}</span>
                            ${block.textContent ? `<br><span class="text-content">Text: "${block.textContent}"</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Display extracted text information
        let textInfo = '';
        if (extractedText && extractedText !== 'No text content') {
            textInfo = `
                <div class="text-info">
                    <h4>Extracted Text:</h4>
                    <div class="text-content">
                        <strong>Content:</strong> "${extractedText}"
                    </div>
                    <div class="text-meta">
                        <strong>Source:</strong> ${cardData.ndefMessage ? 'NDEF Message' : 'Raw Data'}
                    </div>
                </div>
            `;
        }
        
        let additionalDataInfo = '';
        if (cardData.additionalData) {
            additionalDataInfo = `
                <div class="additional-data">
                    <h4>Additional Data:</h4>
                    <div class="data-row">
                        <strong>First Block:</strong> <span class="data-hex">${cardData.additionalData.firstBlock}</span>
                    </div>
                    <div class="data-row">
                        <strong>Data Length:</strong> ${cardData.additionalData.dataLength} bytes
                    </div>
                    <div class="data-row">
                        <strong>Contains Data:</strong> ${cardData.additionalData.hasData ? 'Yes' : 'No'}
                    </div>
                </div>
            `;
        }
        
        let readerInfo = '';
        if (cardData.readerInfo) {
            readerInfo = `
                <div class="reader-info">
                    <h4>Reader Information:</h4>
                    <div class="data-row">
                        <strong>Device:</strong> ${cardData.readerInfo.product || cardData.readerInfo.deviceType?.name || 'Unknown'}
                    </div>
                    <div class="data-row">
                        <strong>Serial:</strong> ${cardData.readerInfo.serialNumber || 'Unknown'}
                    </div>
                    <div class="data-row">
                        <strong>Firmware:</strong> ${cardData.readerInfo.firmwareVersion || 'Unknown'}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="card-data-enhanced">
                <div class="card-header">
                    <div class="card-uid">
                        <span class="uid-label">UID:</span>
                        <span class="uid-value">${cardData.uid}</span>
                        <button onclick="navigator.clipboard.writeText('${cardData.uid}')" class="copy-button" title="Copy UID">
                            <span class="material-icons">content_copy</span>
                        </button>
                    </div>
                    <div class="card-type">
                        <span class="type-badge">${cardData.type}</span>
                    </div>
                </div>
                
                <div class="card-properties">
                    <div class="property-grid">
                        <div class="property-item">
                            <span class="property-label">Type:</span>
                            <span class="property-value">${cardData.type || 'Unknown'}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Standard:</span>
                            <span class="property-value">${technology}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">ATR:</span>
                            <span class="property-value">${atr}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Capabilities:</span>
                            <span class="property-value">${capabilities}</span>
                        </div>
                    </div>
                </div>
                
                <div class="technical-details">
                    <div class="detail-section">
                        <h4>Technical Details:</h4>
                        <div class="data-row">
                            <strong>ATR:</strong> <span class="data-hex">${atr}</span>
                        </div>
                        <div class="data-row">
                            <strong>Detected:</strong> ${this.formatDateTime(cardData.detectedAt)}
                        </div>
                        ${cardData.readTimestamp ? `
                        <div class="data-row">
                            <strong>Last Read:</strong> ${this.formatDateTime(cardData.readTimestamp)}
                        </div>` : ''}
                    </div>
                </div>
                
                ${textInfo}
                ${blocksInfo}
                ${additionalDataInfo}
                ${readerInfo}
                
                <div class="card-actions">
                    <button onclick="app.readNfcCard()" class="action-button primary">
                        <span class="material-icons">visibility</span>
                        Re-read Card
                    </button>
                    <button onclick="app.writeNfcCard()" class="action-button secondary">
                        <span class="material-icons">edit</span>
                        Write Data
                    </button>
                    <button onclick="app.exportCardData('${cardData.uid}')" class="action-button secondary">
                        <span class="material-icons">download</span>
                        Export Data
                    </button>
                </div>
            </div>
        `;
        
        section.style.display = 'block';
    }

    exportCardData(uid) {
        try {
            // Find the current card data
            const cardData = this.lastDetectedCard || { uid: uid };
            
            // Create export data
            const exportData = {
                uid: cardData.uid,
                type: cardData.type,
                size: cardData.size,
                sectors: cardData.sectors,
                technology: cardData.technology,
                capabilities: cardData.capabilities,
                atr: cardData.atr,
                timestamp: cardData.timestamp,
                readTimestamp: cardData.readTimestamp,
                additionalData: cardData.additionalData,
                readerInfo: cardData.readerInfo,
                exportedAt: new Date().toISOString()
            };
            
            // Create and download JSON file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `nfc-card-${uid}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Export Complete', `Card data exported successfully`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting card data:', error);
            this.showError('Export Error', error.message || 'Failed to export card data');
        }
    }

    handleCardDetected(cardData) {
        console.log('📱 Card detected:', cardData);
        
        // Store the last detected card data for export functionality
        this.lastDetectedCard = cardData;
        
        this.showNotification('Card Detected', `${cardData.type || 'NFC Card'} (${cardData.uid})`, 'info');
        
        // Auto-navigate to NFC page if not already there
        if (this.currentPage !== 'nfc') {
            this.navigateToPage('nfc');
        }
        
        this.displayCardData(cardData);
        
        // Check if this card is associated with a license
        this.checkCardForLicense(cardData.uid);
    }

    async checkCardForLicense(cardUid) {
        try {
            // Search for license with this NFC card number
            const license = this.licenses.find(l => l.nfcCardNumber === cardUid);
            
            if (license) {
                // Show license display screen
                this.showLicenseDisplayScreen(license);
            } else {
                // Show option to create new license or associate with existing
                this.showCardAssociationOptions(cardUid);
            }
        } catch (error) {
            console.error('❌ Error checking card for license:', error);
        }
    }

    showLicenseDisplayScreen(license) {
        const screen = document.createElement('div');
        screen.className = 'license-display-screen';
        screen.innerHTML = `
            <div class="license-display-card">
                <button class="license-display-close" onclick="this.closest('.license-display-screen').remove()">
                    <span class="material-icons">close</span>
                </button>
                
                <div class="license-display-header">
                    <div class="license-display-title">${license.licenseNumber}</div>
                    <div class="license-display-subtitle">EV License</div>
                </div>
                
                <div class="license-display-content">
                    <div class="license-display-section">
                        <h3>License Holder</h3>
                        <div class="license-display-row">
                            <span class="license-display-label">Name:</span>
                            <span class="license-display-value">${license.holderName}</span>
                        </div>
                        <div class="license-display-row">
                            <span class="license-display-label">Mobile:</span>
                            <span class="license-display-value">${license.mobile}</span>
                        </div>
                        <div class="license-display-row">
                            <span class="license-display-label">City:</span>
                            <span class="license-display-value">${license.city || 'Not specified'}</span>
                        </div>
                        <div class="license-display-row">
                            <span class="license-display-label">Email:</span>
                            <span class="license-display-value">${license.email || 'Not provided'}</span>
                        </div>
                    </div>
                    
                    <div class="license-display-section">
                        <h3>License Details</h3>
                        <div class="license-display-row">
                            <span class="license-display-label">Type:</span>
                            <span class="license-display-value">${license.licenseType}</span>
                        </div>
                        <div class="license-display-row">
                            <span class="license-display-label">Status:</span>
                            <span class="license-display-value ${license.status.toLowerCase()}">${license.status}</span>
                        </div>
                        <div class="license-display-row">
                            <span class="license-display-label">Issue Date:</span>
                            <span class="license-display-value">${this.formatDate(license.issueDate) || 'Not specified'}</span>
                        </div>
                        <div class="license-display-row">
                            <span class="license-display-label">Valid Until:</span>
                            <span class="license-display-value ${this.isExpired(license.validityDate) ? 'expired' : ''}">${this.formatDate(license.validityDate)}</span>
                        </div>
                    </div>
                    
                    ${license.vehicleMake || license.vehicleModel ? `
                    <div class="license-display-section">
                        <h3>Vehicle Information</h3>
                        ${license.vehicleMake ? `
                        <div class="license-display-row">
                            <span class="license-display-label">Make:</span>
                            <span class="license-display-value">${license.vehicleMake}</span>
                        </div>
                        ` : ''}
                        ${license.vehicleModel ? `
                        <div class="license-display-row">
                            <span class="license-display-label">Model:</span>
                            <span class="license-display-value">${license.vehicleModel}</span>
                        </div>
                        ` : ''}
                        ${license.vehicleYear ? `
                        <div class="license-display-row">
                            <span class="license-display-label">Year:</span>
                            <span class="license-display-value">${license.vehicleYear}</span>
                        </div>
                        ` : ''}
                        ${license.vehicleColor ? `
                        <div class="license-display-row">
                            <span class="license-display-label">Color:</span>
                            <span class="license-display-value">${license.vehicleColor}</span>
                        </div>
                        ` : ''}
                        ${license.vehicleVin ? `
                        <div class="license-display-row">
                            <span class="license-display-label">VIN:</span>
                            <span class="license-display-value">${license.vehicleVin}</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    ${license.notes ? `
                    <div class="license-display-section">
                        <h3>Notes</h3>
                        <div class="license-display-row">
                            <span class="license-display-value" style="text-align: left; font-style: italic;">${license.notes}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="license-display-actions">
                    <button onclick="app.showLicenseDetails(${license.id})" class="btn-secondary">
                        <span class="material-icons">visibility</span>
                        View Details
                    </button>
                    <button onclick="app.editLicense(${license.id})" class="btn-secondary">
                        <span class="material-icons">edit</span>
                        Edit License
                    </button>
                    <button onclick="this.closest('.license-display-screen').remove()" class="btn-primary">
                        <span class="material-icons">check</span>
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(screen);
        
        // Auto-close after 30 seconds
        setTimeout(() => {
            if (screen.parentNode) {
                screen.remove();
            }
        }, 30000);
    }

    showCardAssociationOptions(cardUid) {
        const dialog = document.createElement('div');
        dialog.className = 'license-dialog-overlay';
        dialog.innerHTML = `
            <div class="license-dialog">
                <div class="dialog-header">
                    <h2>NFC Card Detected</h2>
                    <button class="close-btn" onclick="this.closest('.license-dialog-overlay').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="dialog-content" style="padding: 32px;">
                    <div class="card-info">
                        <h3>Card Information</h3>
                        <p><strong>UID:</strong> ${cardUid}</p>
                        <p>This NFC card is not associated with any license.</p>
                    </div>
                    
                    <div class="association-options">
                        <h3>What would you like to do?</h3>
                        <div class="option-buttons">
                            <button onclick="app.createLicenseForCard('${cardUid}')" class="btn-primary">
                                <span class="material-icons">add_circle</span>
                                Create New License
                            </button>
                            <button onclick="app.associateWithExistingLicense('${cardUid}')" class="btn-secondary">
                                <span class="material-icons">link</span>
                                Associate with Existing License
                            </button>
                            <button onclick="this.closest('.license-dialog-overlay').remove()" class="btn-secondary">
                                <span class="material-icons">close</span>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    createLicenseForCard(cardUid) {
        // Close the association options dialog
        const overlay = document.querySelector('.license-dialog-overlay');
        if (overlay) overlay.remove();
        
        // Show license creation dialog with pre-filled NFC card number
        this.showLicenseDialog(null, cardUid);
    }

    async associateWithExistingLicense(cardUid) {
        // Close the association options dialog
        const overlay = document.querySelector('.license-dialog-overlay');
        if (overlay) overlay.remove();
        
        // Show license selection dialog
        this.showLicenseSelectionDialog(cardUid);
    }

    async showLicenseSelectionDialog(cardUid) {
        const dialog = document.createElement('div');
        dialog.className = 'license-dialog-overlay';
        dialog.innerHTML = `
            <div class="license-dialog">
                <div class="dialog-header">
                    <h2>Select License to Associate</h2>
                    <button class="close-btn" onclick="this.closest('.license-dialog-overlay').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="dialog-content" style="padding: 32px;">
                    <p>Select a license to associate with NFC card <strong>${cardUid}</strong>:</p>
                    
                    <div class="license-selection-list">
                        ${this.licenses.map(license => `
                            <div class="license-selection-item">
                                <div class="license-info">
                                    <div class="license-name">${license.holderName}</div>
                                    <div class="license-number">${license.licenseNumber}</div>
                                    <div class="license-status ${license.status.toLowerCase()}">${license.status}</div>
                                </div>
                                <button onclick="app.associateCardToLicense('${cardUid}', ${license.id})" class="btn-primary">
                                    <span class="material-icons">link</span>
                                    Associate
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    async associateCardToLicense(cardUid, licenseId) {
        try {
            await window.electronAPI.database.associateCard(cardUid, licenseId);
            this.showNotification('Card Associated', 'NFC card has been associated with the license', 'success');
            await this.loadLicenses();
            
            // Close the selection dialog
            const overlay = document.querySelector('.license-dialog-overlay');
            if (overlay) overlay.remove();
            
        } catch (error) {
            console.error('❌ Error associating card:', error);
            this.showError('Association Error', error.message || 'Failed to associate card');
        }
    }

    async searchLicenses(searchTerm) {
        if (!searchTerm.trim()) {
            await this.loadLicenses();
            return;
        }

        try {
            const results = await window.electronAPI.database.searchLicenses(searchTerm);
            this.licenses = results;
            this.renderLicensesTable();
        } catch (error) {
            console.error('❌ Error searching licenses:', error);
            this.showError('Search Error', error.message);
        }
    }

    async refreshData() {
        console.log('🔄 Refreshing data...');
        this.showLoading(true, 'Refreshing...');
        
        try {
            await this.loadInitialData();
            this.showNotification('Refresh Complete', 'Data updated successfully', 'success');
        } catch (error) {
            this.showError('Refresh Error', 'Failed to refresh data');
        } finally {
            this.showLoading(false);
        }
    }

    startPeriodicUpdates() {
        // Update dashboard stats every 30 seconds
        setInterval(() => {
            if (this.currentPage === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 30000);

        // Update NFC status every 10 seconds
        setInterval(() => {
            this.updateNfcStatus();
        }, 10000);
    }

    // Dialog and notification methods
    showNewLicenseDialog() {
        this.showLicenseDialog();
    }

    showLoading(show, message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('.loading-text');
        
        if (show) {
            text.textContent = message;
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }

    showNotification(title, message, type = 'info') {
        // For now, use console and temporary visual feedback
        console.log(`📢 ${title}: ${message}`);
        
        // In a full implementation, this would show a proper snackbar/toast
        const toast = document.createElement('div');
        toast.className = `notification notification-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--md-sys-color-primary);
            color: var(--md-sys-color-on-primary);
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        toast.innerHTML = `<strong>${title}</strong><br>${message}`;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    showError(title, message) {
        console.error(`❌ ${title}: ${message}`);
        this.showNotification(title, message, 'error');
    }

    // Utility methods
    getExpiringLicenses() {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        return this.licenses.filter(license => {
            const expiryDate = new Date(license.validityDate);
            return expiryDate <= thirtyDaysFromNow && license.status === 'Active';
        });
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    }

    formatDateTime(dateString) {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
        return `${Math.floor(diffMins / 1440)} days ago`;
    }

    getActivityIcon(actionType) {
        const icons = {
            'CREATE': 'add_circle',
            'UPDATE': 'edit',
            'DELETE': 'delete',
            'READ': 'visibility',
            'WRITE': 'create',
            'ASSOCIATE': 'link',
            'SEARCH': 'search'
        };
        return icons[actionType] || 'info';
    }

    // License management methods (stubs for now)
    editLicense(licenseId) {
        console.log('✏️ Edit license:', licenseId);
        this.showLicenseDialog(licenseId);
    }

    deleteLicense(licenseId) {
        console.log('🗑️ Delete license:', licenseId);
        this.showDeleteConfirmation(licenseId);
    }

    associateCard(licenseId) {
        console.log('🔗 Associate card with license:', licenseId);
        this.showCardAssociationDialog(licenseId);
    }

    // New comprehensive license management methods
    async showLicenseDialog(licenseId = null, prefillNfcCard = null) {
        const isEdit = licenseId !== null;
        const license = isEdit ? this.licenses.find(l => l.id === licenseId) : null;
        
        // Use pre-filled NFC card number if provided
        const nfcCardNumber = prefillNfcCard || license?.nfcCardNumber || '';
        
        const dialog = document.createElement('div');
        dialog.className = 'license-dialog-overlay';
        dialog.innerHTML = `
            <div class="license-dialog">
                <div class="dialog-header">
                    <h2>${isEdit ? 'Edit License' : 'New License'}</h2>
                    <button class="close-btn" onclick="this.closest('.license-dialog-overlay').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <form id="licenseForm" class="license-form">
                    <div class="form-grid">
                        <div class="form-section">
                            <h3>License Holder Information</h3>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="holderName">Holder Name *</label>
                                    <input type="text" id="holderName" name="holderName" required 
                                           value="${license?.holderName || ''}" />
                                </div>
                                <div class="form-field">
                                    <label for="mobile">Mobile *</label>
                                    <input type="tel" id="mobile" name="mobile" required 
                                           value="${license?.mobile || ''}" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="email">Email</label>
                                    <input type="email" id="email" name="email" 
                                           value="${license?.email || ''}" />
                                </div>
                                <div class="form-field">
                                    <label for="city">City</label>
                                    <select id="city" name="city">
                                        <option value="">Select City</option>
                                        <option value="Rangpur" ${license?.city === 'Rangpur' ? 'selected' : ''}>Rangpur</option>
                                        <option value="Narayanganj" ${license?.city === 'Narayanganj' ? 'selected' : ''}>Narayanganj</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>License Details</h3>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="licenseNumber">License Number *</label>
                                    <input type="text" id="licenseNumber" name="licenseNumber" required 
                                           value="${license?.licenseNumber || ''}" />
                                </div>
                                <div class="form-field">
                                    <label for="licenseType">License Type *</label>
                                    <select id="licenseType" name="licenseType" required>
                                        <option value="">Select Type</option>
                                        <option value="A" ${license?.licenseType === 'A' ? 'selected' : ''}>A - Motorcycle</option>
                                        <option value="R" ${license?.licenseType === 'R' ? 'selected' : ''}>R - Car</option>
                                        <option value="V" ${license?.licenseType === 'V' ? 'selected' : ''}>V - Van</option>
                                        <option value="M" ${license?.licenseType === 'M' ? 'selected' : ''}>M - Motorcycle</option>
                                        <option value="P" ${license?.licenseType === 'P' ? 'selected' : ''}>P - Passenger</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="issueDate">Issue Date</label>
                                    <input type="date" id="issueDate" name="issueDate" 
                                           value="${license?.issueDate || ''}" />
                                </div>
                                <div class="form-field">
                                    <label for="validityDate">Validity Date *</label>
                                    <input type="date" id="validityDate" name="validityDate" required 
                                           value="${license?.validityDate || ''}" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="status">Status</label>
                                    <select id="status" name="status">
                                        <option value="Active" ${license?.status === 'Active' ? 'selected' : ''}>Active</option>
                                        <option value="Expired" ${license?.status === 'Expired' ? 'selected' : ''}>Expired</option>
                                        <option value="Suspended" ${license?.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                                    </select>
                                </div>
                                <div class="form-field">
                                    <label for="nfcCardNumber">NFC Card Number</label>
                                    <input type="text" id="nfcCardNumber" name="nfcCardNumber" 
                                           value="${nfcCardNumber}" ${prefillNfcCard ? 'readonly' : ''} />
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>Vehicle Information</h3>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="vehicleMake">Vehicle Make</label>
                                    <input type="text" id="vehicleMake" name="vehicleMake" 
                                           value="${license?.vehicleMake || ''}" />
                                </div>
                                <div class="form-field">
                                    <label for="vehicleModel">Vehicle Model</label>
                                    <input type="text" id="vehicleModel" name="vehicleModel" 
                                           value="${license?.vehicleModel || ''}" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field">
                                    <label for="vehicleYear">Vehicle Year</label>
                                    <input type="number" id="vehicleYear" name="vehicleYear" min="1900" max="2030" 
                                           value="${license?.vehicleYear || ''}" />
                                </div>
                                <div class="form-field">
                                    <label for="vehicleColor">Vehicle Color</label>
                                    <input type="text" id="vehicleColor" name="vehicleColor" 
                                           value="${license?.vehicleColor || ''}" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field full-width">
                                    <label for="vehicleVin">Vehicle VIN</label>
                                    <input type="text" id="vehicleVin" name="vehicleVin" 
                                           value="${license?.vehicleVin || ''}" />
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>Additional Information</h3>
                            <div class="form-row">
                                <div class="form-field full-width">
                                    <label for="notes">Notes</label>
                                    <textarea id="notes" name="notes" rows="3">${license?.notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dialog-actions">
                        <button type="button" class="btn-secondary" onclick="this.closest('.license-dialog-overlay').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            ${isEdit ? 'Update License' : 'Create License'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Handle form submission
        const form = dialog.querySelector('#licenseForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLicenseSubmit(form, isEdit, licenseId);
        });
    }

    async handleLicenseSubmit(form, isEdit, licenseId) {
        try {
            const formData = new FormData(form);
            const licenseData = {
                holderName: formData.get('holderName'),
                mobile: formData.get('mobile'),
                email: formData.get('email'),
                city: formData.get('city'),
                licenseType: formData.get('licenseType'),
                licenseNumber: formData.get('licenseNumber'),
                nfcCardNumber: formData.get('nfcCardNumber'),
                validityDate: formData.get('validityDate'),
                issueDate: formData.get('issueDate'),
                status: formData.get('status'),
                vehicleMake: formData.get('vehicleMake'),
                vehicleModel: formData.get('vehicleModel'),
                vehicleYear: formData.get('vehicleYear') ? parseInt(formData.get('vehicleYear')) : null,
                vehicleColor: formData.get('vehicleColor'),
                vehicleVin: formData.get('vehicleVin'),
                notes: formData.get('notes')
            };
            
            if (isEdit) {
                licenseData.id = licenseId;
                await window.electronAPI.database.updateLicense(licenseData);
                this.showNotification('License Updated', 'License has been updated successfully', 'success');
            } else {
                await window.electronAPI.database.addLicense(licenseData);
                this.showNotification('License Created', 'New license has been created successfully', 'success');
            }
            
            // Refresh licenses and close dialog
            await this.loadLicenses();
            form.closest('.license-dialog-overlay').remove();
            
        } catch (error) {
            console.error('❌ Error saving license:', error);
            this.showError('Save Error', error.message || 'Failed to save license');
        }
    }

    async showDeleteConfirmation(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) return;
        
        const result = await window.electronAPI.system.showMessageBox({
            type: 'warning',
            title: 'Delete License',
            message: 'Are you sure you want to delete this license?',
            detail: `This will permanently delete the license for ${license.holderName} (${license.licenseNumber}). This action cannot be undone.`,
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            cancelId: 0
        });
        
        if (result.response === 1) {
            try {
                await window.electronAPI.database.deleteLicense(licenseId);
                this.showNotification('License Deleted', 'License has been deleted successfully', 'success');
                await this.loadLicenses();
            } catch (error) {
                console.error('❌ Error deleting license:', error);
                this.showError('Delete Error', error.message || 'Failed to delete license');
            }
        }
    }

    async showCardAssociationDialog(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) return;
        
        const dialog = document.createElement('div');
        dialog.className = 'license-dialog-overlay';
        dialog.innerHTML = `
            <div class="license-dialog">
                <div class="dialog-header">
                    <h2>Associate NFC Card</h2>
                    <button class="close-btn" onclick="this.closest('.license-dialog-overlay').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="dialog-content">
                    <p><strong>License:</strong> ${license.holderName} (${license.licenseNumber})</p>
                    <p><strong>Current NFC Card:</strong> ${license.nfcCardNumber || 'None'}</p>
                    
                    <div class="nfc-association-section">
                        <h3>Scan NFC Card</h3>
                        <p>Place an NFC card on the reader to associate it with this license.</p>
                        
                        <div class="nfc-status">
                            <div class="nfc-indicator ${this.nfcStatus.connected ? 'connected' : 'disconnected'}">
                                <span class="material-icons">nfc</span>
                                <span>${this.nfcStatus.connected ? 'Reader Connected' : 'No Reader'}</span>
                            </div>
                        </div>
                        
                        <div class="card-info" id="cardInfo" style="display: none;">
                            <h4>Detected Card:</h4>
                            <div id="cardDetails"></div>
                        </div>
                        
                        <div class="association-actions">
                            <button id="scanCardBtn" class="btn-primary" ${!this.nfcStatus.connected ? 'disabled' : ''}>
                                <span class="material-icons">nfc</span>
                                Scan Card
                            </button>
                            <button id="associateBtn" class="btn-secondary" style="display: none;">
                                <span class="material-icons">link</span>
                                Associate Card
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        let detectedCard = null;
        
        // Handle scan card button
        const scanBtn = dialog.querySelector('#scanCardBtn');
        scanBtn.addEventListener('click', async () => {
            try {
                scanBtn.disabled = true;
                scanBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Scanning...';
                
                const cardData = await window.electronAPI.nfc.readCard();
                detectedCard = cardData;
                
                const cardInfo = dialog.querySelector('#cardInfo');
                const cardDetails = dialog.querySelector('#cardDetails');
                const associateBtn = dialog.querySelector('#associateBtn');
                
                cardDetails.innerHTML = `
                    <p><strong>UID:</strong> ${cardData.uid}</p>
                    <p><strong>Type:</strong> ${cardData.type || 'Unknown'}</p>
                    <p><strong>Size:</strong> ${cardData.size || 'Unknown'}</p>
                `;
                
                cardInfo.style.display = 'block';
                associateBtn.style.display = 'inline-flex';
                
                scanBtn.innerHTML = '<span class="material-icons">check</span> Card Detected';
                
            } catch (error) {
                console.error('❌ Error scanning card:', error);
                this.showError('Scan Error', error.message || 'Failed to scan card');
                scanBtn.disabled = false;
                scanBtn.innerHTML = '<span class="material-icons">nfc</span> Scan Card';
            }
        });
        
        // Handle associate button
        const associateBtn = dialog.querySelector('#associateBtn');
        associateBtn.addEventListener('click', async () => {
            if (!detectedCard) return;
            
            try {
                await window.electronAPI.database.associateCard(detectedCard.uid, licenseId);
                this.showNotification('Card Associated', 'NFC card has been associated with the license', 'success');
                await this.loadLicenses();
                dialog.remove();
            } catch (error) {
                console.error('❌ Error associating card:', error);
                this.showError('Association Error', error.message || 'Failed to associate card');
            }
        });
    }

    // Enhanced license display with NFC reading
    async showLicenseDetails(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) return;
        
        const dialog = document.createElement('div');
        dialog.className = 'license-dialog license-details-dialog';
        dialog.innerHTML = `
            <div class="license-dialog license-details-dialog">
                <div class="dialog-header">
                    <h2>License Details</h2>
                    <button class="close-btn" onclick="this.closest('.license-dialog-overlay').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="license-details-content">
                    <div class="license-header">
                        <div class="license-number">${license.licenseNumber}</div>
                        <div class="license-status ${license.status.toLowerCase()}">${license.status}</div>
                    </div>
                    
                    <div class="details-grid">
                        <div class="detail-section">
                            <h3>Holder Information</h3>
                            <div class="detail-row">
                                <span class="detail-label">Name:</span>
                                <span class="detail-value">${license.holderName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Mobile:</span>
                                <span class="detail-value">${license.mobile}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${license.email || 'Not provided'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">City:</span>
                                <span class="detail-value">${license.city || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>License Information</h3>
                            <div class="detail-row">
                                <span class="detail-label">Type:</span>
                                <span class="detail-value">${license.licenseType}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Issue Date:</span>
                                <span class="detail-value">${this.formatDate(license.issueDate) || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Valid Until:</span>
                                <span class="detail-value ${this.isExpired(license.validityDate) ? 'expired' : ''}">${this.formatDate(license.validityDate)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">NFC Card:</span>
                                <span class="detail-value">${license.nfcCardNumber || 'Not associated'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Vehicle Information</h3>
                            <div class="detail-row">
                                <span class="detail-label">Make:</span>
                                <span class="detail-value">${license.vehicleMake || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Model:</span>
                                <span class="detail-value">${license.vehicleModel || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Year:</span>
                                <span class="detail-value">${license.vehicleYear || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Color:</span>
                                <span class="detail-value">${license.vehicleColor || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">VIN:</span>
                                <span class="detail-value">${license.vehicleVin || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        ${license.notes ? `
                        <div class="detail-section">
                            <h3>Notes</h3>
                            <div class="notes-content">${license.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="license-actions">
                        <button onclick="app.editLicense(${license.id})" class="btn-secondary">
                            <span class="material-icons">edit</span>
                            Edit License
                        </button>
                        <button onclick="app.associateCard(${license.id})" class="btn-secondary">
                            <span class="material-icons">nfc</span>
                            Associate NFC Card
                        </button>
                        <button onclick="app.readNfcCard()" class="btn-primary">
                            <span class="material-icons">visibility</span>
                            Read NFC Card
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    isExpired(dateString) {
        if (!dateString) return false;
        const expiryDate = new Date(dateString);
        const today = new Date();
        return expiryDate < today;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EVLicenseApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
    if (window.app) {
        window.app.showError('Application Error', event.error.message);
    }
});