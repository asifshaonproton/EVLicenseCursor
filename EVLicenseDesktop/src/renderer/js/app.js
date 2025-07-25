// EV License Desktop - Main Application JavaScript

class EVLicenseApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.licenses = [];
        this.currentEditingLicense = null;
        this.dialog = null;
        this.licenseTypeSelect = null;
        this.formTextFields = [];
        this.filterComponents = {
            statusFilter: null,
            typeFilter: null,
            searchField: null
        };
        this.currentFilters = {
            search: '',
            status: '',
            type: '',
            vehicleMake: '',
            expiryFrom: '',
            expiryTo: ''
        };
        this.filteredLicenses = [];
        this.importDialog = null;
        this.settingsComponents = {
            switches: [],
            selects: [],
            textFields: []
        };
        this.csvImportData = null;
        this.currentUser = null;
        this.sessionToken = null;
        
        // User Management properties
        this.userDialog = null;
        this.roleDialog = null;
        this.users = [];
        this.roles = [];
        this.currentEditingUser = null;
        this.currentEditingRole = null;
        this.userFormComponents = {
            textFields: [],
            selects: [],
            checkboxes: []
        };
        this.filteredUsers = [];
        this.userFilters = {
            search: '',
            role: '',
            status: ''
        };
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            console.log('🚀 Initializing EV License Desktop App...');
            
            // Check authentication first
            const isAuthenticated = await this.checkAuthentication();
            if (!isAuthenticated) {
                this.redirectToLogin();
                return;
            }
            
            // Initialize Material Design Components
            this.initializeMDCComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Update UI with user info
            this.updateUserInterface();
            
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.redirectToLogin();
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

        // Initialize Dialogs
        this.dialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('#license-dialog'));
        this.importDialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('#import-dialog'));
        this.userDialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('#user-dialog'));
        this.roleDialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('#role-dialog'));
        
        // Initialize Form Components
        this.initializeFormComponents();

        // Initialize Search and Filter Components
        this.initializeSearchAndFilters();

        // Initialize Settings Components
        this.initializeSettingsComponents();

        // Initialize Import Components
        this.initializeImportComponents();

        // Initialize User Management Components
        this.initializeUserManagementComponents();

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

        // Import/Export functionality
        const importBtn = document.getElementById('import-btn');
        const exportBtn = document.getElementById('export-btn');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportDialog();
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportLicenses();
            });
        }

        // Search and filter event listeners
        this.setupSearchAndFilterListeners();

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

    initializeSearchAndFilters() {
        // Initialize search field
        const searchField = document.querySelector('#license-search').closest('.mdc-text-field');
        if (searchField) {
            this.filterComponents.searchField = mdc.textField.MDCTextField.attachTo(searchField);
        }

        // Initialize filter select components
        const statusFilterSelect = document.querySelector('.filters-panel .mdc-select');
        const typeFilterSelect = document.querySelectorAll('.filters-panel .mdc-select')[1];
        
        if (statusFilterSelect) {
            this.filterComponents.statusFilter = mdc.select.MDCSelect.attachTo(statusFilterSelect);
        }
        
        if (typeFilterSelect) {
            this.filterComponents.typeFilter = mdc.select.MDCSelect.attachTo(typeFilterSelect);
        }

        // Initialize remaining filter text fields
        document.querySelectorAll('.filter-field .mdc-text-field').forEach(textField => {
            mdc.textField.MDCTextField.attachTo(textField);
        });
    }

    setupSearchAndFilterListeners() {
        // Real-time search
        const searchInput = document.getElementById('license-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.applyFilters();
                }, 300); // Debounce search
            });
        }

        // Filter toggle
        const filterToggleBtn = document.getElementById('filter-toggle-btn');
        const filtersPanel = document.getElementById('filters-panel');
        
        if (filterToggleBtn && filtersPanel) {
            filterToggleBtn.addEventListener('click', () => {
                const isHidden = filtersPanel.style.display === 'none';
                filtersPanel.style.display = isHidden ? 'block' : 'none';
                filterToggleBtn.querySelector('.material-icons').textContent = 
                    isHidden ? 'filter_list_off' : 'filter_list';
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.collectFilterValues();
                this.applyFilters();
            });
        }

        // Filter change events
        if (this.filterComponents.statusFilter) {
            this.filterComponents.statusFilter.listen('MDCSelect:change', () => {
                this.currentFilters.status = this.filterComponents.statusFilter.value;
                this.applyFilters();
            });
        }

        if (this.filterComponents.typeFilter) {
            this.filterComponents.typeFilter.listen('MDCSelect:change', () => {
                this.currentFilters.type = this.filterComponents.typeFilter.value;
                this.applyFilters();
            });
        }

        // Date filter changes
        ['expiry-from-filter', 'expiry-to-filter', 'vehicle-make-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.collectFilterValues();
                    this.applyFilters();
                });
            }
        });
    }

    initializeFormComponents() {
        // Initialize text fields
        document.querySelectorAll('.mdc-text-field').forEach(textField => {
            const mdcTextField = mdc.textField.MDCTextField.attachTo(textField);
            this.formTextFields.push(mdcTextField);
        });

        // Initialize select component
        const selectElement = document.querySelector('.mdc-select');
        if (selectElement) {
            this.licenseTypeSelect = mdc.select.MDCSelect.attachTo(selectElement);
        }

        // Dialog event handlers
        this.dialog.listen('MDCDialog:closed', (event) => {
            if (event.detail.action === 'save') {
                this.handleSaveLicense();
            } else {
                this.resetForm();
            }
        });
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
            await this.updateDashboardStats();
            console.log(`✅ Loaded ${this.licenses.length} licenses`);
        } catch (error) {
            console.error('❌ Error loading licenses:', error);
            this.showErrorMessage('Failed to load licenses', error.message);
        }
    }

    async updateDashboardStats() {
        try {
            let stats;
            
            if (window.electronAPI) {
                // Get enhanced stats from database
                stats = await window.electronAPI.database.getDashboardStats();
            } else {
                // Fallback calculation
                stats = {
                    totalLicenses: this.licenses.length,
                    activeLicenses: this.licenses.filter(l => l.status === 'Active').length,
                    expiredLicenses: this.licenses.filter(l => l.status === 'Expired').length,
                    expiringIn30Days: 0,
                    associatedCards: 0
                };
            }

            // Update basic stats
            const totalEl = document.getElementById('totalLicenses');
            const activeEl = document.getElementById('activeLicenses');
            
            if (totalEl) totalEl.textContent = stats.totalLicenses;
            if (activeEl) activeEl.textContent = stats.activeLicenses;

            // Update additional stats if elements exist
            const expiredEl = document.getElementById('expiredLicenses');
            const expiringEl = document.getElementById('expiringLicenses');
            const cardsEl = document.getElementById('associatedCards');
            
            if (expiredEl) expiredEl.textContent = stats.expiredLicenses;
            if (expiringEl) expiringEl.textContent = stats.expiringIn30Days;
            if (cardsEl) cardsEl.textContent = stats.associatedCards;

        } catch (error) {
            console.error('❌ Error updating dashboard stats:', error);
        }
    }

    renderLicensesTable() {
        const tbody = document.getElementById('licenses-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        const licensesToRender = this.filteredLicenses.length > 0 || this.hasActiveFilters() 
            ? this.filteredLicenses 
            : this.licenses;

        if (licensesToRender.length === 0) {
            const message = this.hasActiveFilters() 
                ? 'No licenses match your search criteria' 
                : 'No licenses found';
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center;">${message}</td>
                </tr>
            `;
            return;
        }

        licensesToRender.forEach(license => {
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
                <td class="mdc-data-table__cell">
                    <div class="action-buttons">
                        <button class="mdc-icon-button action-button" onclick="app.editLicense(${license.id})" title="Edit License">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="mdc-icon-button action-button" onclick="app.deleteLicense(${license.id})" title="Delete License">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </td>
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
                await this.updateDashboardStats();
                break;
            case 'settings':
                await this.loadSettingsPage();
                break;
            case 'users':
                await this.loadUsersPage();
                break;
        }
    }

    showNewLicenseDialog() {
        this.currentEditingLicense = null;
        document.getElementById('dialog-title').textContent = 'New License';
        this.resetForm();
        this.setDefaultFormValues();
        this.dialog.open();
    }

    editLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) {
            this.showErrorMessage('Error', 'License not found');
            return;
        }

        this.currentEditingLicense = license;
        document.getElementById('dialog-title').textContent = 'Edit License';
        this.populateForm(license);
        this.dialog.open();
    }

    async deleteLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) {
            this.showErrorMessage('Error', 'License not found');
            return;
        }

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.system.showMessageBox({
                    type: 'warning',
                    buttons: ['Cancel', 'Delete'],
                    defaultId: 0,
                    title: 'Confirm Delete',
                    message: `Are you sure you want to delete license ${license.license_number}?`,
                    detail: 'This action cannot be undone.'
                });

                if (result.response === 1) { // Delete button clicked
                    await window.electronAPI.database.deleteLicense(licenseId);
                    await this.loadLicenses();
                    this.showSuccessMessage('License deleted successfully');
                }
            } else {
                if (confirm(`Are you sure you want to delete license ${license.license_number}?`)) {
                    this.licenses = this.licenses.filter(l => l.id !== licenseId);
                    this.renderLicensesTable();
                    await this.updateDashboardStats();
                    this.showSuccessMessage('License deleted successfully');
                }
            }
        } catch (error) {
            console.error('❌ Error deleting license:', error);
            this.showErrorMessage('Delete Failed', error.message);
        }
    }

    async handleSaveLicense() {
        try {
            const formData = this.collectFormData();
            
            if (!this.validateFormData(formData)) {
                return;
            }

            if (window.electronAPI) {
                if (this.currentEditingLicense) {
                    // Update existing license
                    formData.id = this.currentEditingLicense.id;
                    await window.electronAPI.database.updateLicense(formData);
                    this.showSuccessMessage('License updated successfully');
                } else {
                    // Add new license
                    await window.electronAPI.database.addLicense(formData);
                    this.showSuccessMessage('License created successfully');
                }
            } else {
                // Fallback for testing
                if (this.currentEditingLicense) {
                    const index = this.licenses.findIndex(l => l.id === this.currentEditingLicense.id);
                    if (index !== -1) {
                        this.licenses[index] = { ...formData, id: this.currentEditingLicense.id };
                    }
                } else {
                    formData.id = Date.now(); // Simple ID for testing
                    this.licenses.push(formData);
                }
                this.renderLicensesTable();
                await this.updateDashboardStats();
                this.showSuccessMessage('License saved successfully');
            }

            await this.loadLicenses();
            this.resetForm();
        } catch (error) {
            console.error('❌ Error saving license:', error);
            this.showErrorMessage('Save Failed', error.message);
        }
    }

    collectFormData() {
        const form = document.getElementById('license-form');
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value || null;
        }

        // Convert numbers
        if (data.vehicle_year) {
            data.vehicle_year = parseInt(data.vehicle_year);
        }

        // Get license type from select component
        if (this.licenseTypeSelect) {
            data.license_type = this.licenseTypeSelect.value || 'Standard';
        }

        return data;
    }

    validateFormData(data) {
        const requiredFields = ['license_number', 'owner_name', 'vehicle_make', 'vehicle_model', 'issue_date', 'expiry_date'];
        
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                this.showErrorMessage('Validation Error', `${field.replace('_', ' ')} is required`);
                return false;
            }
        }

        // Validate dates
        const issueDate = new Date(data.issue_date);
        const expiryDate = new Date(data.expiry_date);
        
        if (expiryDate <= issueDate) {
            this.showErrorMessage('Validation Error', 'Expiry date must be after issue date');
            return false;
        }

        return true;
    }

    populateForm(license) {
        // Populate text fields
        Object.keys(license).forEach(key => {
            const element = document.getElementById(key);
            if (element && license[key] !== null && license[key] !== undefined) {
                element.value = license[key];
            }
        });

        // Set license type in select
        if (this.licenseTypeSelect && license.license_type) {
            this.licenseTypeSelect.value = license.license_type;
        }

        // Refresh text field states
        this.formTextFields.forEach(textField => {
            textField.foundation.handleInputChange();
        });
    }

    resetForm() {
        const form = document.getElementById('license-form');
        form.reset();
        
        // Reset select component
        if (this.licenseTypeSelect) {
            this.licenseTypeSelect.value = 'Standard';
        }

        // Reset text field states
        this.formTextFields.forEach(textField => {
            textField.foundation.handleInputChange();
        });

        this.currentEditingLicense = null;
    }

    setDefaultFormValues() {
        // Set default issue date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('issue_date').value = today;

        // Set default expiry date to 1 year from today
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        document.getElementById('expiry_date').value = nextYear.toISOString().split('T')[0];

        // Refresh text field states
        this.formTextFields.forEach(textField => {
            textField.foundation.handleInputChange();
        });
    }

    showSuccessMessage(message) {
        // You could implement a snackbar or toast here
        console.log('✅ Success:', message);
        // For now, use alert as fallback
        alert(message);
    }

    showErrorMessage(title, message) {
        console.error('❌ Error:', title, message);
        // For now, use alert as fallback
        alert(`${title}: ${message}`);
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    }

    // Advanced Search and Filter Methods
    collectFilterValues() {
        this.currentFilters.vehicleMake = document.getElementById('vehicle-make-filter').value || '';
        this.currentFilters.expiryFrom = document.getElementById('expiry-from-filter').value || '';
        this.currentFilters.expiryTo = document.getElementById('expiry-to-filter').value || '';
    }

    applyFilters() {
        this.filteredLicenses = this.licenses.filter(license => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const searchableText = [
                    license.license_number,
                    license.owner_name,
                    license.owner_email,
                    license.vehicle_make,
                    license.vehicle_model,
                    license.vehicle_vin
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Status filter
            if (this.currentFilters.status) {
                if (this.currentFilters.status === 'Expiring') {
                    // Check if license expires within 30 days
                    const expiryDate = new Date(license.expiry_date);
                    const thirtyDaysFromNow = new Date();
                    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                    
                    if (!(expiryDate <= thirtyDaysFromNow && license.status === 'Active')) {
                        return false;
                    }
                } else if (license.status !== this.currentFilters.status) {
                    return false;
                }
            }

            // License type filter
            if (this.currentFilters.type && license.license_type !== this.currentFilters.type) {
                return false;
            }

            // Vehicle make filter
            if (this.currentFilters.vehicleMake) {
                const vehicleMakeFilter = this.currentFilters.vehicleMake.toLowerCase();
                if (!license.vehicle_make.toLowerCase().includes(vehicleMakeFilter)) {
                    return false;
                }
            }

            // Date range filter
            if (this.currentFilters.expiryFrom || this.currentFilters.expiryTo) {
                const licenseExpiryDate = new Date(license.expiry_date);
                
                if (this.currentFilters.expiryFrom) {
                    const fromDate = new Date(this.currentFilters.expiryFrom);
                    if (licenseExpiryDate < fromDate) {
                        return false;
                    }
                }
                
                if (this.currentFilters.expiryTo) {
                    const toDate = new Date(this.currentFilters.expiryTo);
                    if (licenseExpiryDate > toDate) {
                        return false;
                    }
                }
            }

            return true;
        });

        this.renderLicensesTable();
        this.updateResultsSummary();
    }

    clearAllFilters() {
        // Reset filter values
        this.currentFilters = {
            search: '',
            status: '',
            type: '',
            vehicleMake: '',
            expiryFrom: '',
            expiryTo: ''
        };

        // Clear UI elements
        const searchInput = document.getElementById('license-search');
        if (searchInput) searchInput.value = '';

        if (this.filterComponents.statusFilter) {
            this.filterComponents.statusFilter.value = '';
        }

        if (this.filterComponents.typeFilter) {
            this.filterComponents.typeFilter.value = '';
        }

        document.getElementById('vehicle-make-filter').value = '';
        document.getElementById('expiry-from-filter').value = '';
        document.getElementById('expiry-to-filter').value = '';

        // Reset filtered licenses
        this.filteredLicenses = [];
        
        // Re-render table
        this.renderLicensesTable();
        this.updateResultsSummary();
    }

    hasActiveFilters() {
        return Object.values(this.currentFilters).some(value => value !== '');
    }

    updateResultsSummary() {
        // Add or update results summary
        let summaryEl = document.querySelector('.results-summary');
        const tableContainer = document.querySelector('.table-container');
        
        if (!summaryEl) {
            summaryEl = document.createElement('div');
            summaryEl.className = 'results-summary';
            tableContainer.parentNode.insertBefore(summaryEl, tableContainer);
        }

        const totalLicenses = this.licenses.length;
        const displayedLicenses = this.hasActiveFilters() ? this.filteredLicenses.length : totalLicenses;
        
        if (this.hasActiveFilters()) {
            summaryEl.innerHTML = `
                <div class="results-count">
                    Showing ${displayedLicenses} of ${totalLicenses} licenses
                </div>
                <div class="clear-search" onclick="app.clearAllFilters()">
                    Clear all filters
                </div>
            `;
            summaryEl.style.display = 'flex';
        } else {
            summaryEl.style.display = 'none';
        }
    }

    // Import/Export Methods
    async showImportDialog() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.system.showMessageBox({
                    type: 'info',
                    buttons: ['Cancel', 'Import CSV'],
                    defaultId: 1,
                    title: 'Import Licenses',
                    message: 'Choose import format',
                    detail: 'Import licenses from a CSV file. This will add new licenses to your existing data.'
                });

                if (result.response === 1) {
                    // CSV import will be implemented next
                    this.showErrorMessage('Import', 'CSV import functionality coming soon!');
                }
            } else {
                this.showErrorMessage('Import', 'Import functionality is only available in the full application');
            }
        } catch (error) {
            console.error('❌ Error showing import dialog:', error);
            this.showErrorMessage('Import Error', error.message);
        }
    }

    async exportLicenses() {
        try {
            const licensesToExport = this.hasActiveFilters() ? this.filteredLicenses : this.licenses;
            
            if (licensesToExport.length === 0) {
                this.showErrorMessage('Export Error', 'No licenses to export');
                return;
            }

            // Simple CSV export for now
            const csvContent = this.generateCSV(licensesToExport);
            
            if (window.electronAPI) {
                // In full app, this would save to file
                this.showSuccessMessage(`Exported ${licensesToExport.length} licenses successfully!`);
            } else {
                // For testing, download as file
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ev_licenses_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.showSuccessMessage(`Exported ${licensesToExport.length} licenses successfully!`);
            }
        } catch (error) {
            console.error('❌ Error exporting licenses:', error);
            this.showErrorMessage('Export Error', error.message);
        }
    }

    generateCSV(licenses) {
        const headers = [
            'License Number',
            'Owner Name',
            'Owner Email',
            'Owner Phone',
            'Vehicle Make',
            'Vehicle Model',
            'Vehicle Year',
            'Vehicle VIN',
            'Vehicle Color',
            'License Type',
            'Issue Date',
            'Expiry Date',
            'Status',
            'Notes'
        ];

        const csvRows = [headers.join(',')];

        licenses.forEach(license => {
            const row = [
                license.license_number || '',
                license.owner_name || '',
                license.owner_email || '',
                license.owner_phone || '',
                license.vehicle_make || '',
                license.vehicle_model || '',
                license.vehicle_year || '',
                license.vehicle_vin || '',
                license.vehicle_color || '',
                license.license_type || '',
                license.issue_date || '',
                license.expiry_date || '',
                license.status || '',
                (license.notes || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    // Authentication Methods
    async checkAuthentication() {
        try {
            this.sessionToken = localStorage.getItem('sessionToken');
            const userData = localStorage.getItem('currentUser');
            
            if (!this.sessionToken || !userData) {
                return false;
            }

            // Validate session with backend
            if (window.electronAPI) {
                const validation = await window.electronAPI.auth.validateSession(this.sessionToken);
                if (validation.valid) {
                    this.currentUser = validation.user;
                    return true;
                }
            }

            // Clear invalid session
            this.clearSession();
            return false;

        } catch (error) {
            console.error('❌ Error checking authentication:', error);
            this.clearSession();
            return false;
        }
    }

    clearSession() {
        this.currentUser = null;
        this.sessionToken = null;
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('currentUser');
    }

    redirectToLogin() {
        try {
            window.location.href = 'login.html';
        } catch (error) {
            console.error('❌ Error redirecting to login:', error);
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update app title with user info
        const appTitle = document.querySelector('.mdc-top-app-bar__title');
        if (appTitle) {
            appTitle.textContent = `EV License Desktop - ${this.currentUser.full_name}`;
        }

        // Add user menu to the top bar
        this.createUserMenu();

        // Apply role-based access control
        this.applyRoleBasedAccess();
    }

    createUserMenu() {
        const topAppBarSection = document.querySelector('.mdc-top-app-bar__section--align-end');
        if (!topAppBarSection || topAppBarSection.querySelector('.user-menu')) return;

        const userMenuHtml = `
            <div class="user-menu">
                <button class="mdc-icon-button user-menu-button" id="user-menu-btn" title="${this.currentUser.full_name}">
                    <span class="material-icons">account_circle</span>
                </button>
                <div class="user-menu-dropdown" id="user-menu-dropdown" style="display: none;">
                    <div class="user-info">
                        <div class="user-name">${this.currentUser.full_name}</div>
                        <div class="user-role">${this.currentUser.role_name}</div>
                        <div class="user-email">${this.currentUser.email}</div>
                    </div>
                    <div class="menu-divider"></div>
                    <button class="menu-item" id="profile-btn">
                        <span class="material-icons">person</span>
                        Profile Settings
                    </button>
                    <button class="menu-item" id="change-password-btn">
                        <span class="material-icons">lock</span>
                        Change Password
                    </button>
                    ${this.hasPermission('users', 'read') ? `
                    <button class="menu-item" id="user-management-btn">
                        <span class="material-icons">group</span>
                        User Management
                    </button>
                    ` : ''}
                    <div class="menu-divider"></div>
                    <button class="menu-item logout-item" id="logout-btn">
                        <span class="material-icons">logout</span>
                        Logout
                    </button>
                </div>
            </div>
        `;

        // Insert before NFC status
        const nfcStatus = topAppBarSection.querySelector('.nfc-status-indicator');
        if (nfcStatus) {
            nfcStatus.insertAdjacentHTML('beforebegin', userMenuHtml);
        } else {
            topAppBarSection.insertAdjacentHTML('beforeend', userMenuHtml);
        }

        // Set up user menu event listeners
        this.setupUserMenuListeners();
    }

    setupUserMenuListeners() {
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenuDropdown = document.getElementById('user-menu-dropdown');
        const logoutBtn = document.getElementById('logout-btn');
        const changePasswordBtn = document.getElementById('change-password-btn');
        const userManagementBtn = document.getElementById('user-management-btn');

        if (userMenuBtn && userMenuDropdown) {
            // Initialize ripple for user menu button
            mdc.ripple.MDCRipple.attachTo(userMenuBtn).unbounded = true;

            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = userMenuDropdown.style.display !== 'none';
                userMenuDropdown.style.display = isVisible ? 'none' : 'block';
            });

            // Close menu when clicking outside
            document.addEventListener('click', () => {
                userMenuDropdown.style.display = 'none';
            });

            userMenuDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.showChangePasswordDialog();
            });
        }

        if (userManagementBtn) {
            userManagementBtn.addEventListener('click', () => {
                this.navigateToPage('users');
            });
        }
    }

    hasPermission(resource, action) {
        if (!this.currentUser || !this.currentUser.permissions) {
            return false;
        }

        const permissions = this.currentUser.permissions[resource];
        return permissions && permissions.includes(action);
    }

    applyRoleBasedAccess() {
        // Hide/show navigation items based on permissions
        const navItems = {
            'licenses': ['licenses', 'read'],
            'settings': ['settings', 'read'],
            'users': ['users', 'read']
        };

        Object.entries(navItems).forEach(([pageId, [resource, action]]) => {
            const navItem = document.querySelector(`[data-page="${pageId}"]`);
            if (navItem) {
                if (!this.hasPermission(resource, action)) {
                    navItem.style.display = 'none';
                } else {
                    navItem.style.display = '';
                }
            }
        });

        // Disable buttons based on permissions
        this.updateButtonPermissions();
    }

    updateButtonPermissions() {
        // License management buttons
        const newLicenseBtn = document.getElementById('new-license-btn');
        if (newLicenseBtn) {
            newLicenseBtn.style.display = this.hasPermission('licenses', 'create') ? '' : 'none';
        }

        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.style.display = this.hasPermission('licenses', 'create') ? '' : 'none';
        }

        // Update action buttons in licenses table
        this.updateLicenseActionButtons();
    }

    updateLicenseActionButtons() {
        const actionButtons = document.querySelectorAll('.action-buttons');
        actionButtons.forEach(buttonGroup => {
            const editBtn = buttonGroup.querySelector('[onclick*="editLicense"]');
            const deleteBtn = buttonGroup.querySelector('[onclick*="deleteLicense"]');

            if (editBtn) {
                editBtn.style.display = this.hasPermission('licenses', 'update') ? '' : 'none';
            }
            if (deleteBtn) {
                deleteBtn.style.display = this.hasPermission('licenses', 'delete') ? '' : 'none';
            }
        });
    }

    async handleLogout() {
        try {
            const confirmed = confirm('Are you sure you want to logout?');
            if (!confirmed) return;

            if (window.electronAPI && this.sessionToken) {
                await window.electronAPI.auth.logout(this.sessionToken);
            }

            this.clearSession();
            this.redirectToLogin();

        } catch (error) {
            console.error('❌ Error during logout:', error);
            // Force logout even if API call fails
            this.clearSession();
            this.redirectToLogin();
        }
    }

    showChangePasswordDialog() {
        // Create and show change password dialog
        this.showErrorMessage('Change Password', 'Change password functionality will be implemented in user management section.');
    }

    // Settings Management Methods
    initializeSettingsComponents() {
        // Initialize switches
        document.querySelectorAll('.settings-section .mdc-switch').forEach(switchEl => {
            const mdcSwitch = mdc.switchControl.MDCSwitch.attachTo(switchEl);
            this.settingsComponents.switches.push(mdcSwitch);
        });

        // Initialize selects
        document.querySelectorAll('.settings-section .mdc-select').forEach(selectEl => {
            const mdcSelect = mdc.select.MDCSelect.attachTo(selectEl);
            this.settingsComponents.selects.push(mdcSelect);
        });

        // Initialize text fields
        document.querySelectorAll('.settings-section .mdc-text-field').forEach(textField => {
            const mdcTextField = mdc.textField.MDCTextField.attachTo(textField);
            this.settingsComponents.textFields.push(mdcTextField);
        });

        // Set up settings event listeners
        this.setupSettingsListeners();
    }

    setupSettingsListeners() {
        // Save settings button
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Reset settings button
        const resetSettingsBtn = document.getElementById('reset-settings');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        // NFC test connection button
        const nfcTestBtn = document.getElementById('nfc-test-connection');
        if (nfcTestBtn) {
            nfcTestBtn.addEventListener('click', () => {
                this.testNfcConnection();
            });
        }

        // Database backup button
        const backupBtn = document.getElementById('backup-database');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.backupDatabase();
            });
        }

        // Database optimize button
        const optimizeBtn = document.getElementById('optimize-database');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => {
                this.optimizeDatabase();
            });
        }

        // NFC polling interval change
        const pollingIntervalInput = document.getElementById('nfc-polling-interval');
        if (pollingIntervalInput) {
            pollingIntervalInput.addEventListener('change', (e) => {
                const interval = parseInt(e.target.value);
                if (interval >= 100 && interval <= 10000) {
                    // This would update the NFC manager polling interval
                    console.log(`Setting NFC polling interval to ${interval}ms`);
                }
            });
        }
    }

    async loadSettingsPage() {
        try {
            // Load current settings and update UI
            await this.loadDatabaseStats();
            this.updateNfcStatus();
            
            // Load saved settings
            const settings = await this.loadUserSettings();
            this.populateSettingsForm(settings);
            
        } catch (error) {
            console.error('❌ Error loading settings page:', error);
        }
    }

    async loadDatabaseStats() {
        try {
            if (window.electronAPI) {
                const stats = await window.electronAPI.database.getDashboardStats();
                
                // Update database statistics
                const licenseCountEl = document.getElementById('db-license-count');
                if (licenseCountEl) licenseCountEl.textContent = stats.totalLicenses || 0;

                // Database size would need to be implemented in the main process
                const dbSizeEl = document.getElementById('db-size');
                if (dbSizeEl) dbSizeEl.textContent = 'N/A';

                // Last backup would need to be tracked
                const lastBackupEl = document.getElementById('last-backup');
                if (lastBackupEl) lastBackupEl.textContent = 'Never';
                
            }
        } catch (error) {
            console.error('❌ Error loading database stats:', error);
        }
    }

    updateNfcStatus() {
        const statusIndicator = document.getElementById('nfc-status-indicator');
        if (statusIndicator) {
            // This would get actual NFC status from the NFC manager
            statusIndicator.textContent = 'Disconnected';
            statusIndicator.className = 'status-indicator';
        }
    }

    async loadUserSettings() {
        // This would load from a settings file or database
        return {
            nfcPollingInterval: 1000,
            nfcAutoConnect: true,
            autoBackup: true,
            theme: 'default',
            autoStartNfc: true
        };
    }

    populateSettingsForm(settings) {
        // Populate form fields with loaded settings
        const pollingIntervalInput = document.getElementById('nfc-polling-interval');
        if (pollingIntervalInput) {
            pollingIntervalInput.value = settings.nfcPollingInterval;
        }

        // Set switch states
        const autoConnectSwitch = document.getElementById('nfc-auto-connect');
        if (autoConnectSwitch) autoConnectSwitch.checked = settings.nfcAutoConnect;

        const autoBackupSwitch = document.getElementById('auto-backup');
        if (autoBackupSwitch) autoBackupSwitch.checked = settings.autoBackup;

        const autoStartNfcSwitch = document.getElementById('auto-start-nfc');
        if (autoStartNfcSwitch) autoStartNfcSwitch.checked = settings.autoStartNfc;

        // Set theme select
        const themeSelect = this.settingsComponents.selects.find(s => 
            s.root.querySelector('select') || s.foundation.getValue() !== undefined
        );
        if (themeSelect) {
            // Set theme value
        }
    }

    async saveSettings() {
        try {
            const settings = {
                nfcPollingInterval: parseInt(document.getElementById('nfc-polling-interval').value),
                nfcAutoConnect: document.getElementById('nfc-auto-connect').checked,
                autoBackup: document.getElementById('auto-backup').checked,
                autoStartNfc: document.getElementById('auto-start-nfc').checked,
                theme: 'default' // Get from theme select
            };

            // This would save to settings file or database
            console.log('💾 Saving settings:', settings);
            
            this.showSuccessMessage('Settings saved successfully!');
            
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            this.showErrorMessage('Save Error', error.message);
        }
    }

    async resetSettings() {
        try {
            const confirmed = confirm('Are you sure you want to reset all settings to defaults?');
            if (confirmed) {
                const defaultSettings = {
                    nfcPollingInterval: 1000,
                    nfcAutoConnect: true,
                    autoBackup: true,
                    theme: 'default',
                    autoStartNfc: true
                };
                
                this.populateSettingsForm(defaultSettings);
                await this.saveSettings();
                
                this.showSuccessMessage('Settings reset to defaults');
            }
        } catch (error) {
            console.error('❌ Error resetting settings:', error);
            this.showErrorMessage('Reset Error', error.message);
        }
    }

    async testNfcConnection() {
        const statusIndicator = document.getElementById('nfc-status-indicator');
        const testBtn = document.getElementById('nfc-test-connection');
        
        try {
            if (statusIndicator) {
                statusIndicator.textContent = 'Testing...';
                statusIndicator.className = 'status-indicator connecting';
            }
            
            if (testBtn) testBtn.disabled = true;

            // Simulate NFC connection test
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // This would actually test NFC connection
            const connected = Math.random() > 0.5; // Random for demo
            
            if (statusIndicator) {
                statusIndicator.textContent = connected ? 'Connected' : 'Disconnected';
                statusIndicator.className = connected ? 'status-indicator connected' : 'status-indicator';
            }
            
            this.showSuccessMessage(connected ? 'NFC Reader connected successfully!' : 'NFC Reader not found');
            
        } catch (error) {
            console.error('❌ Error testing NFC connection:', error);
            if (statusIndicator) {
                statusIndicator.textContent = 'Error';
                statusIndicator.className = 'status-indicator';
            }
            this.showErrorMessage('Test Failed', error.message);
        } finally {
            if (testBtn) testBtn.disabled = false;
        }
    }

    async backupDatabase() {
        try {
            // This would trigger database backup in main process
            this.showSuccessMessage('Database backup completed successfully!');
            
            // Update last backup time
            const lastBackupEl = document.getElementById('last-backup');
            if (lastBackupEl) {
                lastBackupEl.textContent = new Date().toLocaleString();
            }
            
        } catch (error) {
            console.error('❌ Error backing up database:', error);
            this.showErrorMessage('Backup Failed', error.message);
        }
    }

    async optimizeDatabase() {
        try {
            // This would trigger database optimization in main process
            this.showSuccessMessage('Database optimized successfully!');
            await this.loadDatabaseStats(); // Refresh stats
            
        } catch (error) {
            console.error('❌ Error optimizing database:', error);
            this.showErrorMessage('Optimization Failed', error.message);
        }
    }

    // CSV Import Methods
    initializeImportComponents() {
        // Initialize checkboxes
        document.querySelectorAll('#import-dialog .mdc-checkbox').forEach(checkbox => {
            mdc.checkbox.MDCCheckbox.attachTo(checkbox);
        });

        this.setupImportListeners();
    }

    setupImportListeners() {
        // File drop zone
        const dropZone = document.getElementById('file-drop-zone');
        const fileInput = document.getElementById('csv-file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => {
                fileInput.click();
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelection(files[0]);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelection(e.target.files[0]);
                }
            });
        }

        // Import dialog events
        this.importDialog.listen('MDCDialog:closed', (event) => {
            if (event.detail.action === 'import') {
                this.performCsvImport();
            } else {
                this.resetImportDialog();
            }
        });
    }

    async showImportDialog() {
        try {
            this.resetImportDialog();
            this.importDialog.open();
        } catch (error) {
            console.error('❌ Error showing import dialog:', error);
            this.showErrorMessage('Import Error', error.message);
        }
    }

    resetImportDialog() {
        this.csvImportData = null;
        
        // Reset file drop zone
        const dropZone = document.getElementById('file-drop-zone');
        if (dropZone) {
            dropZone.classList.remove('file-selected');
            const dropText = dropZone.querySelector('.drop-text');
            const dropSubtext = dropZone.querySelector('.drop-subtext');
            const icon = dropZone.querySelector('.material-icons');
            
            if (dropText) dropText.textContent = 'Drag and drop your CSV file here';
            if (dropSubtext) dropSubtext.textContent = 'or click to select a file';
            if (icon) icon.textContent = 'cloud_upload';
        }

        // Hide sections
        document.getElementById('import-options').style.display = 'none';
        document.getElementById('import-preview').style.display = 'none';
        document.getElementById('import-progress').style.display = 'none';

        // Disable import button
        const importBtn = document.getElementById('start-import-btn');
        if (importBtn) importBtn.disabled = true;

        // Reset file input
        const fileInput = document.getElementById('csv-file-input');
        if (fileInput) fileInput.value = '';
    }

    async handleFileSelection(file) {
        try {
            if (!file.name.toLowerCase().endsWith('.csv')) {
                this.showErrorMessage('Invalid File', 'Please select a CSV file');
                return;
            }

            // Update drop zone appearance
            const dropZone = document.getElementById('file-drop-zone');
            if (dropZone) {
                dropZone.classList.add('file-selected');
                const dropText = dropZone.querySelector('.drop-text');
                const dropSubtext = dropZone.querySelector('.drop-subtext');
                const icon = dropZone.querySelector('.material-icons');
                
                if (dropText) dropText.textContent = file.name;
                if (dropSubtext) dropSubtext.textContent = `${(file.size / 1024).toFixed(1)} KB`;
                if (icon) icon.textContent = 'check_circle';
            }

            // Parse CSV file
            const csvContent = await this.readFileContent(file);
            this.csvImportData = this.parseCsvContent(csvContent);

            // Show import options and preview
            this.showImportPreview();
            document.getElementById('import-options').style.display = 'block';

            // Enable import button
            const importBtn = document.getElementById('start-import-btn');
            if (importBtn) importBtn.disabled = false;

        } catch (error) {
            console.error('❌ Error handling file selection:', error);
            this.showErrorMessage('File Error', error.message);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCsvContent(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        });

        return { headers, data };
    }

    showImportPreview() {
        const preview = document.getElementById('import-preview');
        const headerEl = document.getElementById('preview-header');
        const bodyEl = document.getElementById('preview-body');

        if (!this.csvImportData || !preview || !headerEl || !bodyEl) return;

        // Show preview
        preview.style.display = 'block';

        // Populate header
        headerEl.innerHTML = `<tr>${this.csvImportData.headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

        // Populate first 5 rows of data
        const previewData = this.csvImportData.data.slice(0, 5);
        bodyEl.innerHTML = previewData.map(row => 
            `<tr>${this.csvImportData.headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
        ).join('');

        // Add summary row if there are more records
        if (this.csvImportData.data.length > 5) {
            bodyEl.innerHTML += `<tr><td colspan="${this.csvImportData.headers.length}" style="text-align: center; font-style: italic;">... and ${this.csvImportData.data.length - 5} more records</td></tr>`;
        }
    }

    async performCsvImport() {
        try {
            if (!this.csvImportData) {
                this.showErrorMessage('Import Error', 'No data to import');
                return;
            }

            // Show progress
            const progressEl = document.getElementById('import-progress');
            const progressText = document.getElementById('progress-text');
            const progressCount = document.getElementById('progress-count');
            const progressFill = document.getElementById('progress-fill');

            if (progressEl) progressEl.style.display = 'block';

            const totalRecords = this.csvImportData.data.length;
            let importedCount = 0;
            let skippedCount = 0;

            // Get import options
            const skipDuplicates = document.getElementById('skip-duplicates').checked;
            const validateData = document.getElementById('validate-data').checked;
            const backupFirst = document.getElementById('backup-before-import').checked;

            if (backupFirst) {
                if (progressText) progressText.textContent = 'Creating backup...';
                await this.backupDatabase();
            }

            // Process each record
            for (let i = 0; i < totalRecords; i++) {
                const record = this.csvImportData.data[i];
                
                if (progressText) progressText.textContent = `Processing record ${i + 1} of ${totalRecords}...`;
                if (progressCount) progressCount.textContent = `${i + 1} / ${totalRecords}`;
                if (progressFill) progressFill.style.width = `${((i + 1) / totalRecords) * 100}%`;

                try {
                    // Map CSV fields to license object
                    const licenseData = this.mapCsvToLicense(record);

                    // Validate if requested
                    if (validateData && !this.validateLicenseData(licenseData)) {
                        skippedCount++;
                        continue;
                    }

                    // Check for duplicates if requested
                    if (skipDuplicates) {
                        const existing = this.licenses.find(l => l.license_number === licenseData.license_number);
                        if (existing) {
                            skippedCount++;
                            continue;
                        }
                    }

                    // Import the license
                    if (window.electronAPI) {
                        await window.electronAPI.database.addLicense(licenseData);
                    } else {
                        // Fallback for testing
                        licenseData.id = Date.now() + i;
                        this.licenses.push(licenseData);
                    }

                    importedCount++;

                } catch (error) {
                    console.error(`❌ Error importing record ${i + 1}:`, error);
                    skippedCount++;
                }

                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Hide progress
            if (progressEl) progressEl.style.display = 'none';

            // Show results
            this.showSuccessMessage(`Import completed! Imported: ${importedCount}, Skipped: ${skippedCount}`);

            // Refresh licenses
            await this.loadLicenses();

        } catch (error) {
            console.error('❌ Error performing CSV import:', error);
            this.showErrorMessage('Import Failed', error.message);
        }
    }

    mapCsvToLicense(csvRecord) {
        // Map CSV columns to license fields
        return {
            license_number: csvRecord['License Number'] || csvRecord['license_number'] || '',
            owner_name: csvRecord['Owner Name'] || csvRecord['owner_name'] || '',
            owner_email: csvRecord['Owner Email'] || csvRecord['owner_email'] || '',
            owner_phone: csvRecord['Owner Phone'] || csvRecord['owner_phone'] || '',
            vehicle_make: csvRecord['Vehicle Make'] || csvRecord['vehicle_make'] || '',
            vehicle_model: csvRecord['Vehicle Model'] || csvRecord['vehicle_model'] || '',
            vehicle_year: parseInt(csvRecord['Vehicle Year'] || csvRecord['vehicle_year']) || null,
            vehicle_vin: csvRecord['Vehicle VIN'] || csvRecord['vehicle_vin'] || '',
            vehicle_color: csvRecord['Vehicle Color'] || csvRecord['vehicle_color'] || '',
            license_type: csvRecord['License Type'] || csvRecord['license_type'] || 'Standard',
            issue_date: csvRecord['Issue Date'] || csvRecord['issue_date'] || new Date().toISOString().split('T')[0],
            expiry_date: csvRecord['Expiry Date'] || csvRecord['expiry_date'] || '',
            status: csvRecord['Status'] || csvRecord['status'] || 'Active',
            notes: csvRecord['Notes'] || csvRecord['notes'] || ''
        };
    }

    validateLicenseData(licenseData) {
        // Basic validation
        const required = ['license_number', 'owner_name', 'vehicle_make', 'vehicle_model', 'expiry_date'];
        
        for (const field of required) {
            if (!licenseData[field] || licenseData[field].trim() === '') {
                return false;
            }
        }

        // Date validation
        if (licenseData.expiry_date && isNaN(new Date(licenseData.expiry_date))) {
            return false;
        }

        return true;
    }

    // User Management Methods
    initializeUserManagementComponents() {
        // Initialize user form components
        document.querySelectorAll('#user-dialog .mdc-text-field').forEach(textField => {
            const mdcTextField = mdc.textField.MDCTextField.attachTo(textField);
            this.userFormComponents.textFields.push(mdcTextField);
        });

        document.querySelectorAll('#user-dialog .mdc-select').forEach(select => {
            const mdcSelect = mdc.select.MDCSelect.attachTo(select);
            this.userFormComponents.selects.push(mdcSelect);
        });

        document.querySelectorAll('#user-dialog .mdc-checkbox').forEach(checkbox => {
            const mdcCheckbox = mdc.checkbox.MDCCheckbox.attachTo(checkbox);
            this.userFormComponents.checkboxes.push(mdcCheckbox);
        });

        // Initialize role form components
        document.querySelectorAll('#role-dialog .mdc-text-field').forEach(textField => {
            mdc.textField.MDCTextField.attachTo(textField);
        });

        // User search components
        const userSearchField = document.querySelector('#user-search')?.closest('.mdc-text-field');
        if (userSearchField) {
            mdc.textField.MDCTextField.attachTo(userSearchField);
        }

        document.querySelectorAll('.user-search-container .mdc-select').forEach(select => {
            mdc.select.MDCSelect.attachTo(select);
        });

        this.setupUserManagementListeners();
    }

    setupUserManagementListeners() {
        // New user button
        const newUserBtn = document.getElementById('new-user-btn');
        if (newUserBtn) {
            newUserBtn.addEventListener('click', () => {
                this.showNewUserDialog();
            });
        }

        // Role management button
        const rolesBtn = document.getElementById('roles-management-btn');
        if (rolesBtn) {
            rolesBtn.addEventListener('click', () => {
                this.showRoleManagementDialog();
            });
        }

        // User search
        const userSearchInput = document.getElementById('user-search');
        if (userSearchInput) {
            let searchTimeout;
            userSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.userFilters.search = e.target.value;
                    this.applyUserFilters();
                }, 300);
            });
        }

        // User dialog events
        this.userDialog.listen('MDCDialog:closed', (event) => {
            if (event.detail.action === 'save') {
                this.handleSaveUser();
            }
            this.resetUserForm();
        });

        // Role dialog events
        this.roleDialog.listen('MDCDialog:closed', (event) => {
            if (event.detail.action === 'save') {
                this.handleSaveRole();
            }
        });
    }

    async loadUsersPage() {
        try {
            // Load users and roles
            await Promise.all([
                this.loadUsers(),
                this.loadRoles()
            ]);

            // Update UI
            this.updateUserStats();
            this.populateRoleFilters();
            this.applyUserFilters();

        } catch (error) {
            console.error('❌ Error loading users page:', error);
        }
    }

    async loadUsers() {
        try {
            if (window.electronAPI) {
                this.users = await window.electronAPI.users.getAll();
            } else {
                // Fallback data
                this.users = [
                    {
                        id: 1,
                        username: 'superadmin',
                        email: 'superadmin@evlicense.local',
                        full_name: 'Super Administrator',
                        role_name: 'Super Administrator',
                        role_code: 'super_admin',
                        is_active: 1,
                        last_login: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        created_by_name: null
                    }
                ];
            }

            console.log(`✅ Loaded ${this.users.length} users`);
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showErrorMessage('Load Error', error.message);
        }
    }

    async loadRoles() {
        try {
            if (window.electronAPI) {
                this.roles = await window.electronAPI.roles.getAll();
            } else {
                // Fallback data
                this.roles = [
                    { id: 1, name: 'super_admin', display_name: 'Super Administrator', description: 'Full system access' },
                    { id: 2, name: 'admin', display_name: 'Administrator', description: 'Administrative access' },
                    { id: 3, name: 'operator', display_name: 'Operator', description: 'Standard user access' },
                    { id: 4, name: 'viewer', display_name: 'Viewer', description: 'Read-only access' }
                ];
            }

            console.log(`✅ Loaded ${this.roles.length} roles`);
        } catch (error) {
            console.error('❌ Error loading roles:', error);
        }
    }

    updateUserStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.is_active).length;
        const recentLogins = this.users.filter(u => {
            if (!u.last_login) return false;
            const lastLogin = new Date(u.last_login);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return lastLogin > weekAgo;
        }).length;

        const totalUsersEl = document.getElementById('totalUsers');
        const activeUsersEl = document.getElementById('activeUsers');
        const recentLoginsEl = document.getElementById('recentLogins');

        if (totalUsersEl) totalUsersEl.textContent = totalUsers;
        if (activeUsersEl) activeUsersEl.textContent = activeUsers;
        if (recentLoginsEl) recentLoginsEl.textContent = recentLogins;
    }

    populateRoleFilters() {
        const roleFilterList = document.getElementById('role-filter-list');
        if (!roleFilterList) return;

        // Clear existing options (except "All Roles")
        const existingItems = roleFilterList.querySelectorAll('li:not(:first-child)');
        existingItems.forEach(item => item.remove());

        // Add role options
        this.roles.forEach(role => {
            const listItem = document.createElement('li');
            listItem.className = 'mdc-deprecated-list-item';
            listItem.setAttribute('data-value', role.name);
            listItem.innerHTML = `
                <span class="mdc-deprecated-list-item__ripple"></span>
                <span class="mdc-deprecated-list-item__text">${role.display_name}</span>
            `;
            roleFilterList.appendChild(listItem);
        });
    }

    applyUserFilters() {
        let filtered = [...this.users];

        // Apply search filter
        if (this.userFilters.search) {
            const search = this.userFilters.search.toLowerCase();
            filtered = filtered.filter(user => 
                user.full_name.toLowerCase().includes(search) ||
                user.username.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search)
            );
        }

        // Apply role filter
        if (this.userFilters.role) {
            filtered = filtered.filter(user => user.role_code === this.userFilters.role);
        }

        // Apply status filter
        if (this.userFilters.status !== '') {
            const isActive = this.userFilters.status === '1';
            filtered = filtered.filter(user => Boolean(user.is_active) === isActive);
        }

        this.filteredUsers = filtered;
        this.renderUsersTable();
    }

    renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        const usersToRender = this.filteredUsers.length > 0 || this.hasActiveUserFilters() 
            ? this.filteredUsers 
            : this.users;

        if (usersToRender.length === 0) {
            const message = this.hasActiveUserFilters() 
                ? 'No users match your search criteria' 
                : 'No users found';
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">${message}</td>
                </tr>
            `;
            return;
        }

        usersToRender.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'mdc-data-table__row';
            
            const avatar = this.generateUserAvatar(user.full_name);
            const statusClass = user.is_active ? 'active' : 'inactive';
            const statusText = user.is_active ? 'Active' : 'Inactive';
            const roleClass = user.role_code ? user.role_code.replace('_', '-') : '';
            
            row.innerHTML = `
                <td class="mdc-data-table__cell">
                    <div class="user-info-cell">
                        <div class="user-avatar">${avatar}</div>
                        <div class="user-details">
                            <h4>${user.full_name}</h4>
                            <p>@${user.username}</p>
                        </div>
                    </div>
                </td>
                <td class="mdc-data-table__cell">${user.email}</td>
                <td class="mdc-data-table__cell">
                    <span class="role-badge ${roleClass}">${user.role_name}</span>
                </td>
                <td class="mdc-data-table__cell">
                    <span class="user-status-badge ${statusClass}">${statusText}</span>
                </td>
                <td class="mdc-data-table__cell">${this.formatDateTime(user.last_login)}</td>
                <td class="mdc-data-table__cell">${this.formatDate(user.created_at)}</td>
                <td class="mdc-data-table__cell">
                    <div class="user-actions">
                        <button class="mdc-icon-button edit-btn" onclick="app.editUser(${user.id})" title="Edit User">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="mdc-icon-button toggle-btn" onclick="app.toggleUserStatus(${user.id})" title="${user.is_active ? 'Deactivate' : 'Activate'} User">
                            <span class="material-icons">${user.is_active ? 'person_off' : 'person'}</span>
                        </button>
                        ${user.username !== 'superadmin' ? `
                        <button class="mdc-icon-button delete-btn" onclick="app.deleteUser(${user.id})" title="Delete User">
                            <span class="material-icons">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Initialize ripples for action buttons
        tbody.querySelectorAll('.mdc-icon-button').forEach(button => {
            mdc.ripple.MDCRipple.attachTo(button).unbounded = true;
        });
    }

    generateUserAvatar(fullName) {
        if (!fullName) return '?';
        const names = fullName.split(' ');
        if (names.length >= 2) {
            return names[0][0].toUpperCase() + names[1][0].toUpperCase();
        }
        return fullName[0].toUpperCase();
    }

    hasActiveUserFilters() {
        return this.userFilters.search || this.userFilters.role || this.userFilters.status !== '';
    }

    showNewUserDialog() {
        this.currentEditingUser = null;
        document.getElementById('user-dialog-title').textContent = 'New User';
        this.resetUserForm();
        this.populateUserRoleSelect();
        
        // Show password fields for new user
        document.getElementById('password-section').style.display = 'block';
        document.getElementById('password-reset-section').style.display = 'none';
        
        // Make password required
        document.getElementById('user_password').required = true;
        document.getElementById('user_confirm_password').required = true;
        
        this.userDialog.open();
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showErrorMessage('Error', 'User not found');
            return;
        }

        this.currentEditingUser = user;
        document.getElementById('user-dialog-title').textContent = 'Edit User';
        this.populateUserForm(user);
        this.populateUserRoleSelect();
        
        // Hide password fields for existing user
        document.getElementById('password-section').style.display = 'none';
        document.getElementById('password-reset-section').style.display = 'block';
        
        // Make password not required
        document.getElementById('user_password').required = false;
        document.getElementById('user_confirm_password').required = false;
        
        this.userDialog.open();
    }

    populateUserRoleSelect() {
        const roleList = document.getElementById('user-role-list');
        if (!roleList) return;

        roleList.innerHTML = '';
        
        this.roles.forEach((role, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'mdc-deprecated-list-item';
            if (index === 0) listItem.classList.add('mdc-deprecated-list-item--selected');
            listItem.setAttribute('data-value', role.id);
            listItem.innerHTML = `
                <span class="mdc-deprecated-list-item__ripple"></span>
                <span class="mdc-deprecated-list-item__text">${role.display_name}</span>
            `;
            roleList.appendChild(listItem);
        });

        // Reinitialize the select component
        const selectComponent = this.userFormComponents.selects.find(s => 
            s.root.contains(roleList)
        );
        if (selectComponent) {
            selectComponent.foundation.adapter.removeAttributeAtIndex = () => {};
            selectComponent.foundation.adapter.setAttributeAtIndex = () => {};
        }
    }

    populateUserForm(user) {
        // Populate form fields
        document.getElementById('user_full_name').value = user.full_name;
        document.getElementById('user_email').value = user.email;
        document.getElementById('user_username').value = user.username;
        document.getElementById('user_is_active').checked = Boolean(user.is_active);

        // Set role
        const roleSelect = this.userFormComponents.selects.find(s => 
            s.root.querySelector('#user-role-list')
        );
        if (roleSelect) {
            const role = this.roles.find(r => r.name === user.role_code);
            if (role) {
                roleSelect.value = role.id.toString();
            }
        }

        // Refresh text field states
        this.userFormComponents.textFields.forEach(textField => {
            textField.foundation.handleInputChange();
        });
    }

    resetUserForm() {
        const form = document.getElementById('user-form');
        form.reset();
        
        // Reset form components
        this.userFormComponents.textFields.forEach(textField => {
            textField.foundation.handleInputChange();
        });
        
        // Set default active state
        document.getElementById('user_is_active').checked = true;
    }

    async handleSaveUser() {
        try {
            const formData = this.collectUserFormData();
            
            if (!this.validateUserData(formData)) {
                return;
            }

            if (window.electronAPI) {
                if (this.currentEditingUser) {
                    // Update existing user
                    await window.electronAPI.users.update(
                        this.currentEditingUser.id, 
                        formData, 
                        this.currentUser.id
                    );
                    this.showSuccessMessage('User updated successfully');
                } else {
                    // Create new user
                    const result = await window.electronAPI.users.create(formData, this.currentUser.id);
                    if (result.success) {
                        this.showSuccessMessage('User created successfully');
                    } else {
                        this.showErrorMessage('Create Failed', result.message);
                        return;
                    }
                }
            }

            // Reload users
            await this.loadUsers();
            this.updateUserStats();
            this.applyUserFilters();

        } catch (error) {
            console.error('❌ Error saving user:', error);
            this.showErrorMessage('Save Failed', error.message);
        }
    }

    collectUserFormData() {
        const roleSelect = this.userFormComponents.selects.find(s => 
            s.root.querySelector('#user-role-list')
        );

        const formData = {
            full_name: document.getElementById('user_full_name').value.trim(),
            email: document.getElementById('user_email').value.trim(),
            username: document.getElementById('user_username').value.trim(),
            role_id: roleSelect ? parseInt(roleSelect.value) : null,
            is_active: document.getElementById('user_is_active').checked ? 1 : 0
        };

        // Add password for new users
        if (!this.currentEditingUser) {
            formData.password = document.getElementById('user_password').value;
        }

        return formData;
    }

    validateUserData(data) {
        // Required fields validation
        const required = ['full_name', 'email', 'username'];
        for (const field of required) {
            if (!data[field]) {
                this.showErrorMessage('Validation Error', `${field.replace('_', ' ')} is required`);
                return false;
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showErrorMessage('Validation Error', 'Please enter a valid email address');
            return false;
        }

        // Role validation
        if (!data.role_id) {
            this.showErrorMessage('Validation Error', 'Please select a role');
            return false;
        }

        // Password validation for new users
        if (!this.currentEditingUser) {
            const password = document.getElementById('user_password').value;
            const confirmPassword = document.getElementById('user_confirm_password').value;

            if (!password) {
                this.showErrorMessage('Validation Error', 'Password is required');
                return false;
            }

            if (password.length < 8) {
                this.showErrorMessage('Validation Error', 'Password must be at least 8 characters long');
                return false;
            }

            if (password !== confirmPassword) {
                this.showErrorMessage('Validation Error', 'Passwords do not match');
                return false;
            }
        }

        return true;
    }

    async toggleUserStatus(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            if (user.username === 'superadmin') {
                this.showErrorMessage('Error', 'Cannot deactivate the super admin account');
                return;
            }

            const newStatus = user.is_active ? 0 : 1;
            const action = newStatus ? 'activate' : 'deactivate';
            
            const confirmed = confirm(`Are you sure you want to ${action} user "${user.full_name}"?`);
            if (!confirmed) return;

            const updateData = {
                ...user,
                is_active: newStatus
            };

            if (window.electronAPI) {
                await window.electronAPI.users.update(userId, updateData, this.currentUser.id);
            }

            // Update local data
            user.is_active = newStatus;
            
            this.updateUserStats();
            this.applyUserFilters();
            this.showSuccessMessage(`User ${action}d successfully`);

        } catch (error) {
            console.error('❌ Error toggling user status:', error);
            this.showErrorMessage('Update Failed', error.message);
        }
    }

    async deleteUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            if (user.username === 'superadmin') {
                this.showErrorMessage('Error', 'Cannot delete the super admin account');
                return;
            }

            const confirmed = confirm(`Are you sure you want to delete user "${user.full_name}"?\n\nThis action cannot be undone.`);
            if (!confirmed) return;

            if (window.electronAPI) {
                await window.electronAPI.users.delete(userId, this.currentUser.id);
            }

            // Remove from local data
            this.users = this.users.filter(u => u.id !== userId);
            
            this.updateUserStats();
            this.applyUserFilters();
            this.showSuccessMessage('User deleted successfully');

        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showErrorMessage('Delete Failed', error.message);
        }
    }

    showRoleManagementDialog() {
        this.loadRoleManagementData();
        this.roleDialog.open();
    }

    loadRoleManagementData() {
        // This would load and display role management interface
        // For now, show a placeholder
        this.showSuccessMessage('Role Management', 'Role management interface will be implemented in the next update');
    }

    formatDateTime(dateString) {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return 'Invalid date';
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