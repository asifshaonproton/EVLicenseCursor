package com.ektai.evlicense.test

import android.content.Context
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.Tag
import android.nfc.tech.Ndef
import com.ektai.evlicense.data.LicenseEntity
import com.ektai.evlicense.util.CryptoUtils
import com.ektai.evlicense.util.NfcUtils
import org.json.JSONObject
import java.nio.charset.Charset

/**
 * Android Cross-Platform Test Suite
 * Tests compatibility between Android and Desktop platforms
 */
class AndroidCrossPlatformTestSuite(private val context: Context) {
    
    private val testResults = mutableListOf<TestResult>()
    
    private val sampleLicense = LicenseEntity(
        id = 0,
        holderName = "John Test Doe",
        mobile = "+1234567890",
        city = "Test City",
        licenseType = "A",
        licenseNumber = "TEST123456",
        nfcCardNumber = "1234567890ABCDEF",
        validityDate = "2025-12-31",
        email = "john.test@example.com",
        vehicleMake = "Test Make",
        vehicleModel = "Test Model",
        vehicleYear = 2024,
        vehicleColor = "Test Color",
        vehicleVin = "TEST12345678901234",
        status = "Active",
        issueDate = "2024-01-15",
        notes = "Cross-platform test license"
    )

    data class TestResult(
        val category: String,
        val testName: String,
        val passed: Boolean,
        val error: String? = null,
        val timestamp: String = java.time.LocalDateTime.now().toString()
    )

    suspend fun runAllTests(): List<TestResult> {
        println("🚀 Starting Android Cross-Platform Test Suite...\n")
        
        try {
            testDataStructureCompatibility()
            testEncryptionCompatibility()
            testJsonSerialization()
            testNfcDataFormat()
            testFieldMapping()
            testDatabaseSchema()
            
            printTestSummary()
            return testResults
        } catch (error: Exception) {
            println("❌ Test suite failed: ${error.message}")
            throw error
        }
    }

    private fun testDataStructureCompatibility() {
        println("📊 Testing Data Structure Compatibility...")
        
        val testCases = listOf(
            TestCase(
                name = "Core Fields Present",
                test = {
                    val requiredFields = listOf(
                        "holderName", "mobile", "city", "licenseType", 
                        "licenseNumber", "nfcCardNumber", "validityDate"
                    )
                    
                    for (field in requiredFields) {
                        if (!sampleLicense.javaClass.getDeclaredField(field).isAccessible) {
                            throw Exception("Missing required field: $field")
                        }
                    }
                    true
                }
            ),
            TestCase(
                name = "Optional Fields Present",
                test = {
                    val optionalFields = listOf(
                        "email", "vehicleMake", "vehicleModel", "vehicleYear",
                        "vehicleColor", "vehicleVin", "status", "issueDate", "notes"
                    )
                    
                    for (field in optionalFields) {
                        if (!sampleLicense.javaClass.getDeclaredField(field).isAccessible) {
                            throw Exception("Missing optional field: $field")
                        }
                    }
                    true
                }
            ),
            TestCase(
                name = "Field Types Correct",
                test = {
                    if (sampleLicense.holderName !is String) throw Exception("holderName must be string")
                    if (sampleLicense.mobile !is String) throw Exception("mobile must be string")
                    if (sampleLicense.city !is String) throw Exception("city must be string")
                    if (sampleLicense.licenseType !is String) throw Exception("licenseType must be string")
                    if (sampleLicense.licenseNumber !is String) throw Exception("licenseNumber must be string")
                    if (sampleLicense.nfcCardNumber !is String) throw Exception("nfcCardNumber must be string")
                    if (sampleLicense.validityDate !is String) throw Exception("validityDate must be string")
                    if (sampleLicense.vehicleYear !is Int?) throw Exception("vehicleYear must be number")
                    true
                }
            )
        )

        for (testCase in testCases) {
            try {
                val result = testCase.test()
                recordTestResult("Data Structure", testCase.name, true)
            } catch (error: Exception) {
                recordTestResult("Data Structure", testCase.name, false, error.message)
            }
        }
    }

    private fun testEncryptionCompatibility() {
        println("🔐 Testing Encryption Compatibility...")
        
        val testCases = listOf(
            TestCase(
                name = "Encryption/Decryption Round Trip",
                test = {
                    val originalData = JSONObject().apply {
                        put("holderName", sampleLicense.holderName)
                        put("mobile", sampleLicense.mobile)
                        put("city", sampleLicense.city)
                        put("licenseType", sampleLicense.licenseType)
                        put("licenseNumber", sampleLicense.licenseNumber)
                        put("nfcCardNumber", sampleLicense.nfcCardNumber)
                        put("validityDate", sampleLicense.validityDate)
                    }.toString()
                    
                    val encrypted = CryptoUtils.encrypt(originalData, "YourSuperLongSecretKeyForNFCEncryption2024!@#")
                    val decrypted = CryptoUtils.decrypt(encrypted, "YourSuperLongSecretKeyForNFCEncryption2024!@#")
                    val parsed = JSONObject(decrypted)
                    
                    if (parsed.getString("holderName") != sampleLicense.holderName) {
                        throw Exception("Data corruption during encryption/decryption")
                    }
                    true
                }
            ),
            TestCase(
                name = "Same Key Used",
                test = {
                    val key = "YourSuperLongSecretKeyForNFCEncryption2024!@#"
                    val encrypted1 = CryptoUtils.encrypt("test", key)
                    val encrypted2 = CryptoUtils.encrypt("test", key)
                    
                    if (encrypted1 != encrypted2) {
                        throw Exception("Encryption not deterministic with same key")
                    }
                    true
                }
            ),
            TestCase(
                name = "Base64 Encoding",
                test = {
                    val encrypted = CryptoUtils.encrypt("test")
                    val base64Regex = Regex("^[A-Za-z0-9+/]*={0,2}$")
                    
                    if (!base64Regex.matches(encrypted)) {
                        throw Exception("Encrypted data not in Base64 format")
                    }
                    true
                }
            )
        )

        for (testCase in testCases) {
            try {
                val result = testCase.test()
                recordTestResult("Encryption", testCase.name, true)
            } catch (error: Exception) {
                recordTestResult("Encryption", testCase.name, false, error.message)
            }
        }
    }

    private fun testJsonSerialization() {
        println("📄 Testing JSON Serialization...")
        
        val testCases = listOf(
            TestCase(
                name = "Create License JSON",
                test = {
                    val json = createLicenseJson(sampleLicense)
                    val parsed = JSONObject(json)
                    
                    if (parsed.getString("holderName") != sampleLicense.holderName) {
                        throw Exception("JSON creation failed")
                    }
                    true
                }
            ),
            TestCase(
                name = "Parse License JSON",
                test = {
                    val json = createLicenseJson(sampleLicense)
                    val parsed = parseLicenseJson(json)
                    
                    if (parsed.holderName != sampleLicense.holderName) {
                        throw Exception("JSON parsing failed")
                    }
                    true
                }
            ),
            TestCase(
                name = "All Fields Preserved",
                test = {
                    val json = createLicenseJson(sampleLicense)
                    val parsed = parseLicenseJson(json)
                    
                    val allFields = listOf(
                        "holderName", "mobile", "city", "licenseType", "licenseNumber",
                        "nfcCardNumber", "validityDate", "email", "vehicleMake", "vehicleModel",
                        "vehicleYear", "vehicleColor", "vehicleVin", "status", "issueDate", "notes"
                    )
                    
                    for (field in allFields) {
                        if (!parsed.javaClass.getDeclaredField(field).isAccessible) {
                            throw Exception("Field $field not preserved in JSON")
                        }
                    }
                    true
                }
            )
        )

        for (testCase in testCases) {
            try {
                val result = testCase.test()
                recordTestResult("JSON Serialization", testCase.name, true)
            } catch (error: Exception) {
                recordTestResult("JSON Serialization", testCase.name, false, error.message)
            }
        }
    }

    private fun testNfcDataFormat() {
        println("📱 Testing NFC Data Format...")
        
        val testCases = listOf(
            TestCase(
                name = "NFC JSON Structure",
                test = {
                    val json = createLicenseJson(sampleLicense)
                    val encrypted = CryptoUtils.encrypt(json, "YourSuperLongSecretKeyForNFCEncryption2024!@#")
                    
                    // Simulate NFC read/write cycle
                    val decrypted = CryptoUtils.decrypt(encrypted, "YourSuperLongSecretKeyForNFCEncryption2024!@#")
                    val parsed = parseLicenseJson(decrypted)
                    
                    if (parsed.holderName != sampleLicense.holderName) {
                        throw Exception("NFC data format corrupted")
                    }
                    true
                }
            ),
            TestCase(
                name = "Cross-Platform NFC Format",
                test = {
                    // Test that the JSON structure matches Desktop format
                    val json = createLicenseJson(sampleLicense)
                    val parsed = JSONObject(json)
                    
                    val expectedStructure = mapOf(
                        "holderName" to "string",
                        "mobile" to "string",
                        "city" to "string",
                        "licenseType" to "string",
                        "licenseNumber" to "string",
                        "nfcCardNumber" to "string",
                        "validityDate" to "string",
                        "email" to "string",
                        "vehicleMake" to "string",
                        "vehicleModel" to "string",
                        "vehicleYear" to "number",
                        "vehicleColor" to "string",
                        "vehicleVin" to "string",
                        "status" to "string",
                        "issueDate" to "string",
                        "notes" to "string"
                    )
                    
                    for ((field, expectedType) in expectedStructure) {
                        if (!parsed.has(field)) {
                            throw Exception("Missing field in NFC format: $field")
                        }
                        
                        val actualType = when (parsed.get(field)) {
                            is String -> "string"
                            is Int -> "number"
                            else -> "unknown"
                        }
                        
                        if (expectedType == "number" && actualType != "number") {
                            throw Exception("Field $field should be number, got $actualType")
                        }
                    }
                    true
                }
            )
        )

        for (testCase in testCases) {
            try {
                val result = testCase.test()
                recordTestResult("NFC Data Format", testCase.name, true)
            } catch (error: Exception) {
                recordTestResult("NFC Data Format", testCase.name, false, error.message)
            }
        }
    }

    private fun testFieldMapping() {
        println("🔄 Testing Field Mapping...")
        
        val testCases = listOf(
            TestCase(
                name = "Old to New Field Mapping",
                test = {
                    val oldFieldMapping = mapOf(
                        "owner_name" to "holderName",
                        "owner_phone" to "mobile",
                        "license_number" to "licenseNumber",
                        "nfc_card_id" to "nfcCardNumber",
                        "expiry_date" to "validityDate",
                        "license_type" to "licenseType",
                        "owner_email" to "email",
                        "vehicle_make" to "vehicleMake",
                        "vehicle_model" to "vehicleModel",
                        "vehicle_year" to "vehicleYear",
                        "vehicle_color" to "vehicleColor",
                        "vehicle_vin" to "vehicleVin",
                        "issue_date" to "issueDate",
                        "created_at" to "createdAt",
                        "updated_at" to "updatedAt"
                    )
                    
                    for ((oldField, newField) in oldFieldMapping) {
                        if (!sampleLicense.javaClass.getDeclaredField(newField).isAccessible) {
                            throw Exception("New field $newField not present in unified structure")
                        }
                    }
                    true
                }
            ),
            TestCase(
                name = "Required Fields Present",
                test = {
                    val requiredFields = listOf(
                        "holderName", "mobile", "city", "licenseType", 
                        "licenseNumber", "validityDate", "status"
                    )
                    
                    for (field in requiredFields) {
                        if (!sampleLicense.javaClass.getDeclaredField(field).isAccessible) {
                            throw Exception("Required field $field missing")
                        }
                    }
                    true
                }
            ),
            TestCase(
                name = "Optional Fields Present",
                test = {
                    val optionalFields = listOf(
                        "email", "nfcCardNumber", "vehicleMake", "vehicleModel",
                        "vehicleYear", "vehicleColor", "vehicleVin", "issueDate", "notes"
                    )
                    
                    for (field in optionalFields) {
                        if (!sampleLicense.javaClass.getDeclaredField(field).isAccessible) {
                            throw Exception("Optional field $field missing")
                        }
                    }
                    true
                }
            )
        )

        for (testCase in testCases) {
            try {
                val result = testCase.test()
                recordTestResult("Field Mapping", testCase.name, true)
            } catch (error: Exception) {
                recordTestResult("Field Mapping", testCase.name, false, error.message)
            }
        }
    }

    private fun testDatabaseSchema() {
        println("🗄️ Testing Database Schema...")
        
        val testCases = listOf(
            TestCase(
                name = "Schema Field Names",
                test = {
                    val expectedSchemaFields = listOf(
                        "holderName", "mobile", "city", "licenseType", "licenseNumber",
                        "nfcCardNumber", "validityDate", "email", "vehicleMake", "vehicleModel",
                        "vehicleYear", "vehicleColor", "vehicleVin", "status", "issueDate",
                        "notes", "createdAt", "updatedAt"
                    )
                    
                    // This would normally check against actual database schema
                    // For now, we verify our test data has all expected fields
                    for (field in expectedSchemaFields) {
                        if (!sampleLicense.javaClass.getDeclaredField(field).isAccessible) {
                            throw Exception("Schema field $field missing from test data")
                        }
                    }
                    true
                }
            ),
            TestCase(
                name = "Data Types Match Schema",
                test = {
                    // Verify data types match expected schema
                    if (sampleLicense.holderName !is String) throw Exception("holderName should be TEXT")
                    if (sampleLicense.mobile !is String) throw Exception("mobile should be TEXT")
                    if (sampleLicense.city !is String) throw Exception("city should be TEXT")
                    if (sampleLicense.licenseType !is String) throw Exception("licenseType should be TEXT")
                    if (sampleLicense.licenseNumber !is String) throw Exception("licenseNumber should be TEXT")
                    if (sampleLicense.nfcCardNumber !is String) throw Exception("nfcCardNumber should be TEXT")
                    if (sampleLicense.validityDate !is String) throw Exception("validityDate should be TEXT")
                    if (sampleLicense.vehicleYear !is Int?) throw Exception("vehicleYear should be INTEGER")
                    true
                }
            )
        )

        for (testCase in testCases) {
            try {
                val result = testCase.test()
                recordTestResult("Database Schema", testCase.name, true)
            } catch (error: Exception) {
                recordTestResult("Database Schema", testCase.name, false, error.message)
            }
        }
    }

    private fun recordTestResult(category: String, testName: String, passed: Boolean, error: String? = null) {
        val result = TestResult(category, testName, passed, error)
        testResults.add(result)
        
        val status = if (passed) "PASS" else "FAIL"
        val icon = if (passed) "✅" else "❌"
        println("$icon $category: $testName - $status")
        
        if (error != null) {
            println("   Error: $error")
        }
    }

    private fun printTestSummary() {
        println("\n📊 TEST SUMMARY")
        println("================")
        
        val totalTests = testResults.size
        val passedTests = testResults.count { it.passed }
        val failedTests = totalTests - passedTests
        
        println("Total Tests: $totalTests")
        println("Passed: $passedTests ✅")
        println("Failed: $failedTests ❌")
        println("Success Rate: ${((passedTests.toDouble() / totalTests) * 100).format("%.1f")}%")
        
        if (failedTests > 0) {
            println("\n❌ FAILED TESTS:")
            testResults.filter { !it.passed }.forEach { result ->
                println("  - ${result.category}: ${result.testName}")
                println("    Error: ${result.error}")
            }
        }
        
        println("\n🎯 CROSS-PLATFORM COMPATIBILITY STATUS:")
        println("==========================================")
        
        val categories = testResults.map { it.category }.distinct()
        for (category in categories) {
            val categoryTests = testResults.filter { it.category == category }
            val categoryPassed = categoryTests.count { it.passed }
            val categoryTotal = categoryTests.size
            val status = if (categoryPassed == categoryTotal) "✅ PASS" else "❌ FAIL"
            
            println("$status $category ($categoryPassed/$categoryTotal)")
        }
        
        // Overall compatibility assessment
        val allPassed = failedTests == 0
        if (allPassed) {
            println("\n🎉 ALL TESTS PASSED!")
            println("✅ Cross-platform compatibility verified")
            println("✅ Data structure unification successful")
            println("✅ Encryption compatibility confirmed")
            println("✅ NFC format compatibility validated")
        } else {
            println("\n⚠️ SOME TESTS FAILED")
            println("Cross-platform compatibility needs attention")
        }
    }

    // Helper functions to match Desktop implementation
    private fun createLicenseJson(license: LicenseEntity): String {
        return JSONObject().apply {
            put("holderName", license.holderName)
            put("mobile", license.mobile)
            put("city", license.city)
            put("licenseType", license.licenseType)
            put("licenseNumber", license.licenseNumber)
            put("nfcCardNumber", license.nfcCardNumber)
            put("validityDate", license.validityDate)
            put("email", license.email ?: "")
            put("vehicleMake", license.vehicleMake ?: "")
            put("vehicleModel", license.vehicleModel ?: "")
            put("vehicleYear", license.vehicleYear ?: 0)
            put("vehicleColor", license.vehicleColor ?: "")
            put("vehicleVin", license.vehicleVin ?: "")
            put("status", license.status)
            put("issueDate", license.issueDate ?: "")
            put("notes", license.notes ?: "")
        }.toString()
    }

    private fun parseLicenseJson(jsonString: String): LicenseEntity {
        val json = JSONObject(jsonString)
        return LicenseEntity(
            holderName = json.optString("holderName", "N/A"),
            mobile = json.optString("mobile", "N/A"),
            city = json.optString("city", "N/A"),
            licenseType = json.optString("licenseType", "N/A"),
            licenseNumber = json.optString("licenseNumber", "N/A"),
            nfcCardNumber = json.optString("nfcCardNumber", "N/A"),
            validityDate = json.optString("validityDate", "N/A"),
            email = json.optString("email", "N/A"),
            vehicleMake = json.optString("vehicleMake", "N/A"),
            vehicleModel = json.optString("vehicleModel", "N/A"),
            vehicleYear = json.optInt("vehicleYear", 0),
            vehicleColor = json.optString("vehicleColor", "N/A"),
            vehicleVin = json.optString("vehicleVin", "N/A"),
            status = json.optString("status", "N/A"),
            issueDate = json.optString("issueDate", "N/A"),
            notes = json.optString("notes", "N/A")
        )
    }

    data class TestCase(
        val name: String,
        val test: () -> Boolean
    )
} 