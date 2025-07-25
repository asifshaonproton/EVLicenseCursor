package com.ektai.evlicense.data

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class LicenseEntity(
    val id: Int = 0,
    val holderName: String,
    val mobile: String,
    val city: String,
    val licenseType: String,
    val licenseNumber: String,
    val nfcCardNumber: String,
    val validityDate: String
) : Parcelable 