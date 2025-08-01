package com.ektai.evlicense.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class LicenseDbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(SQL_CREATE_TABLE)
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Handle database upgrades to add new columns
        if (oldVersion < 2) {
            // Add new columns for cross-platform compatibility
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN email TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN vehicle_make TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN vehicle_model TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN vehicle_year INTEGER")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN vehicle_color TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN vehicle_vin TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN status TEXT DEFAULT 'Active'")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN issue_date TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN notes TEXT")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP")
        }
    }
    companion object {
        const val DATABASE_NAME = "license_database.db"
        const val DATABASE_VERSION = 2  // Incremented for new schema
        const val TABLE_NAME = "licenses"
        const val COLUMN_ID = "id"
        const val COLUMN_HOLDER_NAME = "holderName"
        const val COLUMN_MOBILE = "mobile"
        const val COLUMN_CITY = "city"
        const val COLUMN_LICENSE_TYPE = "licenseType"
        const val COLUMN_LICENSE_NUMBER = "licenseNumber"
        const val COLUMN_NFC_CARD_NUMBER = "nfcCardNumber"
        const val COLUMN_VALIDITY_DATE = "validityDate"
        // New columns for cross-platform compatibility
        const val COLUMN_EMAIL = "email"
        const val COLUMN_VEHICLE_MAKE = "vehicle_make"
        const val COLUMN_VEHICLE_MODEL = "vehicle_model"
        const val COLUMN_VEHICLE_YEAR = "vehicle_year"
        const val COLUMN_VEHICLE_COLOR = "vehicle_color"
        const val COLUMN_VEHICLE_VIN = "vehicle_vin"
        const val COLUMN_STATUS = "status"
        const val COLUMN_ISSUE_DATE = "issue_date"
        const val COLUMN_NOTES = "notes"
        const val COLUMN_CREATED_AT = "created_at"
        const val COLUMN_UPDATED_AT = "updated_at"
        private const val SQL_CREATE_TABLE =
            "CREATE TABLE $TABLE_NAME (" +
                    "$COLUMN_ID INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "$COLUMN_HOLDER_NAME TEXT, " +
                    "$COLUMN_MOBILE TEXT, " +
                    "$COLUMN_CITY TEXT, " +
                    "$COLUMN_LICENSE_TYPE TEXT, " +
                    "$COLUMN_LICENSE_NUMBER TEXT, " +
                    "$COLUMN_NFC_CARD_NUMBER TEXT, " +
                    "$COLUMN_VALIDITY_DATE TEXT, " +
                    "$COLUMN_EMAIL TEXT, " +
                    "$COLUMN_VEHICLE_MAKE TEXT, " +
                    "$COLUMN_VEHICLE_MODEL TEXT, " +
                    "$COLUMN_VEHICLE_YEAR INTEGER, " +
                    "$COLUMN_VEHICLE_COLOR TEXT, " +
                    "$COLUMN_VEHICLE_VIN TEXT, " +
                    "$COLUMN_STATUS TEXT DEFAULT 'Active', " +
                    "$COLUMN_ISSUE_DATE TEXT, " +
                    "$COLUMN_NOTES TEXT, " +
                    "$COLUMN_CREATED_AT TEXT DEFAULT CURRENT_TIMESTAMP, " +
                    "$COLUMN_UPDATED_AT TEXT DEFAULT CURRENT_TIMESTAMP)"
    }
} 