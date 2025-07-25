package com.ektai.evlicense.util

import android.content.Context
import android.hardware.usb.*
import android.util.Log
import java.nio.ByteBuffer

class Acr122uReader(private val context: Context) {
    
    companion object {
        private const val TAG = "Acr122uReader"
        private const val ACR122U_VENDOR_ID = 1839 // ACS vendor ID (0x072F)
        private const val ACR122U_PRODUCT_ID = 8704 // ACR122U product ID (0x2200)
        private const val INTERFACE_NUMBER = 0
        private const val ENDPOINT_IN = 0x82
        private const val ENDPOINT_OUT = 0x02
        
        // ACR122U specific commands
        private val GET_FIRMWARE_VERSION = byteArrayOf(0xFF.toByte(), 0x00, 0x48, 0x00, 0x00)
        private val LOAD_AUTHENTICATION_KEYS = byteArrayOf(0xFF.toByte(), 0x82, 0x00, 0x00, 0x06)
        private val GET_UID = byteArrayOf(0xFF.toByte(), 0xCA, 0x00, 0x00, 0x00)
        
        // PICC commands for card detection
        private val PICC_REQUEST_TYPE_A = byteArrayOf(0xFF.toByte(), 0x00, 0x00, 0x00, 0x04, 0xD4.toByte(), 0x4A, 0x01, 0x00)
    }
    
    private var usbManager: UsbManager? = null
    private var device: UsbDevice? = null
    private var connection: UsbDeviceConnection? = null
    private var interfaceDevice: UsbInterface? = null
    private var endpointIn: UsbEndpoint? = null
    private var endpointOut: UsbEndpoint? = null
    
    interface Acr122uCallback {
        fun onDeviceConnected()
        fun onDeviceDisconnected()
        fun onCardDetected(uid: String)
        fun onError(error: String)
    }
    
    private var callback: Acr122uCallback? = null
    
    fun initialize(callback: Acr122uCallback): Boolean {
        this.callback = callback
        usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
        
        return findAndConnectDevice()
    }
    
    private fun findAndConnectDevice(): Boolean {
        val deviceList = usbManager?.deviceList
        
        if (deviceList != null) {
            for (device in deviceList.values) {
                if (device.vendorId == ACR122U_VENDOR_ID && device.productId == ACR122U_PRODUCT_ID) {
                    return connectToDevice(device)
                }
            }
        }
        
        Log.d(TAG, "ACR122U device not found")
        return false
    }
    
    private fun connectToDevice(device: UsbDevice): Boolean {
        this.device = device
        
        if (usbManager?.hasPermission(device) != true) {
            Log.d(TAG, "No permission for ACR122U device")
            callback?.onError("No permission for ACR122U device")
            return false
        }
        
        connection = usbManager?.openDevice(device)
        
        if (connection == null) {
            Log.e(TAG, "Failed to open connection to ACR122U")
            callback?.onError("Failed to open connection to ACR122U")
            return false
        }
        
        interfaceDevice = device.getInterface(INTERFACE_NUMBER)
        
        if (interfaceDevice == null) {
            Log.e(TAG, "Failed to get USB interface")
            callback?.onError("Failed to get USB interface")
            return false
        }
        
        if (!connection!!.claimInterface(interfaceDevice, true)) {
            Log.e(TAG, "Failed to claim USB interface")
            callback?.onError("Failed to claim USB interface")
            return false
        }
        
        // Find endpoints
        for (i in 0 until interfaceDevice!!.endpointCount) {
            val endpoint = interfaceDevice!!.getEndpoint(i)
            if (endpoint.direction == UsbConstants.USB_DIR_IN && endpoint.address == ENDPOINT_IN) {
                endpointIn = endpoint
            } else if (endpoint.direction == UsbConstants.USB_DIR_OUT && endpoint.address == ENDPOINT_OUT) {
                endpointOut = endpoint
            }
        }
        
        if (endpointIn == null || endpointOut == null) {
            Log.e(TAG, "Failed to find required endpoints")
            callback?.onError("Failed to find required endpoints")
            return false
        }
        
        Log.d(TAG, "Successfully connected to ACR122U")
        callback?.onDeviceConnected()
        
        // Test the connection by getting firmware version
        getFirmwareVersion()
        
        return true
    }
    
    private fun sendCommand(command: ByteArray): ByteArray? {
        if (connection == null || endpointOut == null || endpointIn == null) {
            Log.e(TAG, "Device not connected")
            return null
        }
        
        try {
            // Send command
            val sentBytes = connection!!.bulkTransfer(endpointOut, command, command.size, 5000)
            if (sentBytes < 0) {
                Log.e(TAG, "Failed to send command")
                return null
            }
            
            Log.d(TAG, "Sent ${sentBytes} bytes: ${command.joinToString(" ") { "%02X".format(it) }}")
            
            // Read response
            val response = ByteArray(300) // ACR122U max response size
            val receivedBytes = connection!!.bulkTransfer(endpointIn, response, response.size, 5000)
            
            if (receivedBytes < 0) {
                Log.e(TAG, "Failed to receive response")
                return null
            }
            
            val actualResponse = response.copyOfRange(0, receivedBytes)
            Log.d(TAG, "Received ${receivedBytes} bytes: ${actualResponse.joinToString(" ") { "%02X".format(it) }}")
            
            return actualResponse
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending command", e)
            callback?.onError("Communication error: ${e.message}")
            return null
        }
    }
    
    fun getFirmwareVersion(): String? {
        val response = sendCommand(GET_FIRMWARE_VERSION)
        
        if (response != null && response.size >= 4) {
            // Parse firmware version from response
            val version = response.drop(2).dropLast(2).toByteArray().toString(Charsets.UTF_8)
            Log.d(TAG, "Firmware version: $version")
            return version
        }
        
        return null
    }
    
    fun detectCard(): String? {
        // Send PICC Request Type A command to detect cards
        val response = sendCommand(PICC_REQUEST_TYPE_A)
        
        if (response != null && response.size > 6) {
            // Parse response to extract UID
            val uid = extractUidFromResponse(response)
            if (uid != null) {
                Log.d(TAG, "Card detected with UID: $uid")
                callback?.onCardDetected(uid)
                return uid
            }
        }
        
        return null
    }
    
    private fun extractUidFromResponse(response: ByteArray): String? {
        try {
            // ACR122U response format varies, this is a simplified parsing
            // Look for the status bytes and UID data
            if (response.size >= 10) {
                // Extract UID bytes (typically 4-7 bytes after status)
                val uidStart = 6 // Adjust based on actual response format
                val uidLength = minOf(7, response.size - uidStart - 2) // Max 7 bytes UID
                
                if (uidLength > 0) {
                    val uidBytes = response.copyOfRange(uidStart, uidStart + uidLength)
                    return uidBytes.joinToString("") { "%02X".format(it) }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting UID", e)
        }
        
        return null
    }
    
    fun startPolling() {
        // Start a background thread to continuously poll for cards
        Thread {
            while (connection != null) {
                try {
                    detectCard()
                    Thread.sleep(1000) // Poll every second
                } catch (e: InterruptedException) {
                    break
                } catch (e: Exception) {
                    Log.e(TAG, "Error during polling", e)
                }
            }
        }.start()
    }
    
    fun disconnect() {
        try {
            connection?.releaseInterface(interfaceDevice)
            connection?.close()
            connection = null
            device = null
            interfaceDevice = null
            endpointIn = null
            endpointOut = null
            
            Log.d(TAG, "Disconnected from ACR122U")
            callback?.onDeviceDisconnected()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting", e)
        }
    }
    
    fun isConnected(): Boolean {
        return connection != null && device != null
    }
    
    fun getDeviceInfo(): String {
        return if (device != null) {
            "ACR122U - Vendor: ${device!!.vendorId}, Product: ${device!!.productId}"
        } else {
            "Not connected"
        }
    }
}