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
    
    fun dumpTagData(tag: Tag): String {
        val sb = StringBuilder()
        val id = tag.id
        sb.append("ID (hex): ").append(toHex(id)).append('\n')
        sb.append("ID (reversed hex): ").append(toReversedHex(id)).append('\n')
        sb.append("ID (dec): ").append(toDec(id)).append('\n')
        sb.append("ID (reversed dec): ").append(toReversedDec(id)).append('\n')
        sb.append("Read from NDEF: ").append(readNdefMessage(tag) ?: "N/A").append('\n')
        sb.append('\n')

        val prefix = "android.nfc.tech."
        sb.append("Technologies: ")
        for (tech in tag.techList) {
            sb.append(tech.substring(prefix.length))
            sb.append(", ")
        }
        if (tag.techList.isNotEmpty()) {
            sb.delete(sb.length - 2, sb.length)
        }
        sb.append('\n')

        return sb.toString()
    }
    
    private fun toHex(bytes: ByteArray): String {
        val sb = StringBuilder()
        for (i in bytes.indices.reversed()) {
            val b = bytes[i].toInt() and 0xff
            if (b < 0x10) sb.append('0')
            sb.append(Integer.toHexString(b))
            if (i > 0) {
                sb.append(" ")
            }
        }
        return sb.toString()
    }

    private fun toReversedHex(bytes: ByteArray): String {
        val sb = StringBuilder()
        for (i in bytes.indices) {
            if (i > 0) {
                sb.append(" ")
            }
            val b = bytes[i].toInt() and 0xff
            if (b < 0x10) sb.append('0')
            sb.append(Integer.toHexString(b))
        }
        return sb.toString()
    }

    private fun toDec(bytes: ByteArray): Long {
        var result: Long = 0
        var factor: Long = 1
        for (i in bytes.indices) {
            val value = bytes[i].toLong() and 0xffL
            result += value * factor
            factor *= 256L
        }
        return result
    }

    private fun toReversedDec(bytes: ByteArray): Long {
        var result: Long = 0
        var factor: Long = 1
        for (i in bytes.indices.reversed()) {
            val value = bytes[i].toLong() and 0xffL
            result += value * factor
            factor *= 256L
        }
        return result
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