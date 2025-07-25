package com.ektai.evlicense.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ektai.evlicense.data.LicenseEntity
import com.ektai.evlicense.data.LicenseRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LicenseViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = LicenseRepository(application)
    private val _allLicenses = MutableStateFlow<List<LicenseEntity>>(emptyList())
    val allLicenses: StateFlow<List<LicenseEntity>> = _allLicenses
    private val _searchResults = MutableStateFlow<List<LicenseEntity>>(emptyList())
    val searchResults: StateFlow<List<LicenseEntity>> = _searchResults

    init {
        loadAllLicenses()
    }

    fun loadAllLicenses() {
        viewModelScope.launch {
            _allLicenses.value = repository.getAllLicenses()
        }
    }

    fun searchLicenses(query: String) {
        viewModelScope.launch {
            _searchResults.value = repository.searchLicenses(query)
        }
    }

    fun insertLicense(license: LicenseEntity) = viewModelScope.launch {
        repository.insertLicense(license)
        loadAllLicenses()
    }

    fun updateLicense(license: LicenseEntity) = viewModelScope.launch {
        repository.updateLicense(license)
        loadAllLicenses()
    }

    fun deleteLicense(license: LicenseEntity) = viewModelScope.launch {
        repository.deleteLicense(license)
        loadAllLicenses()
    }
} 