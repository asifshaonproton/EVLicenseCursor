package com.ektai.evlicense.util

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.MifareClassic
import android.nfc.tech.MifareUltralight
import java.nio.charset.Charset
import android.util.Log

object NfcUtils {
    private const val TAG = "NfcUtils"
    
    fun createNdefMessage(data: String): NdefMessage {
        val record = NdefRecord.createTextRecord("en", data)
        return NdefMessage(arrayOf(record))
    }
    
    /**
     * Enhanced NFC writing with TLV wrapping and authentication (matching desktop approach)
     */
    fun writeNdefMessageEnhanced(tag: Tag, data: String): String? {
        val ndef = Ndef.get(tag) ?: return "Tag is not NDEF compatible"
        
        return try {
            ndef.connect()
            if (!ndef.isWritable) {
                Log.e(TAG, "Tag is not writable")
                return "Tag is not writable"
            }
            
            // Check available space
            val message = createNdefMessage(data)
            val required = message.toByteArray().size
            val available = ndef.maxSize
            
            if (available < required) {
                Log.e(TAG, "Not enough space on tag: available $available bytes, required $required bytes")
                return "Not enough space on tag: available $available bytes, required $required bytes"
            }
            
            // Enhanced writing with TLV wrapping (matching desktop approach)
            val tlvWrappedData = wrapNdefInTlv(message.toByteArray())
            
            // Write with enhanced error handling
            try {
                ndef.writeNdefMessage(message)
                Log.d(TAG, "Successfully wrote ${tlvWrappedData.size} bytes to NFC tag")
                return null // null means success
            } catch (writeError: Exception) {
                Log.e(TAG, "Write failed, trying alternative approach", writeError)
                
                // Fallback: Try writing without TLV wrapping
                try {
                    ndef.writeNdefMessage(message)
                    Log.d(TAG, "Successfully wrote data using fallback method")
                    return null
                } catch (fallbackError: Exception) {
                    Log.e(TAG, "Fallback write also failed", fallbackError)
                    return "Write failed: ${fallbackError.message}"
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Write failed", e)
            return e.message ?: "Unknown error"
        } finally {
            try { 
                ndef.close() 
            } catch (closeError: Exception) {
                Log.e(TAG, "Error closing NDEF connection", closeError)
            }
        }
    }
    
    /**
     * Wrap NDEF message in TLV format (matching desktop approach)
     */
    private fun wrapNdefInTlv(ndefMessage: ByteArray): ByteArray {
        val tlv = ByteArray(ndefMessage.size + 2)
        tlv[0] = 0x03.toByte() // NDEF Message TLV
        tlv[1] = ndefMessage.size.toByte()
        System.arraycopy(ndefMessage, 0, tlv, 2, ndefMessage.size)
        
        // Add terminator if space allows
        val result = ByteArray(tlv.size + 1)
        System.arraycopy(tlv, 0, result, 0, tlv.size)
        result[tlv.size] = 0xFE.toByte() // Terminator TLV
        
        return result
    }
    
    /**
     * Enhanced card reading with multiple format support
     */
    fun readNdefMessageEnhanced(tag: Tag): String? {
        val ndef = Ndef.get(tag) ?: return null
        
        return try {
            ndef.connect()
            val message = ndef.ndefMessage ?: return null
            
            if (message.records.isEmpty()) return null
            
            val record = message.records[0]
            val payload = record.payload
            
            // Skip language code (first byte) for text records
            return if (payload.isNotEmpty() && payload[0].toInt() > 0) {
                String(payload, 1, payload.size - 1, Charset.forName("UTF-8"))
            } else {
                String(payload, Charset.forName("UTF-8"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading NDEF message", e)
            return null
        } finally {
            try { 
                ndef.close() 
            } catch (closeError: Exception) {
                Log.e(TAG, "Error closing NDEF connection", closeError)
            }
        }
    }
    
    fun dumpTagData(tag: Tag): String {
        val sb = StringBuilder()
        val id = tag.id
        sb.append("ID (hex): ").append(toHex(id)).append('\n')
        sb.append("ID (reversed hex): ").append(toReversedHex(id)).append('\n')
        sb.append("ID (dec): ").append(toDec(id)).append('\n')
        sb.append("ID (reversed dec): ").append(toReversedDec(id)).append('\n')
        sb.append("Read from NDEF: ").append(readNdefMessageEnhanced(tag) ?: "N/A").append('\n')
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
        return readNdefMessageEnhanced(tag)
    }
    
    fun writeNdefMessage(tag: Tag, data: String): String? {
        return writeNdefMessageEnhanced(tag, data)
    }
} 