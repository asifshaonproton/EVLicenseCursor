package com.ektai.evlicense.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class LicenseRepository(context: Context) {
    private val dbHelper = LicenseDbHelper(context)

    suspend fun getAllLicenses(): List<LicenseEntity> = withContext(Dispatchers.IO) {
        val db = dbHelper.readableDatabase
        val cursor = db.query(
            LicenseDbHelper.TABLE_NAME,
            null, null, null, null, null, "id DESC"
        )
        val licenses = mutableListOf<LicenseEntity>()
        cursor.use {
            while (it.moveToNext()) {
                licenses.add(cursorToLicense(it))
            }
        }
        licenses
    }

    suspend fun searchLicenses(query: String): List<LicenseEntity> = withContext(Dispatchers.IO) {
        val db = dbHelper.readableDatabase
        val cursor = db.query(
            LicenseDbHelper.TABLE_NAME,
            null,
            "${LicenseDbHelper.COLUMN_LICENSE_NUMBER} LIKE ? OR ${LicenseDbHelper.COLUMN_HOLDER_NAME} LIKE ?",
            arrayOf("%$query%", "%$query%"),
            null, null, "id DESC"
        )
        val licenses = mutableListOf<LicenseEntity>()
        cursor.use {
            while (it.moveToNext()) {
                licenses.add(cursorToLicense(it))
            }
        }
        licenses
    }

    suspend fun insertLicense(license: LicenseEntity) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val values = licenseToContentValues(license, includeId = false)
        db.insert(LicenseDbHelper.TABLE_NAME, null, values)
    }

    suspend fun updateLicense(license: LicenseEntity) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val values = licenseToContentValues(license, includeId = false)
        db.update(
            LicenseDbHelper.TABLE_NAME,
            values,
            "${LicenseDbHelper.COLUMN_ID} = ?",
            arrayOf(license.id.toString())
        )
    }

    suspend fun deleteLicense(license: LicenseEntity) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        db.delete(
            LicenseDbHelper.TABLE_NAME,
            "${LicenseDbHelper.COLUMN_ID} = ?",
            arrayOf(license.id.toString())
        )
    }

    private fun cursorToLicense(cursor: Cursor): LicenseEntity {
        return LicenseEntity(
            id = cursor.getInt(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_ID)),
            holderName = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_HOLDER_NAME)),
            mobile = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_MOBILE)),
            city = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_CITY)),
            licenseType = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_LICENSE_TYPE)),
            licenseNumber = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_LICENSE_NUMBER)),
            nfcCardNumber = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_NFC_CARD_NUMBER)),
            validityDate = cursor.getString(cursor.getColumnIndexOrThrow(LicenseDbHelper.COLUMN_VALIDITY_DATE))
        )
    }

    private fun licenseToContentValues(license: LicenseEntity, includeId: Boolean = false): ContentValues {
        val values = ContentValues()
        if (includeId) values.put(LicenseDbHelper.COLUMN_ID, license.id)
        values.put(LicenseDbHelper.COLUMN_HOLDER_NAME, license.holderName)
        values.put(LicenseDbHelper.COLUMN_MOBILE, license.mobile)
        values.put(LicenseDbHelper.COLUMN_CITY, license.city)
        values.put(LicenseDbHelper.COLUMN_LICENSE_TYPE, license.licenseType)
        values.put(LicenseDbHelper.COLUMN_LICENSE_NUMBER, license.licenseNumber)
        values.put(LicenseDbHelper.COLUMN_NFC_CARD_NUMBER, license.nfcCardNumber)
        values.put(LicenseDbHelper.COLUMN_VALIDITY_DATE, license.validityDate)
        return values
    }
} 