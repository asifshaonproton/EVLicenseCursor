package com.ektai.evlicense.util

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.app.PendingIntent
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity


class NfcManager(private val activity: AppCompatActivity) {
    
    // Built-in NFC components
    private var builtinNfcAdapter: NfcAdapter? = null
    private var nfcPendingIntent: PendingIntent? = null
    private var nfcIntentFilters: Array<IntentFilter>? = null
    
    // External NFC components (for ACR122U)
    private var acr122uReader: Acr122uReader? = null
    private var usbManager: UsbManager? = null
    private val usbReceiver = UsbDeviceReceiver()
    
    // NFC capabilities
    var hasBuiltinNfc = false
        private set
    var hasExternalNfc = false
        private set
    var isNfcEnabled = false
        private set
    
    // Callback interface for NFC events
    interface NfcCallback {
        fun onTagDiscovered(tagData: String, isBuiltinNfc: Boolean)
        fun onNfcWrite(success: Boolean, errorMessage: String?, isBuiltinNfc: Boolean)
        fun onNfcStatusChanged(enabled: Boolean, isBuiltinNfc: Boolean)
    }
    
    private var callback: NfcCallback? = null
    
    fun initialize(callback: NfcCallback) {
        this.callback = callback
        initializeBuiltinNfc()
        initializeExternalNfc()
    }
    
    private fun initializeBuiltinNfc() {
        builtinNfcAdapter = NfcAdapter.getDefaultAdapter(activity)
        hasBuiltinNfc = builtinNfcAdapter != null
        
        if (hasBuiltinNfc) {
            nfcPendingIntent = PendingIntent.getActivity(
                activity, 0, 
                Intent(activity, activity.javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), 
                PendingIntent.FLAG_MUTABLE
            )
            nfcIntentFilters = arrayOf(
                IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED),
                IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED),
                IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
            )
            
            isNfcEnabled = builtinNfcAdapter?.isEnabled == true
            callback?.onNfcStatusChanged(isNfcEnabled, true)
        }
    }
    
    private fun initializeExternalNfc() {
        usbManager = activity.getSystemService(Context.USB_SERVICE) as UsbManager
        
        // Check for already connected ACR122U devices
        checkForAcrDevices()
        
        // Register USB device receiver
        val filter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            addAction(ACTION_USB_PERMISSION)
        }
        activity.registerReceiver(usbReceiver, filter)
    }
    
    private fun checkForAcrDevices() {
        usbManager?.deviceList?.values?.forEach { device ->
            if (isAcrDevice(device)) {
                handleAcrDeviceAttached(device)
            }
        }
    }
    
    private fun isAcrDevice(device: UsbDevice): Boolean {
        return device.vendorId == ACR_VENDOR_ID && ACR_PRODUCT_IDS.contains(device.productId)
    }
    
    private fun handleAcrDeviceAttached(device: UsbDevice) {
        if (usbManager?.hasPermission(device) == true) {
            setupExternalNfc(device)
        } else {
            requestUsbPermission(device)
        }
    }
    
    private fun requestUsbPermission(device: UsbDevice) {
        val permissionIntent = PendingIntent.getBroadcast(
            activity, 0, 
            Intent(ACTION_USB_PERMISSION), 
            PendingIntent.FLAG_IMMUTABLE
        )
        usbManager?.requestPermission(device, permissionIntent)
    }
    
    private fun setupExternalNfc(device: UsbDevice) {
        try {
            // Initialize ACR122U reader
            acr122uReader = Acr122uReader(activity)
            val connected = acr122uReader!!.initialize(object : Acr122uReader.Acr122uCallback {
                override fun onDeviceConnected() {
                    hasExternalNfc = true
                    callback?.onNfcStatusChanged(true, false)
                    Toast.makeText(activity, "ACR122U NFC Reader connected", Toast.LENGTH_SHORT).show()
                    
                    // Start polling for cards
                    acr122uReader?.startPolling()
                }
                
                override fun onDeviceDisconnected() {
                    hasExternalNfc = false
                    callback?.onNfcStatusChanged(false, false)
                    Toast.makeText(activity, "ACR122U NFC Reader disconnected", Toast.LENGTH_SHORT).show()
                }
                
                override fun onCardDetected(uid: String) {
                    val tagData = "External NFC Reader (ACR122U)\nCard UID: $uid\nTimestamp: ${System.currentTimeMillis()}"
                    callback?.onTagDiscovered(tagData, false)
                }
                
                override fun onError(error: String) {
                    Toast.makeText(activity, "ACR122U Error: $error", Toast.LENGTH_LONG).show()
                }
            })
            
            if (!connected) {
                hasExternalNfc = false
                callback?.onNfcStatusChanged(false, false)
                Toast.makeText(activity, "Failed to connect to ACR122U", Toast.LENGTH_LONG).show()
            }
            
        } catch (e: Exception) {
            hasExternalNfc = false
            callback?.onNfcStatusChanged(false, false)
            Toast.makeText(activity, "Failed to initialize ACR122U: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    

    
    fun enableForegroundDispatch() {
        if (hasBuiltinNfc && isNfcEnabled) {
            builtinNfcAdapter?.enableForegroundDispatch(
                activity, 
                nfcPendingIntent, 
                nfcIntentFilters, 
                null
            )
        }
        
        // External NFC (ACR122U) is always polling when connected
    }
    
    fun disableForegroundDispatch() {
        if (hasBuiltinNfc) {
            builtinNfcAdapter?.disableForegroundDispatch(activity)
        }
        
        // External NFC (ACR122U) polling is managed automatically
    }
    
    fun handleNewIntent(intent: Intent): Boolean {
        val action = intent.action
        
        // Handle built-in NFC
        if (action == NfcAdapter.ACTION_NDEF_DISCOVERED ||
            action == NfcAdapter.ACTION_TAG_DISCOVERED ||
            action == NfcAdapter.ACTION_TECH_DISCOVERED) {
            
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            if (tag != null) {
                val tagData = NfcUtils.dumpTagData(tag)
                callback?.onTagDiscovered(tagData, true)
                return true
            }
        }
        
        // External NFC (ACR122U) handles cards automatically via polling
        
        return false
    }
    
    fun writeNdefData(data: String, useBuiltinNfc: Boolean = true): Boolean {
        return if (useBuiltinNfc && hasBuiltinNfc) {
            // Will be handled in next tag discovery
            true
        } else if (!useBuiltinNfc && hasExternalNfc) {
            writeToExternalNfc(data)
        } else {
            false
        }
    }
    
    private fun writeToExternalNfc(data: String): Boolean {
        return try {
            // This would be implemented with the specific external NFC API
            // For now, returning false as a placeholder
            callback?.onNfcWrite(false, "External NFC write not yet implemented", false)
            false
        } catch (e: Exception) {
            callback?.onNfcWrite(false, e.message, false)
            false
        }
    }
    
    fun getNfcStatus(): String {
        val status = StringBuilder()
        
        if (hasBuiltinNfc) {
            status.append("Built-in NFC: ${if (isNfcEnabled) "Enabled" else "Disabled"}\n")
        } else {
            status.append("Built-in NFC: Not Available\n")
        }
        
        if (hasExternalNfc) {
            status.append("External NFC: Connected\n")
        } else {
            status.append("External NFC: Not Connected\n")
        }
        
        return status.toString().trim()
    }
    
    fun cleanup() {
        try {
            activity.unregisterReceiver(usbReceiver)
        } catch (e: Exception) {
            // Receiver might not be registered
        }
        
        disableForegroundDispatch()
        acr122uReader?.disconnect()
        acr122uReader = null
    }
    
    private inner class UsbDeviceReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    if (device != null && isAcrDevice(device)) {
                        handleAcrDeviceAttached(device)
                    }
                }
                
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    if (device != null && isAcrDevice(device)) {
                        acr122uReader?.disconnect()
                        acr122uReader = null
                        hasExternalNfc = false
                        callback?.onNfcStatusChanged(false, false)
                    }
                }
                
                ACTION_USB_PERMISSION -> {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        device?.let { setupExternalNfc(it) }
                    } else {
                        Toast.makeText(activity, "USB permission denied for ACR122U", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
    
    companion object {
        private const val ACTION_USB_PERMISSION = "com.ektai.evlicense.USB_PERMISSION"
        private const val ACR_VENDOR_ID = 1839 // ACS vendor ID
        
        private val ACR_PRODUCT_IDS = setOf(
            8704, // ACR122U
            8738, // ACR1222L
            8753, // ACR1251U
            8754, // ACR1252U
            8757, // ACR1255U-J1
            8785, // ACR1281U-C1
            8787  // ACR1283L
        )
    }
}