package com.ektai.evlicense.util

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.Tag
import android.nfc.tech.Ndef
import java.nio.charset.Charset

object NfcUtils {
    fun createNdefMessage(data: String): NdefMessage {
        val record = NdefRecord.createTextRecord("en", data)
        return NdefMessage(arrayOf(record))
    }
    fun readNdefMessage(tag: Tag): String? {
        val ndef = Ndef.get(tag) ?: return null
        ndef.connect()
        val message = ndef.ndefMessage ?: return null // Safe null check
        val record = message.records.firstOrNull() ?: return null
        val payload = record.payload
        // Skip language code (first byte)
        return payload.drop(1).toByteArray().toString(Charset.forName("UTF-8"))
    }
    fun writeNdefMessage(tag: Tag, data: String): String? {
        val ndef = Ndef.get(tag) ?: return "Tag is not NDEF compatible"
        return try {
            ndef.connect()
            if (!ndef.isWritable) {
                android.util.Log.e("NfcUtils", "Tag is not writable")
                return "Tag is not writable"
            }
            val message = createNdefMessage(data)
            val required = message.toByteArray().size
            val available = ndef.maxSize
            if (available < required) {
                android.util.Log.e("NfcUtils", "Not enough space on tag: available $available bytes, required $required bytes")
                return "Not enough space on tag: available $available bytes, required $required bytes"
            }
            ndef.writeNdefMessage(message)
            null // null means success
        } catch (e: Exception) {
            android.util.Log.e("NfcUtils", "Write failed", e)
            e.message ?: "Unknown error"
        } finally {
            try { ndef.close() } catch (_: Exception) {}
        }
    }
} 