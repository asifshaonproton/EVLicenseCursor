package com.ektai.evlicense.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.ektai.evlicense.R
import com.ektai.evlicense.data.LicenseEntity

class LicenseListAdapter(
    private var licenses: List<LicenseEntity>,
    private val onDetail: (LicenseEntity) -> Unit,
    private val onEdit: (LicenseEntity) -> Unit
) : RecyclerView.Adapter<LicenseListAdapter.LicenseViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LicenseViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_license, parent, false)
        return LicenseViewHolder(view)
    }
    override fun onBindViewHolder(holder: LicenseViewHolder, position: Int) {
        val license = licenses[position]
        holder.textName.text = license.holderName
        holder.textNumber.text = license.licenseNumber
        holder.textType.text = license.licenseType
        holder.itemView.setOnClickListener { onDetail(license) }
        holder.itemView.setOnLongClickListener { onEdit(license); true }
    }
    override fun getItemCount() = licenses.size
    fun updateData(newLicenses: List<LicenseEntity>) {
        licenses = newLicenses
        notifyDataSetChanged()
    }
    class LicenseViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val textName: TextView = view.findViewById(R.id.textHolderName)
        val textNumber: TextView = view.findViewById(R.id.textLicenseNumber)
        val textType: TextView = view.findViewById(R.id.textLicenseType)
    }
} 