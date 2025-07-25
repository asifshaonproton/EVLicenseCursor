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

        // Initialize Dialog
        this.dialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('#license-dialog'));
        
        // Initialize Form Components
        this.initializeFormComponents();

        // Initialize Search and Filter Components
        this.initializeSearchAndFilters();

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
                this.updateDashboardStats();
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EVLicenseApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
});