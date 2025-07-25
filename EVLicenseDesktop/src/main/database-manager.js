const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🗄️ Initializing Database Manager...');
            
            // Create database directory if it doesn't exist
            const userDataPath = app.getPath('userData');
            const dbDir = path.join(userDataPath, 'database');
            
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            this.dbPath = path.join(dbDir, 'evlicense.db');
            console.log(`📁 Database path: ${this.dbPath}`);
            
            // Open database connection
            await this.openDatabase();
            
            // Create tables if they don't exist
            await this.createTables();
            
            // Insert sample data if database is empty
            await this.insertSampleData();
            
            // Initialize authentication system
            await this.initializeAuthenticationSystem();
            
            this.isInitialized = true;
            console.log('✅ Database Manager initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Database Manager:', error);
            throw error;
        }
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (error) => {
                if (error) {
                    console.error('❌ Error opening database:', error);
                    reject(error);
                } else {
                    console.log('✅ Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // Licenses table
            `CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_number TEXT UNIQUE NOT NULL,
                owner_name TEXT NOT NULL,
                owner_email TEXT,
                owner_phone TEXT,
                vehicle_make TEXT NOT NULL,
                vehicle_model TEXT NOT NULL,
                vehicle_year INTEGER,
                vehicle_vin TEXT,
                vehicle_color TEXT,
                license_type TEXT DEFAULT 'Standard',
                issue_date TEXT NOT NULL,
                expiry_date TEXT NOT NULL,
                status TEXT DEFAULT 'Active',
                nfc_card_id TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // NFC Cards table
            `CREATE TABLE IF NOT EXISTS nfc_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_uid TEXT UNIQUE NOT NULL,
                card_type TEXT,
                license_id INTEGER,
                first_detected TEXT DEFAULT CURRENT_TIMESTAMP,
                last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
                read_count INTEGER DEFAULT 0,
                write_count INTEGER DEFAULT 0,
                data_content TEXT,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (license_id) REFERENCES licenses (id) ON DELETE SET NULL
            )`,
            
            // Activity Log table
            `CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                action_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER,
                description TEXT,
                user_info TEXT,
                additional_data TEXT
            )`,
            
            // System Settings table
            `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role_id INTEGER NOT NULL,
                avatar_url TEXT,
                is_active INTEGER DEFAULT 1,
                last_login TEXT,
                login_attempts INTEGER DEFAULT 0,
                locked_until TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                FOREIGN KEY (role_id) REFERENCES roles (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )`,
            
            // Roles table
            `CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                description TEXT,
                permissions TEXT NOT NULL, -- JSON string of permissions
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )`,
            
            // Sessions table
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // User Activity Log
            `CREATE TABLE IF NOT EXISTS user_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                resource TEXT,
                details TEXT,
                ip_address TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`
        ];

        for (const tableSQL of tables) {
            await this.runQuery(tableSQL);
        }

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_licenses_number ON licenses(license_number)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date)',
            'CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid ON nfc_cards(card_uid)',
            'CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(action_type)',
            
            // User authentication indexes
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp)'
        ];

        for (const indexSQL of indexes) {
            await this.runQuery(indexSQL);
        }

        console.log('✅ Database tables and indexes created successfully');
    }

    async insertSampleData() {
        try {
            // Check if we already have data
            const count = await this.getQuery('SELECT COUNT(*) as count FROM licenses');
            if (count.count > 0) {
                console.log('📊 Database already contains data, skipping sample data insertion');
                return;
            }

            console.log('📊 Inserting sample data...');

            const sampleLicenses = [
                {
                    license_number: 'EV001-2024',
                    owner_name: 'John Smith',
                    owner_email: 'john.smith@email.com',
                    owner_phone: '+1-555-0101',
                    vehicle_make: 'Tesla',
                    vehicle_model: 'Model 3',
                    vehicle_year: 2023,
                    vehicle_vin: '5YJ3E1EA1KF123456',
                    vehicle_color: 'Pearl White',
                    license_type: 'Premium',
                    issue_date: '2024-01-15',
                    expiry_date: '2025-01-15',
                    status: 'Active',
                    notes: 'First time EV owner, requires basic training'
                },
                {
                    license_number: 'EV002-2024',
                    owner_name: 'Sarah Johnson',
                    owner_email: 'sarah.johnson@email.com',
                    owner_phone: '+1-555-0102',
                    vehicle_make: 'Nissan',
                    vehicle_model: 'Leaf',
                    vehicle_year: 2022,
                    vehicle_vin: '1N4AZ1CP1KC234567',
                    vehicle_color: 'Electric Blue',
                    license_type: 'Standard',
                    issue_date: '2024-02-01',
                    expiry_date: '2025-02-01',
                    status: 'Active',
                    notes: 'Experienced EV driver'
                },
                {
                    license_number: 'EV003-2024',
                    owner_name: 'Michael Chen',
                    owner_email: 'michael.chen@email.com',
                    owner_phone: '+1-555-0103',
                    vehicle_make: 'BMW',
                    vehicle_model: 'iX',
                    vehicle_year: 2024,
                    vehicle_vin: 'WBY8P8C04P7345678',
                    vehicle_color: 'Mineral Grey',
                    license_type: 'Commercial',
                    issue_date: '2024-01-20',
                    expiry_date: '2025-01-20',
                    status: 'Active',
                    notes: 'Commercial fleet vehicle'
                },
                {
                    license_number: 'EV004-2023',
                    owner_name: 'Emily Davis',
                    owner_email: 'emily.davis@email.com',
                    owner_phone: '+1-555-0104',
                    vehicle_make: 'Chevrolet',
                    vehicle_model: 'Bolt EV',
                    vehicle_year: 2023,
                    vehicle_vin: '1G1FY6S01N4456789',
                    vehicle_color: 'Summit White',
                    license_type: 'Standard',
                    issue_date: '2023-12-01',
                    expiry_date: '2024-12-01',
                    status: 'Expired',
                    notes: 'License expired, renewal required'
                }
            ];

            for (const license of sampleLicenses) {
                await this.addLicense(license);
            }

            // Insert sample settings
            const sampleSettings = [
                { key: 'app_version', value: '1.0.0', description: 'Application version' },
                { key: 'database_version', value: '1.0', description: 'Database schema version' },
                { key: 'last_backup', value: '', description: 'Last database backup timestamp' },
                { key: 'auto_backup_enabled', value: 'true', description: 'Enable automatic database backups' },
                { key: 'nfc_polling_interval', value: '1000', description: 'NFC card polling interval in milliseconds' }
            ];

            for (const setting of sampleSettings) {
                await this.runQuery(
                    'INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)',
                    [setting.key, setting.value, setting.description]
                );
            }

            console.log('✅ Sample data inserted successfully');
        } catch (error) {
            console.error('❌ Error inserting sample data:', error);
            // Don't throw error as this is not critical
        }
    }

    async runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(error) {
                if (error) {
                    console.error('❌ Database query error:', error);
                    reject(error);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (error, row) => {
                if (error) {
                    console.error('❌ Database query error:', error);
                    reject(error);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getAllQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (error, rows) => {
                if (error) {
                    console.error('❌ Database query error:', error);
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getAllLicenses() {
        try {
            const licenses = await this.getAllQuery(`
                SELECT l.*, c.card_uid, c.card_type 
                FROM licenses l 
                LEFT JOIN nfc_cards c ON l.id = c.license_id AND c.is_active = 1
                ORDER BY l.created_at DESC
            `);
            
            await this.logActivity('READ', 'licenses', null, 'Retrieved all licenses');
            return licenses;
        } catch (error) {
            console.error('❌ Error getting all licenses:', error);
            throw error;
        }
    }

    async addLicense(licenseData) {
        try {
            const result = await this.runQuery(`
                INSERT INTO licenses (
                    license_number, owner_name, owner_email, owner_phone,
                    vehicle_make, vehicle_model, vehicle_year, vehicle_vin, vehicle_color,
                    license_type, issue_date, expiry_date, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                licenseData.license_number,
                licenseData.owner_name,
                licenseData.owner_email || null,
                licenseData.owner_phone || null,
                licenseData.vehicle_make,
                licenseData.vehicle_model,
                licenseData.vehicle_year || null,
                licenseData.vehicle_vin || null,
                licenseData.vehicle_color || null,
                licenseData.license_type || 'Standard',
                licenseData.issue_date,
                licenseData.expiry_date,
                licenseData.status || 'Active',
                licenseData.notes || null
            ]);

            await this.logActivity('CREATE', 'license', result.id, `Created license ${licenseData.license_number}`);
            return result.id;
        } catch (error) {
            console.error('❌ Error adding license:', error);
            throw error;
        }
    }

    async updateLicense(licenseData) {
        try {
            await this.runQuery(`
                UPDATE licenses SET
                    license_number = ?, owner_name = ?, owner_email = ?, owner_phone = ?,
                    vehicle_make = ?, vehicle_model = ?, vehicle_year = ?, vehicle_vin = ?, vehicle_color = ?,
                    license_type = ?, issue_date = ?, expiry_date = ?, status = ?, notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                licenseData.license_number,
                licenseData.owner_name,
                licenseData.owner_email || null,
                licenseData.owner_phone || null,
                licenseData.vehicle_make,
                licenseData.vehicle_model,
                licenseData.vehicle_year || null,
                licenseData.vehicle_vin || null,
                licenseData.vehicle_color || null,
                licenseData.license_type || 'Standard',
                licenseData.issue_date,
                licenseData.expiry_date,
                licenseData.status || 'Active',
                licenseData.notes || null,
                licenseData.id
            ]);

            await this.logActivity('UPDATE', 'license', licenseData.id, `Updated license ${licenseData.license_number}`);
            return true;
        } catch (error) {
            console.error('❌ Error updating license:', error);
            throw error;
        }
    }

    async deleteLicense(licenseId) {
        try {
            const license = await this.getQuery('SELECT license_number FROM licenses WHERE id = ?', [licenseId]);
            
            await this.runQuery('DELETE FROM licenses WHERE id = ?', [licenseId]);
            
            await this.logActivity('DELETE', 'license', licenseId, 
                `Deleted license ${license ? license.license_number : licenseId}`);
            return true;
        } catch (error) {
            console.error('❌ Error deleting license:', error);
            throw error;
        }
    }

    async searchLicenses(searchTerm) {
        try {
            const searchPattern = `%${searchTerm}%`;
            const licenses = await this.getAllQuery(`
                SELECT l.*, c.card_uid, c.card_type 
                FROM licenses l 
                LEFT JOIN nfc_cards c ON l.id = c.license_id AND c.is_active = 1
                WHERE 
                    l.license_number LIKE ? OR 
                    l.owner_name LIKE ? OR 
                    l.owner_email LIKE ? OR 
                    l.vehicle_make LIKE ? OR 
                    l.vehicle_model LIKE ? OR 
                    l.vehicle_vin LIKE ?
                ORDER BY l.created_at DESC
            `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);
            
            await this.logActivity('SEARCH', 'licenses', null, `Searched licenses with term: ${searchTerm}`);
            return licenses;
        } catch (error) {
            console.error('❌ Error searching licenses:', error);
            throw error;
        }
    }

    async logActivity(actionType, entityType, entityId, description, additionalData = null) {
        try {
            await this.runQuery(`
                INSERT INTO activity_log (action_type, entity_type, entity_id, description, additional_data)
                VALUES (?, ?, ?, ?, ?)
            `, [actionType, entityType, entityId, description, additionalData ? JSON.stringify(additionalData) : null]);
        } catch (error) {
            console.error('❌ Error logging activity:', error);
            // Don't throw as logging errors shouldn't break main functionality
        }
    }

    async getActivityLog(limit = 100) {
        try {
            return await this.getAllQuery(`
                SELECT * FROM activity_log 
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [limit]);
        } catch (error) {
            console.error('❌ Error getting activity log:', error);
            throw error;
        }
    }

    async getDashboardStats() {
        try {
            const stats = {
                totalLicenses: 0,
                activeLicenses: 0,
                expiredLicenses: 0,
                expiringIn30Days: 0,
                associatedCards: 0,
                recentActivity: []
            };

            // Get license counts
            const totalResult = await this.getQuery('SELECT COUNT(*) as count FROM licenses');
            stats.totalLicenses = totalResult.count;

            const activeResult = await this.getQuery("SELECT COUNT(*) as count FROM licenses WHERE status = 'Active'");
            stats.activeLicenses = activeResult.count;

            const expiredResult = await this.getQuery("SELECT COUNT(*) as count FROM licenses WHERE status = 'Expired'");
            stats.expiredLicenses = expiredResult.count;

            // Get licenses expiring in 30 days
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const expiringResult = await this.getQuery(`
                SELECT COUNT(*) as count FROM licenses 
                WHERE date(expiry_date) <= date(?) AND status = 'Active'
            `, [thirtyDaysFromNow.toISOString().split('T')[0]]);
            stats.expiringIn30Days = expiringResult.count;

            // Get associated cards count
            const cardsResult = await this.getQuery('SELECT COUNT(*) as count FROM nfc_cards WHERE is_active = 1');
            stats.associatedCards = cardsResult.count;

            // Get recent activity
            stats.recentActivity = await this.getActivityLog(10);

            return stats;
        } catch (error) {
            console.error('❌ Error getting dashboard stats:', error);
            throw error;
        }
    }

    // Authentication System Methods
    async initializeAuthenticationSystem() {
        try {
            console.log('🔐 Initializing authentication system...');
            
            // Check if roles exist
            const roleCount = await this.getQuery('SELECT COUNT(*) as count FROM roles');
            if (roleCount.count === 0) {
                await this.createDefaultRoles();
            }
            
            // Check if super admin exists
            const userCount = await this.getQuery('SELECT COUNT(*) as count FROM users');
            if (userCount.count === 0) {
                await this.createSuperAdmin();
            }
            
            console.log('✅ Authentication system initialized');
        } catch (error) {
            console.error('❌ Error initializing authentication system:', error);
        }
    }

    async createDefaultRoles() {
        const defaultRoles = [
            {
                name: 'super_admin',
                display_name: 'Super Administrator',
                description: 'Full system access with all permissions',
                permissions: JSON.stringify({
                    users: ['create', 'read', 'update', 'delete'],
                    roles: ['create', 'read', 'update', 'delete'],
                    licenses: ['create', 'read', 'update', 'delete'],
                    nfc: ['read', 'write', 'configure'],
                    settings: ['read', 'update'],
                    database: ['backup', 'restore', 'optimize'],
                    reports: ['generate', 'export'],
                    system: ['full_access']
                })
            },
            {
                name: 'admin',
                display_name: 'Administrator',
                description: 'Administrative access to most features',
                permissions: JSON.stringify({
                    users: ['create', 'read', 'update'],
                    licenses: ['create', 'read', 'update', 'delete'],
                    nfc: ['read', 'write', 'configure'],
                    settings: ['read', 'update'],
                    database: ['backup'],
                    reports: ['generate', 'export']
                })
            },
            {
                name: 'operator',
                display_name: 'Operator',
                description: 'Standard user with license management access',
                permissions: JSON.stringify({
                    licenses: ['create', 'read', 'update'],
                    nfc: ['read', 'write'],
                    reports: ['generate']
                })
            },
            {
                name: 'viewer',
                display_name: 'Viewer',
                description: 'Read-only access to licenses and reports',
                permissions: JSON.stringify({
                    licenses: ['read'],
                    reports: ['generate']
                })
            }
        ];

        for (const role of defaultRoles) {
            await this.runQuery(`
                INSERT INTO roles (name, display_name, description, permissions)
                VALUES (?, ?, ?, ?)
            `, [role.name, role.display_name, role.description, role.permissions]);
        }

        console.log('✅ Default roles created');
    }

    async createSuperAdmin() {
        const crypto = require('crypto');
        
        // Generate salt and hash for default password
        const defaultPassword = 'SuperAdmin123!';
        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = crypto.pbkdf2Sync(defaultPassword, salt, 10000, 64, 'sha512').toString('hex');
        
        // Get super admin role ID
        const superAdminRole = await this.getQuery("SELECT id FROM roles WHERE name = 'super_admin'");
        
        if (superAdminRole) {
            await this.runQuery(`
                INSERT INTO users (username, email, password_hash, salt, full_name, role_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'superadmin',
                'superadmin@evlicense.local',
                passwordHash,
                salt,
                'Super Administrator',
                superAdminRole.id
            ]);
            
            console.log('🔑 Super Admin created:');
            console.log('   Username: superadmin');
            console.log('   Password: SuperAdmin123!');
            console.log('   Email: superadmin@evlicense.local');
        }
    }

    async authenticateUser(username, password) {
        try {
            const user = await this.getQuery(`
                SELECT u.*, r.name as role_name, r.permissions 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
            `, [username, username]);

            if (!user) {
                return { success: false, message: 'Invalid credentials' };
            }

            // Check if account is locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return { success: false, message: 'Account is temporarily locked' };
            }

            // Verify password
            const crypto = require('crypto');
            const hash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
            
            if (hash !== user.password_hash) {
                // Increment login attempts
                await this.runQuery(`
                    UPDATE users SET login_attempts = login_attempts + 1,
                    locked_until = CASE WHEN login_attempts >= 4 THEN datetime('now', '+30 minutes') ELSE NULL END
                    WHERE id = ?
                `, [user.id]);
                
                return { success: false, message: 'Invalid credentials' };
            }

            // Reset login attempts and update last login
            await this.runQuery(`
                UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [user.id]);

            // Create session
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

            await this.runQuery(`
                INSERT INTO user_sessions (user_id, session_token, expires_at)
                VALUES (?, ?, ?)
            `, [user.id, sessionToken, expiresAt.toISOString()]);

            // Log activity
            await this.logUserActivity(user.id, 'LOGIN', null, 'User logged in successfully');

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role_name: user.role_name,
                    permissions: JSON.parse(user.permissions),
                    avatar_url: user.avatar_url
                },
                sessionToken: sessionToken
            };

        } catch (error) {
            console.error('❌ Error authenticating user:', error);
            return { success: false, message: 'Authentication failed' };
        }
    }

    async validateSession(sessionToken) {
        try {
            const session = await this.getQuery(`
                SELECT s.*, u.*, r.name as role_name, r.permissions 
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                JOIN roles r ON u.role_id = r.id
                WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
            `, [sessionToken]);

            if (!session) {
                return { valid: false };
            }

            // Update last activity
            await this.runQuery(`
                UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = ?
            `, [sessionToken]);

            return {
                valid: true,
                user: {
                    id: session.user_id,
                    username: session.username,
                    email: session.email,
                    full_name: session.full_name,
                    role_name: session.role_name,
                    permissions: JSON.parse(session.permissions),
                    avatar_url: session.avatar_url
                }
            };

        } catch (error) {
            console.error('❌ Error validating session:', error);
            return { valid: false };
        }
    }

    async createUser(userData, createdBy) {
        try {
            const crypto = require('crypto');
            
            // Generate salt and hash password
            const salt = crypto.randomBytes(32).toString('hex');
            const passwordHash = crypto.pbkdf2Sync(userData.password, salt, 10000, 64, 'sha512').toString('hex');
            
            const result = await this.runQuery(`
                INSERT INTO users (username, email, password_hash, salt, full_name, role_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.username,
                userData.email,
                passwordHash,
                salt,
                userData.full_name,
                userData.role_id,
                createdBy
            ]);

            await this.logUserActivity(createdBy, 'CREATE_USER', 'users', `Created user: ${userData.username}`);
            return { success: true, userId: result.id };

        } catch (error) {
            console.error('❌ Error creating user:', error);
            if (error.message.includes('UNIQUE constraint failed')) {
                return { success: false, message: 'Username or email already exists' };
            }
            return { success: false, message: 'Failed to create user' };
        }
    }

    async getAllUsers() {
        try {
            return await this.getAllQuery(`
                SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
                       r.display_name as role_name, r.name as role_code,
                       creator.full_name as created_by_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN users creator ON u.created_by = creator.id
                ORDER BY u.created_at DESC
            `);
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            throw error;
        }
    }

    async getAllRoles() {
        try {
            return await this.getAllQuery(`
                SELECT id, name, display_name, description, permissions, is_active, created_at
                FROM roles
                WHERE is_active = 1
                ORDER BY name
            `);
        } catch (error) {
            console.error('❌ Error getting all roles:', error);
            throw error;
        }
    }

    async createRole(roleData, createdBy) {
        try {
            const result = await this.runQuery(`
                INSERT INTO roles (name, display_name, description, permissions, created_by)
                VALUES (?, ?, ?, ?, ?)
            `, [
                roleData.name,
                roleData.display_name,
                roleData.description,
                JSON.stringify(roleData.permissions),
                createdBy
            ]);

            await this.logUserActivity(createdBy, 'CREATE_ROLE', 'roles', `Created role: ${roleData.name}`);
            return { success: true, roleId: result.id };

        } catch (error) {
            console.error('❌ Error creating role:', error);
            if (error.message.includes('UNIQUE constraint failed')) {
                return { success: false, message: 'Role name already exists' };
            }
            return { success: false, message: 'Failed to create role' };
        }
    }

    async updateRole(roleId, roleData, updatedBy) {
        try {
            const role = await this.getQuery(`SELECT name FROM roles WHERE id = ?`, [roleId]);
            
            await this.runQuery(`
                UPDATE roles 
                SET display_name = ?, description = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                roleData.display_name,
                roleData.description,
                JSON.stringify(roleData.permissions),
                roleId
            ]);

            await this.logUserActivity(updatedBy, 'UPDATE_ROLE', 'roles', `Updated role: ${role.name}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Error updating role:', error);
            return { success: false, message: 'Failed to update role' };
        }
    }

    async deleteRole(roleId, deletedBy) {
        try {
            // Check if role is in use
            const usersWithRole = await this.getQuery(`
                SELECT COUNT(*) as count FROM users WHERE role_id = ?
            `, [roleId]);

            if (usersWithRole.count > 0) {
                return { 
                    success: false, 
                    message: `Cannot delete role: ${usersWithRole.count} user(s) still have this role` 
                };
            }

            // Get role info for logging
            const role = await this.getQuery(`SELECT name FROM roles WHERE id = ?`, [roleId]);
            
            await this.runQuery(`
                UPDATE roles 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [roleId]);

            await this.logUserActivity(deletedBy, 'DELETE_ROLE', 'roles', `Deleted role: ${role.name}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Error deleting role:', error);
            return { success: false, message: 'Failed to delete role' };
        }
    }

    async getPermissionsList() {
        // Define available permissions with their categories
        return {
            licenses: {
                name: 'License Management',
                permissions: ['view', 'create', 'edit', 'delete', 'import', 'export']
            },
            users: {
                name: 'User Management',
                permissions: ['view', 'create', 'edit', 'delete', 'manage_roles']
            },
            roles: {
                name: 'Role Management',
                permissions: ['view', 'create', 'edit', 'delete']
            },
            settings: {
                name: 'System Settings',
                permissions: ['view', 'edit', 'backup', 'restore']
            },
            reports: {
                name: 'Reports & Analytics',
                permissions: ['view', 'generate', 'export']
            },
            system: {
                name: 'System Administration',
                permissions: ['view_logs', 'manage_database', 'system_config']
            }
        };
    }

    async updateUser(userId, userData, updatedBy) {
        try {
            await this.runQuery(`
                UPDATE users SET
                    username = ?, email = ?, full_name = ?, role_id = ?, is_active = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                userData.username,
                userData.email,
                userData.full_name,
                userData.role_id,
                userData.is_active,
                userId
            ]);

            await this.logUserActivity(updatedBy, 'UPDATE_USER', 'users', `Updated user: ${userData.username}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Error updating user:', error);
            return { success: false, message: 'Failed to update user' };
        }
    }

    async deleteUser(userId, deletedBy) {
        try {
            const user = await this.getQuery('SELECT username FROM users WHERE id = ?', [userId]);
            
            await this.runQuery('DELETE FROM users WHERE id = ?', [userId]);
            
            await this.logUserActivity(deletedBy, 'DELETE_USER', 'users', 
                `Deleted user: ${user ? user.username : userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            return { success: false, message: 'Failed to delete user' };
        }
    }

    async logUserActivity(userId, action, resource, details) {
        try {
            await this.runQuery(`
                INSERT INTO user_activity (user_id, action, resource, details)
                VALUES (?, ?, ?, ?)
            `, [userId, action, resource, details]);
        } catch (error) {
            console.error('❌ Error logging user activity:', error);
        }
    }

    async logout(sessionToken) {
        try {
            await this.runQuery('DELETE FROM user_sessions WHERE session_token = ?', [sessionToken]);
            return { success: true };
        } catch (error) {
            console.error('❌ Error logging out:', error);
            return { success: false };
        }
    }

    async changePassword(userId, oldPassword, newPassword) {
        try {
            const user = await this.getQuery('SELECT password_hash, salt FROM users WHERE id = ?', [userId]);
            
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Verify old password
            const crypto = require('crypto');
            const oldHash = crypto.pbkdf2Sync(oldPassword, user.salt, 10000, 64, 'sha512').toString('hex');
            
            if (oldHash !== user.password_hash) {
                return { success: false, message: 'Current password is incorrect' };
            }

            // Generate new hash
            const newSalt = crypto.randomBytes(32).toString('hex');
            const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 10000, 64, 'sha512').toString('hex');

            await this.runQuery(`
                UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [newHash, newSalt, userId]);

            await this.logUserActivity(userId, 'CHANGE_PASSWORD', 'users', 'Password changed successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Error changing password:', error);
            return { success: false, message: 'Failed to change password' };
        }
    }

    cleanup() {
        try {
            if (this.db) {
                this.db.close((error) => {
                    if (error) {
                        console.error('❌ Error closing database:', error);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                });
                this.db = null;
            }
            this.isInitialized = false;
        } catch (error) {
            console.error('❌ Error during database cleanup:', error);
        }
    }
}

module.exports = DatabaseManager;