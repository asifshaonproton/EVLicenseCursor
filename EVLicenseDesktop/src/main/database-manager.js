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
            'CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(action_type)'
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