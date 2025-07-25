package com.ektai.evlicense.ui

import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.view.MenuItem
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.GravityCompat
import com.ektai.evlicense.R
import com.google.android.material.navigation.NavigationView
import androidx.drawerlayout.widget.DrawerLayout
import android.widget.Toast
import android.nfc.tech.MifareClassic
import android.nfc.tech.MifareUltralight
import com.ektai.evlicense.util.NfcUtils
import com.ektai.evlicense.util.NfcManager

class MainActivity : AppCompatActivity(), NavigationView.OnNavigationItemSelectedListener, NfcManager.NfcCallback {
    private var nfcAdapter: NfcAdapter? = null
    private var nfcPendingIntent: PendingIntent? = null
    private var nfcIntentFilters: Array<IntentFilter>? = null
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    var pendingWriteData: String? = null
    
    // New NFC Manager for handling both built-in and external NFC
    private lateinit var nfcManager: NfcManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        android.util.Log.d("MainActivity", "onCreate called, intent: ${intent?.action}, hash: ${this.hashCode()}")
        setContentView(R.layout.activity_main)

        // Make the app fullscreen
        window.decorView.systemUiVisibility = (
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
            or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )

        val toolbar = findViewById<Toolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)

        drawerLayout = findViewById(R.id.drawer_layout)
        // Find navigationView from the included drawer_content layout
        navigationView = findViewById(R.id.navigation_view)
        navigationView.setNavigationItemSelectedListener(this)

        // Set profile name in drawer header
        val profileNameText = findViewById<android.widget.TextView>(R.id.textProfileName)
        val userName = getLoggedInUserName()
        profileNameText?.text = userName ?: "Prodip Talukdar"

        val toggle = ActionBarDrawerToggle(
            this, drawerLayout, toolbar,
            R.string.navigation_drawer_open, R.string.navigation_drawer_close
        )
        drawerLayout.addDrawerListener(toggle)
        toggle.syncState()

        // Initialize the new NFC Manager
        nfcManager = NfcManager(this)
        nfcManager.initialize(this)
        
        // Keep the old NFC adapter for backward compatibility
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        nfcPendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_MUTABLE
        )
        nfcIntentFilters = arrayOf(IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED))

        if (savedInstanceState == null) {
            // Only show dashboard if this is a launcher start, not an NFC intent
            val action = intent?.action
            if (action == Intent.ACTION_MAIN || action == Intent.ACTION_VIEW) {
                showDashboard()
                navigationView.setCheckedItem(R.id.nav_dashboard)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        android.util.Log.d("MainActivity", "onResume called")
        nfcManager.enableForegroundDispatch()
        enableNfcForegroundDispatch()
    }

    override fun onPause() {
        super.onPause()
        nfcManager.disableForegroundDispatch()
        disableNfcForegroundDispatch()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        nfcManager.cleanup()
    }

    override fun onNavigationItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            R.id.nav_dashboard -> showDashboard()
            R.id.nav_licenses -> showLicenseList()
            R.id.nav_add_license -> showLicenseEdit(null)
            R.id.nav_license_manager -> showLicenseList() // Or show a LicenseManagerFragment if you create one
            R.id.nav_export_data -> {
                android.widget.Toast.makeText(this, "Export Data not implemented", android.widget.Toast.LENGTH_SHORT).show()
            }
            R.id.nav_user_manager -> {
                android.widget.Toast.makeText(this, "User Manager not implemented", android.widget.Toast.LENGTH_SHORT).show()
            }
            R.id.nav_logout -> finish() // Or implement logout logic
        }
        drawerLayout.closeDrawer(GravityCompat.START)
        return true
    }

    fun showDashboard() {
        supportActionBar?.title = getString(R.string.app_name)
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, DashboardFragment(), "Dashboard")
            .commit()
    }
    fun showLicenseList() {
        supportActionBar?.title = "License List"
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, LicenseListFragment(), "LicenseList")
            .commit()
    }
    fun showLicenseDetail(license: com.ektai.evlicense.data.LicenseEntity) {
        supportActionBar?.title = "License Details"
        val fragment = LicenseDetailFragment().apply {
            arguments = Bundle().apply { putParcelable(LicenseDetailFragment.ARG_LICENSE, license) }
        }
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment, "LicenseDetail")
            .addToBackStack(null)
            .commit()
    }

    fun showLicenseNfcDetail(tagData: String) {
        supportActionBar?.title = "NFC Card Details"
        android.util.Log.d("MainActivity", "showLicenseNfcDetail: starting fragment transaction")
        val fragment = LicenseNFCDetailFragment.newInstance(tagData)
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment, "LicenseNFCDetail")
            .addToBackStack(null)
            .commit()
        android.util.Log.d("MainActivity", "showLicenseNfcDetail: fragment transaction committed")
    }

    fun showLicenseEdit(license: com.ektai.evlicense.data.LicenseEntity? = null) {
        supportActionBar?.title = "Edit License"
        val fragment = LicenseEditFragment().apply {
            arguments = Bundle().apply { license?.let { putParcelable("license", it) } }
        }
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment, "LicenseEdit")
            .addToBackStack(null)
            .commit()
    }
    fun enableNfcForegroundDispatch() {
        nfcAdapter?.enableForegroundDispatch(this, nfcPendingIntent, nfcIntentFilters, null)
    }
    fun disableNfcForegroundDispatch() {
        nfcAdapter?.disableForegroundDispatch(this)
    }
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        val action = intent?.action
        android.util.Log.d("MainActivity", "onNewIntent called, intent: $action, hash: ${this.hashCode()}")
        Toast.makeText(this, "onNewIntent called: $action", Toast.LENGTH_SHORT).show()
        
        // Try to handle with new NFC Manager first
        if (intent != null && nfcManager.handleNewIntent(intent)) {
            return
        }
        
        // Fallback to original NFC handling for backward compatibility
        if (action == NfcAdapter.ACTION_NDEF_DISCOVERED ||
            action == NfcAdapter.ACTION_TAG_DISCOVERED ||
            action == NfcAdapter.ACTION_TECH_DISCOVERED) {
            val tag = intent?.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            if (tag != null) {
                if (pendingWriteData != null) {
                    // Write mode
                    val error = com.ektai.evlicense.util.NfcUtils.writeNdefMessage(tag, pendingWriteData!!)
                    if (error == null) {
                        Toast.makeText(this, "NFC write successful!", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(this, "NFC write failed: $error", Toast.LENGTH_LONG).show()
                    }
                    pendingWriteData = null
                } else {
                    // Read mode - use NfcManager callback instead
                    onTagDiscovered(NfcUtils.dumpTagData(tag), true)
                }
            }
        }
    }

    private fun dumpTagData(tag: Tag): String {
        val sb = StringBuilder()
        val id = tag.id
        sb.append("ID (hex): ").append(toHex(id)).append('\n')
        sb.append("ID (reversed hex): ").append(toReversedHex(id)).append('\n')
        sb.append("ID (dec): ").append(toDec(id)).append('\n')
        sb.append("ID (reversed dec): ").append(toReversedDec(id)).append('\n')
        sb.append("Read from NDEF: ").append(NfcUtils.readNdefMessage(tag) ?: "N/A").append('\n')
        sb.append('\n')

        val prefix = "android.nfc.tech."
        sb.append("Technologies: ")
        for (tech in tag.techList) {
            sb.append(tech.substring(prefix.length))
            sb.append(", ")
        }
        sb.delete(sb.length - 2, sb.length)
        sb.append('\n')

        for (tech in tag.techList) {
            if (tech == MifareClassic::class.java.name) {
                sb.append('\n')
                try {
                    val mifareTag = MifareClassic.get(tag)
                    val type = when (mifareTag.type) {
                        MifareClassic.TYPE_CLASSIC -> "Classic"
                        MifareClassic.TYPE_PLUS -> "Plus"
                        MifareClassic.TYPE_PRO -> "Pro"
                        else -> "Unknown"
                    }
                    sb.appendLine("Mifare Classic type: $type")
                    sb.appendLine("Mifare size: ${mifareTag.size} bytes")
                    sb.appendLine("Mifare sectors: ${mifareTag.sectorCount}")
                    sb.appendLine("Mifare blocks: ${mifareTag.blockCount}")
                } catch (e: Exception) {
                    sb.appendLine("Mifare classic error: ${e.message}")
                }
            }
            if (tech == MifareUltralight::class.java.name) {
                sb.append('\n')
                val mifareUlTag = MifareUltralight.get(tag)
                val type = when (mifareUlTag.type) {
                    MifareUltralight.TYPE_ULTRALIGHT -> "Ultralight"
                    MifareUltralight.TYPE_ULTRALIGHT_C -> "Ultralight C"
                    else -> "Unknown"
                }
                sb.append("Mifare Ultralight type: ")
                sb.append(type)
            }
        }
        val result = sb.toString()
        android.util.Log.d("MainActivity", "dumpTagData: $result")
        return result
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

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START)
        } else {
            super.onBackPressed()
        }
    }
    
    // NfcManager.NfcCallback implementation
    override fun onTagDiscovered(tagData: String, isBuiltinNfc: Boolean) {
        val nfcType = if (isBuiltinNfc) "Built-in" else "External ACR122U"
        android.util.Log.d("MainActivity", "Tag discovered via $nfcType NFC: ${tagData.take(100)}")
        
        if (tagData.contains("Read from NDEF: N/A")) {
            Toast.makeText(this, "No NDEF data found on this card ($nfcType)", Toast.LENGTH_LONG).show()
        } else {
            Toast.makeText(this, "Tag detected via $nfcType NFC", Toast.LENGTH_SHORT).show()
        }
        
        // Always show the NFC detail screen regardless of source
        showLicenseNfcDetail(tagData)
    }
    
    override fun onNfcWrite(success: Boolean, errorMessage: String?, isBuiltinNfc: Boolean) {
        val nfcType = if (isBuiltinNfc) "Built-in" else "External ACR122U"
        if (success) {
            Toast.makeText(this, "NFC write successful via $nfcType!", Toast.LENGTH_LONG).show()
        } else {
            Toast.makeText(this, "NFC write failed via $nfcType: $errorMessage", Toast.LENGTH_LONG).show()
        }
        pendingWriteData = null
    }
    
    override fun onNfcStatusChanged(enabled: Boolean, isBuiltinNfc: Boolean) {
        val nfcType = if (isBuiltinNfc) "Built-in" else "External ACR122U"
        val status = if (enabled) "enabled" else "disabled"
        android.util.Log.d("MainActivity", "$nfcType NFC $status")
        
        // Update UI or show notification as needed
        if (!isBuiltinNfc) {
            // This is for external NFC status changes
            val message = if (enabled) "External NFC Reader connected" else "External NFC Reader disconnected"
            // Don't show toast here as it's already handled in NfcManager
        }
    }
    
    // Helper method to get current NFC status
    fun getNfcStatusReport(): String {
        return nfcManager.getNfcStatus()
    }
}

private fun getLoggedInUserName(): String? {
    // TODO: Implement actual user session logic
    // Return the user's name if logged in, otherwise null
    return null // or e.g. "Asif Hossain" if you want to test
} 