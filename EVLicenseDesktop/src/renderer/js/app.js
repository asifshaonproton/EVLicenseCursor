// EV License Desktop - Main Application JavaScript

class EVLicenseApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.licenses = [];
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
            
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
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

        // License management
        const newLicenseBtn = document.getElementById('new-license-btn');
        if (newLicenseBtn) {
            newLicenseBtn.addEventListener('click', () => {
                this.showNewLicenseDialog();
            });
        }

        // Menu event listeners
        if (window.electronAPI) {
            window.electronAPI.menu.onNewLicense(() => {
                this.showNewLicenseDialog();
            });

            window.electronAPI.menu.onAbout(() => {
                this.navigateToPage('about');
            });
        }

        console.log('✅ Event listeners set up');
    }

    async loadInitialData() {
        try {
            // Load app version
            if (window.electronAPI) {
                const version = await window.electronAPI.system.getVersion();
                const versionEl = document.getElementById('appVersion');
                if (versionEl) {
                    versionEl.textContent = version;
                }
            }

            // Load licenses
            await this.loadLicenses();

            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
        }
    }

    async loadLicenses() {
        try {
            if (window.electronAPI) {
                this.licenses = await window.electronAPI.database.getLicenses();
            } else {
                // Fallback data for testing
                this.licenses = [
                    {
                        id: 1,
                        license_number: 'EV001-2024',
                        owner_name: 'John Smith',
                        vehicle_make: 'Tesla',
                        vehicle_model: 'Model 3',
                        vehicle_year: 2023,
                        status: 'Active',
                        expiry_date: '2025-01-15'
                    },
                    {
                        id: 2,
                        license_number: 'EV002-2024',
                        owner_name: 'Sarah Johnson',
                        vehicle_make: 'Nissan',
                        vehicle_model: 'Leaf',
                        vehicle_year: 2022,
                        status: 'Active',
                        expiry_date: '2025-02-01'
                    }
                ];
            }
            
            this.renderLicensesTable();
            this.updateDashboardStats();
            console.log(`✅ Loaded ${this.licenses.length} licenses`);
        } catch (error) {
            console.error('❌ Error loading licenses:', error);
        }
    }

    updateDashboardStats() {
        const stats = {
            totalLicenses: this.licenses.length,
            activeLicenses: this.licenses.filter(l => l.status === 'Active').length
        };

        const totalEl = document.getElementById('totalLicenses');
        const activeEl = document.getElementById('activeLicenses');
        
        if (totalEl) totalEl.textContent = stats.totalLicenses;
        if (activeEl) activeEl.textContent = stats.activeLicenses;
    }

    renderLicensesTable() {
        const tbody = document.getElementById('licenses-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.licenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center;">No licenses found</td>
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
            `;
            tbody.appendChild(row);
        });
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
        if (this.drawer && this.drawer.open) {
            this.drawer.open = false;
        }

        // Load page-specific data
        this.loadPageData(pageId);
    }

    async loadPageData(pageId) {
        switch (pageId) {
            case 'licenses':
                await this.loadLicenses();
                break;
            case 'dashboard':
                this.updateDashboardStats();
                break;
        }
    }

    showNewLicenseDialog() {
        alert('New License dialog would open here. This will be implemented in the next phase.');
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EVLicenseApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
});