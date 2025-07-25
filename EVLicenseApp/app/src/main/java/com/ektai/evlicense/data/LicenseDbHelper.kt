package com.ektai.evlicense.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class LicenseDbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(SQL_CREATE_TABLE)
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_NAME")
        onCreate(db)
    }
    companion object {
        const val DATABASE_NAME = "license_database.db"
        const val DATABASE_VERSION = 1
        const val TABLE_NAME = "licenses"
        const val COLUMN_ID = "id"
        const val COLUMN_HOLDER_NAME = "holderName"
        const val COLUMN_MOBILE = "mobile"
        const val COLUMN_CITY = "city"
        const val COLUMN_LICENSE_TYPE = "licenseType"
        const val COLUMN_LICENSE_NUMBER = "licenseNumber"
        const val COLUMN_NFC_CARD_NUMBER = "nfcCardNumber"
        const val COLUMN_VALIDITY_DATE = "validityDate"
        private const val SQL_CREATE_TABLE =
            "CREATE TABLE $TABLE_NAME (" +
                    "$COLUMN_ID INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "$COLUMN_HOLDER_NAME TEXT, " +
                    "$COLUMN_MOBILE TEXT, " +
                    "$COLUMN_CITY TEXT, " +
                    "$COLUMN_LICENSE_TYPE TEXT, " +
                    "$COLUMN_LICENSE_NUMBER TEXT, " +
                    "$COLUMN_NFC_CARD_NUMBER TEXT, " +
                    "$COLUMN_VALIDITY_DATE TEXT)"
    }
} 