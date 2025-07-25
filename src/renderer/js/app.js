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
            this.showNewLicenseDialog();
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

        // Menu event listeners
        window.electronAPI.menu.onNewLicense(() => {
            this.showNewLicenseDialog();
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
        // NFC device events
        window.electronAPI.nfc.onDeviceConnected((deviceInfo) => {
            this.nfcStatus.connected = true;
            this.nfcStatus.deviceInfo = deviceInfo;
            this.updateNfcStatus();
            this.showNotification('NFC device connected', `${deviceInfo.device.product} is ready`, 'success');
        });

        window.electronAPI.nfc.onDeviceDisconnected((info) => {
            this.nfcStatus.connected = false;
            this.nfcStatus.deviceInfo = null;
            this.updateNfcStatus();
            this.showNotification('NFC device disconnected', 'Please check your ACR122U connection', 'warning');
        });

        window.electronAPI.nfc.onCardDetected((cardData) => {
            this.handleCardDetected(cardData);
        });

        window.electronAPI.nfc.onError((error) => {
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
                associatedCards: this.licenses.filter(l => l.card_uid).length,
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
                    <td colspan="7" class="text-center">No licenses found</td>
                </tr>
            `;
            return;
        }

        this.licenses.forEach(license => {
            const row = document.createElement('tr');
            row.className = 'mdc-data-table__row';
            row.innerHTML = `
                <td class="mdc-data-table__cell">${license.license_number}</td>
                <td class="mdc-data-table__cell">${license.owner_name}</td>
                <td class="mdc-data-table__cell">${license.vehicle_make} ${license.vehicle_model} (${license.vehicle_year || 'N/A'})</td>
                <td class="mdc-data-table__cell">
                    <span class="status-badge ${license.status.toLowerCase()}">${license.status}</span>
                </td>
                <td class="mdc-data-table__cell">${this.formatDate(license.expiry_date)}</td>
                <td class="mdc-data-table__cell">${license.card_uid || 'Not associated'}</td>
                <td class="mdc-data-table__cell">
                    <div class="action-buttons">
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

            if (status.activeDevice) {
                indicator.className = 'nfc-status-indicator connected';
                indicator.querySelector('.status-text').textContent = status.activeDevice.product;
                
                deviceInfo.innerHTML = `
                    <div class="device-status">
                        <span class="status-indicator online"></span>
                        <span class="status-text">${status.activeDevice.product} connected</span>
                    </div>
                `;
            } else {
                indicator.className = 'nfc-status-indicator';
                indicator.querySelector('.status-text').textContent = 'No Device';
                
                deviceInfo.innerHTML = `
                    <div class="device-status">
                        <span class="status-indicator offline"></span>
                        <span class="status-text">No ACR122U device detected</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error updating NFC status:', error);
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

        // Show write dialog (simplified for now)
        const data = prompt('Enter data to write to card:');
        if (!data) return;

        try {
            this.showLoading(true, 'Writing to NFC card...');
            const result = await window.electronAPI.nfc.writeCard(data);
            
            this.showNotification('Card Write', 'Data written to NFC card successfully', 'success');
        } catch (error) {
            console.error('❌ Error writing card:', error);
            this.showError('Write Error', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displayCardData(cardData) {
        const section = document.getElementById('cardDataSection');
        const container = document.getElementById('cardData');
        
        container.innerHTML = `
            <strong>Card UID:</strong> ${cardData.uid}<br>
            <strong>Card Type:</strong> ${cardData.type}<br>
            <strong>Detected:</strong> ${this.formatDateTime(cardData.timestamp)}<br>
            <strong>Data (Hex):</strong> ${cardData.dataHex || 'No data available'}
        `;
        
        section.style.display = 'block';
    }

    handleCardDetected(cardData) {
        console.log('📱 Card detected:', cardData);
        this.showNotification('Card Detected', `Card UID: ${cardData.uid}`, 'info');
        
        // Auto-navigate to NFC page if not already there
        if (this.currentPage !== 'nfc') {
            this.navigateToPage('nfc');
        }
        
        this.displayCardData(cardData);
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
        // Simplified for now - in a full implementation, this would show a proper dialog
        alert('New License dialog would open here. This will be implemented in the next phase.');
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
            const expiryDate = new Date(license.expiry_date);
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
        alert('Edit license dialog would open here.');
    }

    deleteLicense(licenseId) {
        console.log('🗑️ Delete license:', licenseId);
        if (confirm('Are you sure you want to delete this license?')) {
            // Implementation would go here
            alert('License deletion would be implemented here.');
        }
    }

    associateCard(licenseId) {
        console.log('🔗 Associate card with license:', licenseId);
        alert('Card association dialog would open here.');
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