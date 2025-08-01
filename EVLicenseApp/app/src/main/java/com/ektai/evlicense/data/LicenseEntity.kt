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
    val validityDate: String,
    // New fields for cross-platform compatibility
    val email: String? = null,
    val vehicleMake: String? = null,
    val vehicleModel: String? = null,
    val vehicleYear: Int? = null,
    val vehicleColor: String? = null,
    val vehicleVin: String? = null,
    val status: String = "Active",
    val issueDate: String? = null,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) : Parcelable 