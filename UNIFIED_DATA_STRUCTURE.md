# 🔄 Unified Data Structure Specification

## 📋 Overview

This document defines the unified data structure that both Android and Desktop applications will use to ensure perfect cross-platform compatibility.

## 🏗️ Unified License Data Structure

### **Core License Fields**
```json
{
    "id": "number",                    // Database ID (auto-generated)
    "holderName": "string",            // License holder's full name
    "mobile": "string",                // Mobile phone number
    "email": "string",                 // Email address (optional)
    "city": "string",                  // City (Rangpur, Narayanganj, etc.)
    "licenseType": "string",           // License type (A, R, V, M, P)
    "licenseNumber": "string",         // Unique license number
    "nfcCardNumber": "string",         // NFC card UID
    "validityDate": "string",          // Expiry date (YYYY-MM-DD)
    "vehicleMake": "string",           // Vehicle make (optional)
    "vehicleModel": "string",          // Vehicle model (optional)
    "vehicleYear": "number",           // Vehicle year (optional)
    "vehicleColor": "string",          // Vehicle color (optional)
    "vehicleVin": "string",            // Vehicle VIN (optional)
    "status": "string",                // License status (Active, Suspended, Expired)
    "issueDate": "string",             // Issue date (YYYY-MM-DD)
    "notes": "string",                 // Additional notes (optional)
    "createdAt": "string",             // Creation timestamp
    "updatedAt": "string"              // Last update timestamp
}
```

### **Required Fields (Minimum Set)**
```json
{
    "holderName": "string",            // Required
    "mobile": "string",                // Required
    "city": "string",                  // Required
    "licenseType": "string",           // Required
    "licenseNumber": "string",         // Required
    "validityDate": "string",          // Required
    "status": "string"                 // Required (default: "Active")
}
```

### **Optional Fields**
```json
{
    "email": "string",                 // Optional
    "nfcCardNumber": "string",         // Optional
    "vehicleMake": "string",           // Optional
    "vehicleModel": "string",          // Optional
    "vehicleYear": "number",           // Optional
    "vehicleColor": "string",          // Optional
    "vehicleVin": "string",            // Optional
    "issueDate": "string",             // Optional
    "notes": "string",                 // Optional
    "createdAt": "string",             // Auto-generated
    "updatedAt": "string"              // Auto-generated
}
```

## 🔄 Migration Strategy

### **Phase 1: Database Schema Updates**

#### **Android Database Updates**
```sql
-- Add missing fields to Android database
ALTER TABLE licenses ADD COLUMN email TEXT;
ALTER TABLE licenses ADD COLUMN vehicle_make TEXT;
ALTER TABLE licenses ADD COLUMN vehicle_model TEXT;
ALTER TABLE licenses ADD COLUMN vehicle_year INTEGER;
ALTER TABLE licenses ADD COLUMN vehicle_color TEXT;
ALTER TABLE licenses ADD COLUMN vehicle_vin TEXT;
ALTER TABLE licenses ADD COLUMN status TEXT DEFAULT 'Active';
ALTER TABLE licenses ADD COLUMN issue_date TEXT;
ALTER TABLE licenses ADD COLUMN notes TEXT;
ALTER TABLE licenses ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE licenses ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
```

#### **Desktop Database Updates**
```sql
-- Add missing fields to Desktop database
ALTER TABLE licenses ADD COLUMN city TEXT;
ALTER TABLE licenses ADD COLUMN mobile TEXT;
ALTER TABLE licenses ADD COLUMN email TEXT;
ALTER TABLE licenses ADD COLUMN nfc_card_number TEXT;
```

### **Phase 2: Field Name Standardization**

#### **Android to Unified Mapping**
```kotlin
// Current Android fields → Unified fields
data class LicenseEntity(
    val id: Int = 0,
    val holderName: String,        // ✅ Already correct
    val mobile: String,            // ✅ Already correct
    val city: String,              // ✅ Already correct
    val licenseType: String,       // ✅ Already correct
    val licenseNumber: String,     // ✅ Already correct
    val nfcCardNumber: String,     // ✅ Already correct
    val validityDate: String,      // ✅ Already correct
    // New fields to add:
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
)
```

#### **Desktop to Unified Mapping**
```javascript
// Current Desktop fields → Unified fields
{
    // Field name changes:
    owner_name: "holderName",           // ❌ owner_name → holderName
    owner_phone: "mobile",              // ❌ owner_phone → mobile
    license_number: "licenseNumber",     // ❌ license_number → licenseNumber
    nfc_card_id: "nfcCardNumber",       // ❌ nfc_card_id → nfcCardNumber
    expiry_date: "validityDate",        // ❌ expiry_date → validityDate
    license_type: "licenseType",        // ❌ license_type → licenseType
    
    // New fields to add:
    city: "city",                       // ❌ Missing in desktop
    email: "email",                     // ✅ Already exists
    vehicle_make: "vehicleMake",        // ✅ Already exists
    vehicle_model: "vehicleModel",      // ✅ Already exists
    vehicle_year: "vehicleYear",        // ✅ Already exists
    vehicle_color: "vehicleColor",      // ✅ Already exists
    vehicle_vin: "vehicleVin",          // ✅ Already exists
    status: "status",                   // ✅ Already exists
    issue_date: "issueDate",            // ✅ Already exists
    notes: "notes",                     // ✅ Already exists
    created_at: "createdAt",            // ✅ Already exists
    updated_at: "updatedAt"             // ✅ Already exists
}
```

## 🔧 Implementation Plan

### **Step 1: Update Android Database Schema**
1. Add missing columns to Android database
2. Update LicenseEntity data class
3. Update database helper and repository
4. Update UI forms to include new fields

### **Step 2: Update Desktop Database Schema**
1. Add missing columns to Desktop database
2. Update database manager
3. Update UI forms to include new fields

### **Step 3: Standardize Field Names**
1. Update Desktop field names to match Android
2. Update all database queries
3. Update all UI components
4. Update NFC data handling

### **Step 4: Update NFC Data Format**
1. Standardize JSON structure for NFC cards
2. Update encryption/decryption handling
3. Update data validation

### **Step 5: Testing and Validation**
1. Test cross-platform data exchange
2. Test NFC read/write operations
3. Validate data integrity
4. Test migration of existing data

## 📊 Field Mapping Summary

| Unified Field | Android Current | Desktop Current | Action Required |
|---------------|-----------------|-----------------|-----------------|
| `holderName` | ✅ `holderName` | ❌ `owner_name` | Update Desktop |
| `mobile` | ✅ `mobile` | ❌ `owner_phone` | Update Desktop |
| `city` | ✅ `city` | ❌ **MISSING** | Add to Desktop |
| `licenseType` | ✅ `licenseType` | ❌ `license_type` | Update Desktop |
| `licenseNumber` | ✅ `licenseNumber` | ❌ `license_number` | Update Desktop |
| `nfcCardNumber` | ✅ `nfcCardNumber` | ❌ `nfc_card_id` | Update Desktop |
| `validityDate` | ✅ `validityDate` | ❌ `expiry_date` | Update Desktop |
| `email` | ❌ **MISSING** | ✅ `owner_email` | Add to Android |
| `vehicleMake` | ❌ **MISSING** | ✅ `vehicle_make` | Add to Android |
| `vehicleModel` | ❌ **MISSING** | ✅ `vehicle_model` | Add to Android |
| `status` | ❌ **MISSING** | ✅ `status` | Add to Android |

## 🎯 Priority Order

1. **HIGH**: Update Android database schema (add missing fields)
2. **HIGH**: Update Desktop field names (standardize naming)
3. **MEDIUM**: Update Desktop database schema (add city field)
4. **MEDIUM**: Update UI forms in both applications
5. **LOW**: Add advanced features (vehicle details, notes, etc.)

## ✅ Success Criteria

- [ ] Both apps can read data written by the other app
- [ ] NFC cards work interchangeably between platforms
- [ ] All license information is preserved across platforms
- [ ] Database schemas are compatible
- [ ] UI forms include all necessary fields
- [ ] Data validation works consistently
- [ ] Encryption/decryption works cross-platform

This unified structure will ensure perfect compatibility between your Android and Desktop applications! 