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
            
            // Check if database exists and has schema issues
            if (fs.existsSync(this.dbPath)) {
                const needsReset = await this.checkDatabaseSchema();
                if (needsReset) {
                    console.log('🔄 Database schema issues detected, resetting database...');
                    await this.resetDatabase();
                }
            }
            
            // Open database connection
            await this.openDatabase();
            
            // Create tables if they don't exist
            await this.createTables();
            
            // Migrate existing database if needed
            await this.migrateDatabase();
            
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

    async checkDatabaseSchema() {
        try {
            // Temporarily open database to check schema
            const tempDb = new sqlite3.Database(this.dbPath);
            
            return new Promise((resolve, reject) => {
                tempDb.get("PRAGMA table_info(licenses)", (error, row) => {
                    if (error) {
                        // Table doesn't exist or other error
                        tempDb.close();
                        resolve(true); // Needs reset
                    } else {
                        // Check if table has old schema
                        tempDb.all("PRAGMA table_info(licenses)", (error, rows) => {
                            tempDb.close();
                            if (error) {
                                resolve(true);
                            } else {
                                const columnNames = rows.map(col => col.name);
                                const hasOldSchema = columnNames.includes('owner_name') || columnNames.includes('license_number');
                                const hasNewSchema = columnNames.includes('holderName') || columnNames.includes('licenseNumber');
                                
                                // If we have old schema but not new schema, we need to reset
                                resolve(hasOldSchema && !hasNewSchema);
                            }
                        });
                    }
                });
            });
        } catch (error) {
            console.error('❌ Error checking database schema:', error);
            return true; // Reset on error
        }
    }

    async resetDatabase() {
        try {
            console.log('🔄 Resetting database...');
            
            // Close existing connection if open
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            // Delete the database file
            if (fs.existsSync(this.dbPath)) {
                fs.unlinkSync(this.dbPath);
                console.log('🗑️ Deleted old database file');
            }
            
            console.log('✅ Database reset completed');
        } catch (error) {
            console.error('❌ Error resetting database:', error);
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
            // Licenses table - Updated to match Android app structure
            `CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                holderName TEXT NOT NULL,
                mobile TEXT NOT NULL,
                city TEXT,
                licenseType TEXT DEFAULT 'Standard',
                licenseNumber TEXT UNIQUE NOT NULL,
                nfcCardNumber TEXT,
                validityDate TEXT NOT NULL,
                email TEXT,
                vehicleMake TEXT,
                vehicleModel TEXT,
                vehicleYear INTEGER,
                vehicleColor TEXT,
                vehicleVin TEXT,
                status TEXT DEFAULT 'Active',
                issueDate TEXT,
                notes TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
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
                action_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER,
                description TEXT,
                additional_data TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Settings table
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.runQuery(table);
        }
        
        console.log('✅ Database tables created successfully');
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

            // Insert sample licenses - Updated to match Android app structure
            const sampleLicenses = [
                {
                    holderName: 'John Smith',
                    mobile: '+1-555-0101',
                    city: 'Rangpur',
                    licenseType: 'A',
                    licenseNumber: 'EV001-2024',
                    nfcCardNumber: '04A1B2C3D4E5F6',
                    validityDate: '2025-01-15',
                    email: 'john.smith@email.com',
                    vehicleMake: 'Tesla',
                    vehicleModel: 'Model 3',
                    vehicleYear: 2023,
                    vehicleColor: 'Pearl White',
                    vehicleVin: '5YJ3E1EA1KF123456',
                    status: 'Active',
                    issueDate: '2024-01-15',
                    notes: 'First time EV owner, requires basic training'
                },
                {
                    holderName: 'Sarah Johnson',
                    mobile: '+1-555-0102',
                    city: 'Narayanganj',
                    licenseType: 'R',
                    licenseNumber: 'EV002-2024',
                    nfcCardNumber: '04B2C3D4E5F6A1',
                    validityDate: '2025-02-01',
                    email: 'sarah.johnson@email.com',
                    vehicleMake: 'Nissan',
                    vehicleModel: 'Leaf',
                    vehicleYear: 2022,
                    vehicleColor: 'Electric Blue',
                    vehicleVin: '1N4AZ1CP1KC234567',
                    status: 'Active',
                    issueDate: '2024-02-01',
                    notes: 'Experienced EV driver'
                },
                {
                    holderName: 'Michael Chen',
                    mobile: '+1-555-0103',
                    city: 'Rangpur',
                    licenseType: 'V',
                    licenseNumber: 'EV003-2024',
                    nfcCardNumber: '04C3D4E5F6A1B2',
                    validityDate: '2025-01-20',
                    email: 'michael.chen@email.com',
                    vehicleMake: 'BMW',
                    vehicleModel: 'iX',
                    vehicleYear: 2024,
                    vehicleColor: 'Mineral Grey',
                    vehicleVin: 'WBY8P8C04P7345678',
                    status: 'Active',
                    issueDate: '2024-01-20',
                    notes: 'Commercial fleet vehicle'
                },
                {
                    holderName: 'Emily Davis',
                    mobile: '+1-555-0104',
                    city: 'Narayanganj',
                    licenseType: 'M',
                    licenseNumber: 'EV004-2023',
                    nfcCardNumber: '04D4E5F6A1B2C3',
                    validityDate: '2024-12-01',
                    email: 'emily.davis@email.com',
                    vehicleMake: 'Chevrolet',
                    vehicleModel: 'Bolt EV',
                    vehicleYear: 2023,
                    vehicleColor: 'Summit White',
                    vehicleVin: '1G1FY6S01N4456789',
                    status: 'Expired',
                    issueDate: '2023-12-01',
                    notes: 'License expired, renewal required'
                }
            ];

            for (const license of sampleLicenses) {
                await this.addLicense(license);
            }

            // Insert sample settings
            const sampleSettings = [
                { key: 'app_version', value: '1.0.0' },
                { key: 'database_version', value: '1.0' },
                { key: 'last_backup', value: '' },
                { key: 'auto_backup_enabled', value: 'true' },
                { key: 'nfc_polling_interval', value: '1000' }
            ];

            for (const setting of sampleSettings) {
                await this.runQuery(
                    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    [setting.key, setting.value]
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
                ORDER BY l.id DESC
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
                    holderName, mobile, city, licenseType, licenseNumber, nfcCardNumber,
                    validityDate, email, vehicleMake, vehicleModel, vehicleYear, vehicleColor, vehicleVin,
                    status, issueDate, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                licenseData.holderName,
                licenseData.mobile,
                licenseData.city || null,
                licenseData.licenseType || 'Standard',
                licenseData.licenseNumber,
                licenseData.nfcCardNumber || null,
                licenseData.validityDate,
                licenseData.email || null,
                licenseData.vehicleMake || null,
                licenseData.vehicleModel || null,
                licenseData.vehicleYear || null,
                licenseData.vehicleColor || null,
                licenseData.vehicleVin || null,
                licenseData.status || 'Active',
                licenseData.issueDate || null,
                licenseData.notes || null
            ]);

            await this.logActivity('CREATE', 'license', result.id, `Created license ${licenseData.licenseNumber}`);
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
                    holderName = ?, mobile = ?, city = ?, licenseType = ?, licenseNumber = ?, nfcCardNumber = ?,
                    validityDate = ?, email = ?, vehicleMake = ?, vehicleModel = ?, vehicleYear = ?, vehicleColor = ?, vehicleVin = ?,
                    status = ?, issueDate = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                licenseData.holderName,
                licenseData.mobile,
                licenseData.city || null,
                licenseData.licenseType || 'Standard',
                licenseData.licenseNumber,
                licenseData.nfcCardNumber || null,
                licenseData.validityDate,
                licenseData.email || null,
                licenseData.vehicleMake || null,
                licenseData.vehicleModel || null,
                licenseData.vehicleYear || null,
                licenseData.vehicleColor || null,
                licenseData.vehicleVin || null,
                licenseData.status || 'Active',
                licenseData.issueDate || null,
                licenseData.notes || null,
                licenseData.id
            ]);

            await this.logActivity('UPDATE', 'license', licenseData.id, `Updated license ${licenseData.licenseNumber}`);
            return true;
        } catch (error) {
            console.error('❌ Error updating license:', error);
            throw error;
        }
    }

    async deleteLicense(licenseId) {
        try {
            const license = await this.getQuery('SELECT licenseNumber FROM licenses WHERE id = ?', [licenseId]);
            
            await this.runQuery('DELETE FROM licenses WHERE id = ?', [licenseId]);
            
            await this.logActivity('DELETE', 'license', licenseId, 
                `Deleted license ${license ? license.licenseNumber : licenseId}`);
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
                    l.licenseNumber LIKE ? OR 
                    l.holderName LIKE ? OR 
                    l.email LIKE ? OR 
                    l.vehicleMake LIKE ? OR 
                    l.vehicleModel LIKE ? OR 
                    l.vehicleVin LIKE ?
                ORDER BY l.id DESC
            `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);
            
            return licenses;
        } catch (error) {
            console.error('❌ Error searching licenses:', error);
            throw error;
        }
    }

    async associateCardWithLicense(cardUid, licenseId) {
        try {
            // First, check if card already exists
            const existingCard = await this.getQuery('SELECT * FROM nfc_cards WHERE card_uid = ?', [cardUid]);
            
            if (existingCard) {
                // Update existing card
                await this.runQuery(`
                    UPDATE nfc_cards SET 
                        license_id = ?, 
                        last_seen = CURRENT_TIMESTAMP,
                        is_active = 1
                    WHERE card_uid = ?
                `, [licenseId, cardUid]);
            } else {
                // Create new card record
                await this.runQuery(`
                    INSERT INTO nfc_cards (card_uid, license_id, card_type, is_active)
                    VALUES (?, ?, ?, 1)
                `, [cardUid, licenseId, 'Unknown']);
            }

            // Update license with card ID
            await this.runQuery('UPDATE licenses SET nfc_card_id = ? WHERE id = ?', [cardUid, licenseId]);
            
            await this.logActivity('ASSOCIATE', 'nfc_card', licenseId, `Associated card ${cardUid} with license ID ${licenseId}`);
            return true;
        } catch (error) {
            console.error('❌ Error associating card with license:', error);
            throw error;
        }
    }

    async updateCardActivity(cardUid, action = 'READ') {
        try {
            const updateField = action === 'read' ? 'read_count' : 'write_count';
            await this.runQuery(`
                UPDATE nfc_cards SET 
                    ${updateField} = ${updateField} + 1,
                    last_seen = CURRENT_TIMESTAMP
                WHERE card_uid = ?
            `, [cardUid]);
        } catch (error) {
            console.error('❌ Error updating card activity:', error);
            // Don't throw as this is not critical
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

    async migrateDatabase() {
        try {
            console.log('🔄 Migrating database schema...');

            // Get current table structure
            const licensesTableInfo = await this.getAllQuery('PRAGMA table_info(licenses)');
            const existingColumns = licensesTableInfo.map(col => col.name);
            
            console.log('📊 Current licenses table columns:', existingColumns);

            // Check if we need to migrate from old schema to new schema
            const hasOldSchema = existingColumns.includes('owner_name') || existingColumns.includes('license_number');
            const hasNewSchema = existingColumns.includes('holderName') || existingColumns.includes('licenseNumber');

            if (hasOldSchema && !hasNewSchema) {
                console.log('🔄 Migrating from old schema to new schema...');
                await this.migrateFromOldSchema();
            } else if (!hasOldSchema && !hasNewSchema) {
                console.log('📝 Creating new database with current schema...');
                // Table will be created with new schema in createTables()
            } else {
                console.log('✅ Database schema is up to date.');
            }

            // Add any missing columns for the new schema
            await this.addMissingColumns();

            console.log('✅ Database schema migration completed.');
        } catch (error) {
            console.error('❌ Error during database migration:', error);
            throw error;
        }
    }

    async migrateFromOldSchema() {
        try {
            console.log('🔄 Starting schema migration...');

            // Create a backup of the current data
            const oldData = await this.getAllQuery('SELECT * FROM licenses');
            console.log(`📊 Found ${oldData.length} existing licenses to migrate`);

            // Drop the old table
            await this.runQuery('DROP TABLE IF EXISTS licenses');

            // Recreate the table with new schema
            await this.createTables();

            // Migrate the data with field mapping
            for (const oldLicense of oldData) {
                const newLicense = {
                    holderName: oldLicense.owner_name || oldLicense.holderName,
                    mobile: oldLicense.owner_phone || oldLicense.mobile,
                    city: oldLicense.city,
                    licenseType: oldLicense.license_type || oldLicense.licenseType || 'Standard',
                    licenseNumber: oldLicense.license_number || oldLicense.licenseNumber,
                    nfcCardNumber: oldLicense.nfc_card_id || oldLicense.nfcCardNumber,
                    validityDate: oldLicense.expiry_date || oldLicense.validityDate,
                    email: oldLicense.owner_email || oldLicense.email,
                    vehicleMake: oldLicense.vehicle_make || oldLicense.vehicleMake,
                    vehicleModel: oldLicense.vehicle_model || oldLicense.vehicleModel,
                    vehicleYear: oldLicense.vehicle_year || oldLicense.vehicleYear,
                    vehicleColor: oldLicense.vehicle_color || oldLicense.vehicleColor,
                    vehicleVin: oldLicense.vehicle_vin || oldLicense.vehicleVin,
                    status: oldLicense.status || 'Active',
                    issueDate: oldLicense.issue_date || oldLicense.issueDate,
                    notes: oldLicense.notes
                };

                await this.addLicense(newLicense);
            }

            console.log(`✅ Successfully migrated ${oldData.length} licenses to new schema`);
        } catch (error) {
            console.error('❌ Error during schema migration:', error);
            throw error;
        }
    }

    async addMissingColumns() {
        try {
            const licensesTableInfo = await this.getAllQuery('PRAGMA table_info(licenses)');
            const existingColumns = licensesTableInfo.map(col => col.name);

            // Define required columns for new schema
            const requiredColumns = [
                { name: 'holderName', type: 'TEXT NOT NULL' },
                { name: 'mobile', type: 'TEXT NOT NULL' },
                { name: 'city', type: 'TEXT' },
                { name: 'licenseType', type: 'TEXT DEFAULT \'Standard\'' },
                { name: 'licenseNumber', type: 'TEXT UNIQUE NOT NULL' },
                { name: 'nfcCardNumber', type: 'TEXT' },
                { name: 'validityDate', type: 'TEXT NOT NULL' },
                { name: 'email', type: 'TEXT' },
                { name: 'vehicleMake', type: 'TEXT' },
                { name: 'vehicleModel', type: 'TEXT' },
                { name: 'vehicleYear', type: 'INTEGER' },
                { name: 'vehicleColor', type: 'TEXT' },
                { name: 'vehicleVin', type: 'TEXT' },
                { name: 'status', type: 'TEXT DEFAULT \'Active\'' },
                { name: 'issueDate', type: 'TEXT' },
                { name: 'notes', type: 'TEXT' },
                { name: 'createdAt', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
                { name: 'updatedAt', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' }
            ];

            // Add missing columns
            for (const column of requiredColumns) {
                if (!existingColumns.includes(column.name)) {
                    console.log(`➕ Adding missing column: ${column.name}`);
                    await this.runQuery(`ALTER TABLE licenses ADD COLUMN ${column.name} ${column.type}`);
                }
            }

            // Handle NFC cards table
            const nfcCardsTableInfo = await this.getAllQuery('PRAGMA table_info(nfc_cards)');
            const nfcExistingColumns = nfcCardsTableInfo.map(col => col.name);

            const nfcRequiredColumns = [
                { name: 'card_type', type: 'TEXT' },
                { name: 'data_content', type: 'TEXT' },
                { name: 'is_active', type: 'INTEGER DEFAULT 1' },
                { name: 'first_detected', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
                { name: 'last_seen', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
                { name: 'read_count', type: 'INTEGER DEFAULT 0' },
                { name: 'write_count', type: 'INTEGER DEFAULT 0' }
            ];

            for (const column of nfcRequiredColumns) {
                if (!nfcExistingColumns.includes(column.name)) {
                    console.log(`➕ Adding missing NFC column: ${column.name}`);
                    await this.runQuery(`ALTER TABLE nfc_cards ADD COLUMN ${column.name} ${column.type}`);
                }
            }

        } catch (error) {
            console.error('❌ Error adding missing columns:', error);
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