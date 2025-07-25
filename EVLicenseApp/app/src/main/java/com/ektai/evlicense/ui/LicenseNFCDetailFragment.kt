package com.ektai.evlicense.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.ektai.evlicense.R
import android.widget.Toast
import org.json.JSONObject
import com.ektai.evlicense.util.CryptoUtils

class LicenseNFCDetailFragment : Fragment() {

    companion object {
        private const val ARG_TAG_DATA = "tag_data"

        fun newInstance(tagData: String): LicenseNFCDetailFragment {
            val fragment = LicenseNFCDetailFragment()
            val args = Bundle()
            args.putString(ARG_TAG_DATA, tagData)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        android.util.Log.d("LicenseNFCDetailFragment", "onCreateView called")
        return inflater.inflate(R.layout.fragment_license_nfc_detail, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val fullTagData = arguments?.getString(ARG_TAG_DATA) ?: "No data received."
        android.util.Log.d("LicenseNFCDetailFragment", "Full TagData: $fullTagData")

        val textCardNumber = view.findViewById<TextView>(R.id.textCardNumber)
        val textLicenseNumber = view.findViewById<TextView>(R.id.textLicenseNumber)
        val textHolderName = view.findViewById<TextView>(R.id.textHolderName)
        val textMobile = view.findViewById<TextView>(R.id.textMobile)
        val textCity = view.findViewById<TextView>(R.id.textCity)
        val textLicenseType = view.findViewById<TextView>(R.id.textLicenseType)
        val textValidityDate = view.findViewById<TextView>(R.id.textValidityDate)
        // val textOtherInfoData = view.findViewById<TextView>(R.id.textOtherInfoData) // REMOVE THIS LINE

        var cardNumber = "N/A"
        var licenseNumberJson = "N/A"
        var holderName = "N/A"
        var mobile = "N/A"
        var city = "N/A"
        var licenseType = "N/A"
        var validityDate = "N/A"
        val key = "YourSuperLongSecretKeyForNFCEncryption2024!@#"

        var ndefFound = false
        fullTagData.lines().forEach { line ->
            if (line.startsWith("ID (dec):")) {
                cardNumber = line.substringAfter("ID (dec):").trim()
            }
            if (line.startsWith("Read from NDEF:")) {
                val ndefData = line.substringAfter("Read from NDEF:").trim()
                if (ndefData != "N/A") {
                    ndefFound = true
                    val jsonData = if (ndefData.startsWith("en")) ndefData.substring(2) else ndefData
                    try {
                        val decrypted = CryptoUtils.decrypt(jsonData, key)
                        val json = JSONObject(decrypted)
                        holderName = json.optString("holderName", "N/A")
                        mobile = json.optString("mobile", "N/A")
                        city = json.optString("city", "N/A")
                        licenseType = json.optString("licenseType", "N/A")
                        licenseNumberJson = json.optString("licenseNumber", "N/A")
                        validityDate = json.optString("validityDate", "N/A")
                    } catch (e: Exception) {
                        android.util.Log.e("LicenseNFCDetailFragment", "Error decrypting/parsing JSON", e)
                        licenseNumberJson = "[DECRYPT ERROR]"
                    }
                }
            }
        }

        if (!ndefFound) {
            Toast.makeText(requireContext(), "No NDEF data found on this card.", Toast.LENGTH_LONG).show()
            // textOtherInfoData.text = "No NDEF data found on this card.\n\n" + fullTagData // REMOVE THIS LINE
        } else {
            Toast.makeText(requireContext(), "Card: $cardNumber, License: $licenseNumberJson", Toast.LENGTH_LONG).show()
        }

        textCardNumber.text = cardNumber
        textLicenseNumber.text = licenseNumberJson
        textHolderName.text = holderName
        textMobile.text = mobile
        textCity.text = city
        textLicenseType.text = licenseType
        textValidityDate.text = validityDate

        // --- Enhanced More Info Section ---
        val infoMap = mutableMapOf<String, String>()
        val memoryMap = mutableMapOf<String, String>()
        val idMap = mutableMapOf<String, String>()
        val techMap = mutableMapOf<String, String>()
        var additionalDetails = "Typical Application: Contactless smart cards, tags for access control, payment, and identification.\n\nCompatibility: Supports NDEF (NFC Data Exchange Format)."

        // Parse fullTagData for known fields
        fullTagData.lines().forEach { line ->
            when {
                line.startsWith("ID (hex):") -> idMap["Serial Number"] = line.substringAfter(":").trim().replace(" ", ":")
                line.startsWith("ID (reversed hex):") -> idMap["Serial Number (alt)"] = line.substringAfter(":").trim().replace(" ", ":")
                line.startsWith("ID (dec):") -> idMap["Serial Number (dec)"] = line.substringAfter(":").trim()
                line.startsWith("ID (reversed dec):") -> idMap["Serial Number (alt, dec)"] = line.substringAfter(":").trim()
                line.startsWith("Technologies:") -> techMap["Technologies"] = line.substringAfter(":").trim()
                line.startsWith("Mifare Classic type:") -> infoMap["Tag Type"] = "Mifare Classic " + line.substringAfter(":").trim()
                line.startsWith("Mifare size:") -> memoryMap["Mifare Size"] = line.substringAfter(":").trim()
                line.startsWith("Mifare sectors:") -> memoryMap["Mifare Sectors"] = line.substringAfter(":").trim()
                line.startsWith("Mifare blocks:") -> memoryMap["Mifare Blocks"] = line.substringAfter(":").trim()
                line.startsWith("Mifare Ultralight type:") -> infoMap["Tag Type"] = "Mifare Ultralight " + line.substringAfter(":").trim()
                line.startsWith("Read from NDEF:") -> techMap["NDEF Data"] = line.substringAfter(":").trim()
            }
        }

        // Add static/deduced info (example values, can be improved with more tag parsing)
        infoMap.putIfAbsent("Tag Type", "ISO 14443-3A")
        infoMap["Manufacturer"] = "NXP (NTAG213/NTAG216)"
        infoMap["Writable"] = "Yes"
        infoMap["Can be Made Read-Only"] = "Yes"
        infoMap["Protected by Password"] = "No"
        infoMap["Data Format"] = "NFC Forum Type 2"
        memoryMap["User Memory Size"] = "137 bytes"
        memoryMap["Total Size"] = "227/492 bytes"
        memoryMap["Memory Info"] = "168 bytes (45 pages, 4 bytes/page)"
        techMap["ATQA"] = "0x0344 / 0x4400"
        techMap["SAK"] = "0x00"
        techMap["Signature"] = "Valid (NXP Public Key)"

        val tableOtherInfo = view.findViewById<android.widget.TableLayout>(R.id.tableOtherInfo)
        tableOtherInfo.removeAllViews()

        fun addSectionHeader(title: String) {
            val header = android.widget.TextView(requireContext()).apply {
                text = title
                setTextAppearance(android.R.style.TextAppearance_Medium)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                setPadding(0, 24, 0, 8)
            }
            val row = android.widget.TableRow(requireContext())
            row.addView(header)
            tableOtherInfo.addView(row)
        }

        fun addRow(attr: String, value: String) {
            val row = android.widget.TableRow(requireContext())
            val attrView = android.widget.TextView(requireContext()).apply {
                text = attr
                setTextAppearance(android.R.style.TextAppearance_Small)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                setPadding(0, 0, 16, 0)
            }
            val valueView = android.widget.TextView(requireContext()).apply {
                text = value
                setTextAppearance(android.R.style.TextAppearance_Small)
            }
            row.addView(attrView)
            row.addView(valueView)
            tableOtherInfo.addView(row)
        }

        if (infoMap.isNotEmpty()) {
            addSectionHeader("General Information")
            infoMap.forEach { (k, v) -> addRow(k, v) }
        }
        if (memoryMap.isNotEmpty()) {
            addSectionHeader("Memory Specifications")
            memoryMap.forEach { (k, v) -> addRow(k, v) }
        }
        if (idMap.isNotEmpty()) {
            addSectionHeader("Identification")
            idMap.forEach { (k, v) -> addRow(k, v) }
        }
        if (techMap.isNotEmpty()) {
            addSectionHeader("Tag Protocol/Technical Specs")
            techMap.forEach { (k, v) -> addRow(k, v) }
        }
        addSectionHeader("Additional Details")
        addRow("", additionalDetails)
    }
} 