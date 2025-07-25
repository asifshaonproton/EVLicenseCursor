package com.ektai.evlicense.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.ektai.evlicense.R
import com.ektai.evlicense.data.LicenseEntity

class LicenseDetailFragment : Fragment() {
    companion object {
        const val ARG_LICENSE = "license"
    }
    private var license: LicenseEntity? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        license = arguments?.getParcelable(ARG_LICENSE, com.ektai.evlicense.data.LicenseEntity::class.java)
    }
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_license_detail, container, false)
        license?.let {
            view.findViewById<TextView>(R.id.textHolderName).text = it.holderName
            view.findViewById<TextView>(R.id.textLicenseNumber).text = it.licenseNumber
            view.findViewById<TextView>(R.id.textLicenseType).text = it.licenseType
            view.findViewById<TextView>(R.id.textMobile).text = it.mobile
            view.findViewById<TextView>(R.id.textCity).text = it.city
            view.findViewById<TextView>(R.id.textNfcCardNumber).text = it.nfcCardNumber
            view.findViewById<TextView>(R.id.textValidityDate).text = it.validityDate
        }
        return view
    }
} 