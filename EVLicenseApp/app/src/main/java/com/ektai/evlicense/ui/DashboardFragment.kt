package com.ektai.evlicense.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.ektai.evlicense.R
import com.google.android.material.card.MaterialCardView
import android.nfc.Tag
import com.ektai.evlicense.data.LicenseEntity
import com.ektai.evlicense.util.NfcUtils
import android.widget.EditText
import com.ektai.evlicense.ui.MainActivity
import android.widget.Toast
import android.content.Intent
import android.nfc.NfcAdapter

class DashboardFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_dashboard, container, false)

        // License type cards
        val licenseTypes = listOf(
            LicenseTypeCard("Auto License (A)", "A 0000", R.drawable.ic_ev_logo, R.color.ev_blue),
            LicenseTypeCard("Rickshaw License (R)", "R 0000", R.drawable.ic_ev_logo, R.color.ev_green),
            LicenseTypeCard("Van License (V)", "V 0000", R.drawable.ic_ev_logo, R.color.ev_black),
            LicenseTypeCard("Mishuk (M)", "M 0000", R.drawable.ic_ev_logo, R.color.ev_red),
            LicenseTypeCard("Pushcart/Privet (P)", "P 0000", R.drawable.ic_ev_logo, R.color.ev_gray)
        )
        val licenseTypeAdapter = LicenseTypeCardAdapter(licenseTypes)
        val recyclerLicenseTypes = view.findViewById<RecyclerView>(R.id.recyclerLicenseTypes)
        recyclerLicenseTypes.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        recyclerLicenseTypes.adapter = licenseTypeAdapter

        // Total licenses (sample)
        view.findViewById<TextView>(R.id.textTotalLicenses).text = "5"

        // Recent licenses (sample)
        val recentLicenses = listOf(
            RecentLicense("A 0001", "John Doe", "Auto (A)"),
            RecentLicense("R 0002", "Jane Smith", "Rickshaw (R)"),
            RecentLicense("V 0003", "Alex Lee", "Van (V)")
        )
        val recentAdapter = RecentLicenseAdapter(recentLicenses)
        val recyclerRecent = view.findViewById<RecyclerView>(R.id.recyclerRecentLicenses)
        recyclerRecent.layoutManager = LinearLayoutManager(requireContext())
        recyclerRecent.adapter = recentAdapter

        // Update NFC status
        updateNfcStatus(view)

        return view
    }

    fun onNfcTagDiscovered(tag: Tag) {
        // Read card number from NDEF message
        val cardNumber = NfcUtils.readNdefMessage(tag) ?: ""
        // Get NFC tag string (UID)
        val tagString = tag.id.joinToString("") { "%02X".format(it) }

        // Show a toast for feedback (show tag string)
        Toast.makeText(requireContext(), "NFC scanned!\nTag: $tagString\nCard: $cardNumber", Toast.LENGTH_LONG).show()

        // Navigate to LicenseDetailFragment
        val license = LicenseEntity(
            id = 0,
            holderName = "",
            mobile = "",
            city = "",
            licenseType = "",
            licenseNumber = tagString, // Show tag string as License number
            nfcCardNumber = cardNumber,
            validityDate = ""
        )
        (activity as? MainActivity)?.showLicenseDetail(license)
    }
    
    private fun updateNfcStatus(view: View) {
        val nfcStatusText = view.findViewById<TextView>(R.id.textNfcStatus)
        val mainActivity = activity as? MainActivity
        
        if (mainActivity != null) {
            val status = mainActivity.getNfcStatusReport()
            nfcStatusText.text = status
        } else {
            nfcStatusText.text = "Unable to determine NFC status"
        }
    }
    
    override fun onResume() {
        super.onResume()
        // Update NFC status when fragment resumes
        view?.let { updateNfcStatus(it) }
    }
}

// --- License Type Card Adapter ---
data class LicenseTypeCard(val title: String, val code: String, val iconRes: Int, val colorRes: Int)
class LicenseTypeCardAdapter(private val items: List<LicenseTypeCard>) : RecyclerView.Adapter<LicenseTypeCardAdapter.ViewHolder>() {
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val card: MaterialCardView = view.findViewById(R.id.cardLicenseType)
        val title: TextView = view.findViewById(R.id.textLicenseTypeTitle)
        val code: TextView = view.findViewById(R.id.textLicenseTypeCode)
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_license_type_card, parent, false)
        return ViewHolder(v)
    }
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.title.text = item.title
        holder.code.text = item.code
        holder.card.setCardBackgroundColor(holder.card.context.getColor(item.colorRes))
        // Optionally set icon if you add an ImageView
    }
    override fun getItemCount() = items.size
}

// --- Recent License Adapter ---
data class RecentLicense(val code: String, val holder: String, val type: String)
class RecentLicenseAdapter(private val items: List<RecentLicense>) : RecyclerView.Adapter<RecentLicenseAdapter.ViewHolder>() {
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val code: TextView = view.findViewById(R.id.textRecentLicenseCode)
        val holderName: TextView = view.findViewById(R.id.textRecentLicenseHolder)
        val type: TextView = view.findViewById(R.id.textRecentLicenseType)
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_recent_license, parent, false)
        return ViewHolder(v)
    }
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.code.text = item.code
        holder.holderName.text = item.holder
        holder.type.text = item.type
    }
    override fun getItemCount() = items.size
} 