// EV License Desktop - Login JavaScript

class LoginManager {
    constructor() {
        this.isLoggingIn = false;
        this.textFields = [];
        this.initializeLogin();
    }

    async initializeLogin() {
        try {
            console.log('🔐 Initializing login system...');
            
            // Initialize Material Design Components
            this.initializeMDCComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load app version
            await this.loadAppVersion();
            
            // Check for existing session
            await this.checkExistingSession();
            
            console.log('✅ Login system initialized');
        } catch (error) {
            console.error('❌ Error initializing login:', error);
        }
    }

    initializeMDCComponents() {
        // Initialize text fields
        document.querySelectorAll('.mdc-text-field').forEach(textField => {
            const mdcTextField = mdc.textField.MDCTextField.attachTo(textField);
            this.textFields.push(mdcTextField);
        });

        // Initialize buttons
        document.querySelectorAll('.mdc-button').forEach(button => {
            mdc.ripple.MDCRipple.attachTo(button);
        });

        // Initialize checkbox
        const checkbox = document.querySelector('.mdc-checkbox');
        if (checkbox) {
            mdc.checkbox.MDCCheckbox.attachTo(checkbox);
        }

        console.log('✅ MDC components initialized');
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Enter key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isLoggingIn) {
                this.handleLogin();
            }
        });

        // Input validation
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (usernameInput && passwordInput) {
            [usernameInput, passwordInput].forEach(input => {
                input.addEventListener('input', () => {
                    this.clearError();
                    this.validateForm();
                });
            });
        }

        console.log('✅ Event listeners set up');
    }

    async loadAppVersion() {
        try {
            if (window.electronAPI) {
                const version = await window.electronAPI.system.getVersion();
                const versionEl = document.getElementById('version-info');
                if (versionEl) {
                    versionEl.textContent = `v${version}`;
                }
            }
        } catch (error) {
            console.error('❌ Error loading app version:', error);
        }
    }

    async checkExistingSession() {
        try {
            const sessionToken = localStorage.getItem('sessionToken');
            if (sessionToken && window.electronAPI) {
                const validation = await window.electronAPI.auth.validateSession(sessionToken);
                if (validation.valid) {
                    console.log('✅ Valid session found, redirecting to main app...');
                    this.redirectToMainApp(validation.user, sessionToken);
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Error checking existing session:', error);
        }
        
        // Clear invalid session
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('currentUser');
    }

    validateForm() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginButton = document.getElementById('login-button');

        const isValid = username.length > 0 && password.length > 0;
        
        if (loginButton) {
            loginButton.disabled = !isValid || this.isLoggingIn;
        }

        return isValid;
    }

    async handleLogin() {
        if (this.isLoggingIn || !this.validateForm()) {
            return;
        }

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        try {
            this.showLoading(true);
            this.clearError();

            if (!window.electronAPI) {
                throw new Error('Authentication service not available');
            }

            console.log('🔐 Attempting login...');
            const result = await window.electronAPI.auth.login(username, password);

            if (result.success) {
                console.log('✅ Login successful');
                
                // Store session
                localStorage.setItem('sessionToken', result.sessionToken);
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                
                if (rememberMe) {
                    localStorage.setItem('rememberUsername', username);
                } else {
                    localStorage.removeItem('rememberUsername');
                }

                // Show success and redirect
                this.showSuccess('Login successful! Redirecting...');
                
                setTimeout(() => {
                    this.redirectToMainApp(result.user, result.sessionToken);
                }, 1000);

            } else {
                this.showError(result.message || 'Login failed. Please try again.');
                this.focusPasswordField();
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('Connection failed. Please check your internet connection.');
        } finally {
            this.showLoading(false);
        }
    }

    redirectToMainApp(user, sessionToken) {
        try {
            // Close current window and open main app
            if (window.electronAPI && window.electronAPI.system.redirectToMainApp) {
                window.electronAPI.system.redirectToMainApp();
            } else {
                // Fallback: reload to main app
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('❌ Error redirecting to main app:', error);
            window.location.href = 'index.html';
        }
    }

    showLoading(show) {
        this.isLoggingIn = show;
        
        const loadingEl = document.getElementById('login-loading');
        const loginButton = document.getElementById('login-button');

        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }

        if (loginButton) {
            loginButton.disabled = show || !this.validateForm();
            loginButton.querySelector('.mdc-button__label').textContent = show ? 'Signing in...' : 'Sign In';
        }

        // Disable form inputs
        document.querySelectorAll('#login-form input').forEach(input => {
            input.disabled = show;
        });
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (errorEl && errorText) {
            errorText.textContent = message;
            errorEl.style.display = 'flex';
            
            // Add shake animation
            errorEl.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                errorEl.style.animation = '';
            }, 500);
        }
    }

    showSuccess(message) {
        // Create temporary success message
        const errorEl = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (errorEl && errorText) {
            errorEl.style.backgroundColor = '#E8F5E8';
            errorEl.style.color = '#2E7D32';
            errorEl.querySelector('.material-icons').textContent = 'check_circle';
            errorText.textContent = message;
            errorEl.style.display = 'flex';
        }
    }

    clearError() {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.style.display = 'none';
            
            // Reset to error styling
            errorEl.style.backgroundColor = '#FFEBEE';
            errorEl.style.color = 'var(--md-sys-color-error)';
            errorEl.querySelector('.material-icons').textContent = 'error';
        }
    }

    focusPasswordField() {
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.select();
            passwordInput.focus();
        }
    }

    // Load remembered username
    loadRememberedUsername() {
        const rememberedUsername = localStorage.getItem('rememberUsername');
        if (rememberedUsername) {
            const usernameInput = document.getElementById('username');
            const rememberCheckbox = document.getElementById('remember-me');
            
            if (usernameInput) {
                usernameInput.value = rememberedUsername;
                // Trigger MDC text field update
                const textField = this.textFields.find(tf => 
                    tf.root.contains(usernameInput)
                );
                if (textField) {
                    textField.foundation.handleInputChange();
                }
            }
            
            if (rememberCheckbox) {
                rememberCheckbox.checked = true;
            }
            
            // Focus password field
            this.focusPasswordField();
        }
    }
}

// Add shake animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginManager = new LoginManager();
    
    // Load remembered username after initialization
    setTimeout(() => {
        loginManager.loadRememberedUsername();
    }, 100);
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
});