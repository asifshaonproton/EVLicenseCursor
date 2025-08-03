const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Simple script to reset the database
async function resetDatabase() {
    try {
        console.log('🔄 Resetting EV License Database...');
        
        // Get the database path
        const userDataPath = app.getPath('userData');
        const dbDir = path.join(userDataPath, 'database');
        const dbPath = path.join(dbDir, 'evlicense.db');
        
        console.log(`📁 Database path: ${dbPath}`);
        
        // Check if database exists
        if (fs.existsSync(dbPath)) {
            // Delete the database file
            fs.unlinkSync(dbPath);
            console.log('🗑️ Deleted old database file');
        } else {
            console.log('ℹ️ No existing database file found');
        }
        
        console.log('✅ Database reset completed successfully!');
        console.log('🔄 Restart the application to create a new database with the correct schema.');
        
    } catch (error) {
        console.error('❌ Error resetting database:', error);
    }
}

// Run the reset function
resetDatabase(); 