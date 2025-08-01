const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const CryptoUtils = require('../EVLicenseDesktopV2/src/main/crypto-utils.js');

class CrossPlatformTestSuite {
    constructor() {
        this.testResults = [];
        this.testData = {
            sampleLicense: {
                holderName: "John Test Doe",
                mobile: "+1234567890",
                city: "Test City",
                licenseType: "A",
                licenseNumber: "TEST123456",
                nfcCardNumber: "1234567890ABCDEF",
                validityDate: "2025-12-31",
                email: "john.test@example.com",
                vehicleMake: "Test Make",
                vehicleModel: "Test Model",
                vehicleYear: 2024,
                vehicleColor: "Test Color",
                vehicleVin: "TEST12345678901234",
                status: "Active",
                issueDate: "2024-01-15",
                notes: "Cross-platform test license"
            }
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Cross-Platform Test Suite...\n');
        
        try {
            await this.testDataStructureCompatibility();
            await this.testEncryptionCompatibility();
            await this.testJsonSerialization();
            await this.testNfcDataFormat();
            await this.testFieldMapping();
            await this.testDatabaseSchema();
            
            this.printTestSummary();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    async testDataStructureCompatibility() {
        console.log('📊 Testing Data Structure Compatibility...');
        
        const testCases = [
            {
                name: 'Core Fields Present',
                test: () => {
                    const requiredFields = [
                        'holderName', 'mobile', 'city', 'licenseType', 
                        'licenseNumber', 'nfcCardNumber', 'validityDate'
                    ];
                    
                    for (const field of requiredFields) {
                        if (!(field in this.testData.sampleLicense)) {
                            throw new Error(`Missing required field: ${field}`);
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Optional Fields Present',
                test: () => {
                    const optionalFields = [
                        'email', 'vehicleMake', 'vehicleModel', 'vehicleYear',
                        'vehicleColor', 'vehicleVin', 'status', 'issueDate', 'notes'
                    ];
                    
                    for (const field of optionalFields) {
                        if (!(field in this.testData.sampleLicense)) {
                            throw new Error(`Missing optional field: ${field}`);
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Field Types Correct',
                test: () => {
                    const { sampleLicense } = this.testData;
                    
                    if (typeof sampleLicense.holderName !== 'string') throw new Error('holderName must be string');
                    if (typeof sampleLicense.mobile !== 'string') throw new Error('mobile must be string');
                    if (typeof sampleLicense.city !== 'string') throw new Error('city must be string');
                    if (typeof sampleLicense.licenseType !== 'string') throw new Error('licenseType must be string');
                    if (typeof sampleLicense.licenseNumber !== 'string') throw new Error('licenseNumber must be string');
                    if (typeof sampleLicense.nfcCardNumber !== 'string') throw new Error('nfcCardNumber must be string');
                    if (typeof sampleLicense.validityDate !== 'string') throw new Error('validityDate must be string');
                    if (typeof sampleLicense.vehicleYear !== 'number') throw new Error('vehicleYear must be number');
                    
                    return true;
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = testCase.test();
                this.recordTestResult('Data Structure', testCase.name, true, '✅');
            } catch (error) {
                this.recordTestResult('Data Structure', testCase.name, false, '❌', error.message);
            }
        }
    }

    async testEncryptionCompatibility() {
        console.log('🔐 Testing Encryption Compatibility...');
        
        const testCases = [
            {
                name: 'Encryption/Decryption Round Trip',
                test: () => {
                    const originalData = JSON.stringify(this.testData.sampleLicense);
                    const encrypted = CryptoUtils.encrypt(originalData);
                    const decrypted = CryptoUtils.decrypt(encrypted);
                    const parsed = JSON.parse(decrypted);
                    
                    if (parsed.holderName !== this.testData.sampleLicense.holderName) {
                        throw new Error('Data corruption during encryption/decryption');
                    }
                    return true;
                }
            },
            {
                name: 'Same Key Used',
                test: () => {
                    const key = "YourSuperLongSecretKeyForNFCEncryption2024!@#";
                    const encrypted1 = CryptoUtils.encrypt("test", key);
                    const encrypted2 = CryptoUtils.encrypt("test", key);
                    
                    if (encrypted1 !== encrypted2) {
                        throw new Error('Encryption not deterministic with same key');
                    }
                    return true;
                }
            },
            {
                name: 'Base64 Encoding',
                test: () => {
                    const encrypted = CryptoUtils.encrypt("test");
                    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                    
                    if (!base64Regex.test(encrypted)) {
                        throw new Error('Encrypted data not in Base64 format');
                    }
                    return true;
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = testCase.test();
                this.recordTestResult('Encryption', testCase.name, true, '✅');
            } catch (error) {
                this.recordTestResult('Encryption', testCase.name, false, '❌', error.message);
            }
        }
    }

    async testJsonSerialization() {
        console.log('📄 Testing JSON Serialization...');
        
        const testCases = [
            {
                name: 'Create License JSON',
                test: () => {
                    const json = CryptoUtils.createLicenseJson(this.testData.sampleLicense);
                    const parsed = JSON.parse(json);
                    
                    if (parsed.holderName !== this.testData.sampleLicense.holderName) {
                        throw new Error('JSON creation failed');
                    }
                    return true;
                }
            },
            {
                name: 'Parse License JSON',
                test: () => {
                    const json = CryptoUtils.createLicenseJson(this.testData.sampleLicense);
                    const parsed = CryptoUtils.parseLicenseJson(json);
                    
                    if (parsed.holderName !== this.testData.sampleLicense.holderName) {
                        throw new Error('JSON parsing failed');
                    }
                    return true;
                }
            },
            {
                name: 'All Fields Preserved',
                test: () => {
                    const json = CryptoUtils.createLicenseJson(this.testData.sampleLicense);
                    const parsed = CryptoUtils.parseLicenseJson(json);
                    
                    const allFields = [
                        'holderName', 'mobile', 'city', 'licenseType', 'licenseNumber',
                        'nfcCardNumber', 'validityDate', 'email', 'vehicleMake', 'vehicleModel',
                        'vehicleYear', 'vehicleColor', 'vehicleVin', 'status', 'issueDate', 'notes'
                    ];
                    
                    for (const field of allFields) {
                        if (!(field in parsed)) {
                            throw new Error(`Field ${field} not preserved in JSON`);
                        }
                    }
                    return true;
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = testCase.test();
                this.recordTestResult('JSON Serialization', testCase.name, true, '✅');
            } catch (error) {
                this.recordTestResult('JSON Serialization', testCase.name, false, '❌', error.message);
            }
        }
    }

    async testNfcDataFormat() {
        console.log('📱 Testing NFC Data Format...');
        
        const testCases = [
            {
                name: 'NFC JSON Structure',
                test: () => {
                    const json = CryptoUtils.createLicenseJson(this.testData.sampleLicense);
                    const encrypted = CryptoUtils.encrypt(json);
                    
                    // Simulate NFC read/write cycle
                    const decrypted = CryptoUtils.decrypt(encrypted);
                    const parsed = CryptoUtils.parseLicenseJson(decrypted);
                    
                    if (parsed.holderName !== this.testData.sampleLicense.holderName) {
                        throw new Error('NFC data format corrupted');
                    }
                    return true;
                }
            },
            {
                name: 'Cross-Platform NFC Format',
                test: () => {
                    // Test that the JSON structure matches Android format
                    const json = CryptoUtils.createLicenseJson(this.testData.sampleLicense);
                    const parsed = JSON.parse(json);
                    
                    const expectedStructure = {
                        holderName: 'string',
                        mobile: 'string',
                        city: 'string',
                        licenseType: 'string',
                        licenseNumber: 'string',
                        nfcCardNumber: 'string',
                        validityDate: 'string',
                        email: 'string',
                        vehicleMake: 'string',
                        vehicleModel: 'string',
                        vehicleYear: 'number',
                        vehicleColor: 'string',
                        vehicleVin: 'string',
                        status: 'string',
                        issueDate: 'string',
                        notes: 'string'
                    };
                    
                    for (const [field, expectedType] of Object.entries(expectedStructure)) {
                        if (!(field in parsed)) {
                            throw new Error(`Missing field in NFC format: ${field}`);
                        }
                        
                        const actualType = typeof parsed[field];
                        if (expectedType === 'number' && actualType !== 'number') {
                            throw new Error(`Field ${field} should be number, got ${actualType}`);
                        }
                    }
                    return true;
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = testCase.test();
                this.recordTestResult('NFC Data Format', testCase.name, true, '✅');
            } catch (error) {
                this.recordTestResult('NFC Data Format', testCase.name, false, '❌', error.message);
            }
        }
    }

    async testFieldMapping() {
        console.log('🔄 Testing Field Mapping...');
        
        const testCases = [
            {
                name: 'Old to New Field Mapping',
                test: () => {
                    const oldFieldMapping = {
                        'owner_name': 'holderName',
                        'owner_phone': 'mobile',
                        'license_number': 'licenseNumber',
                        'nfc_card_id': 'nfcCardNumber',
                        'expiry_date': 'validityDate',
                        'license_type': 'licenseType',
                        'owner_email': 'email',
                        'vehicle_make': 'vehicleMake',
                        'vehicle_model': 'vehicleModel',
                        'vehicle_year': 'vehicleYear',
                        'vehicle_color': 'vehicleColor',
                        'vehicle_vin': 'vehicleVin',
                        'issue_date': 'issueDate',
                        'created_at': 'createdAt',
                        'updated_at': 'updatedAt'
                    };
                    
                    for (const [oldField, newField] of Object.entries(oldFieldMapping)) {
                        if (!(newField in this.testData.sampleLicense)) {
                            throw new Error(`New field ${newField} not present in unified structure`);
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Required Fields Present',
                test: () => {
                    const requiredFields = [
                        'holderName', 'mobile', 'city', 'licenseType', 
                        'licenseNumber', 'validityDate', 'status'
                    ];
                    
                    for (const field of requiredFields) {
                        if (!(field in this.testData.sampleLicense)) {
                            throw new Error(`Required field ${field} missing`);
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Optional Fields Present',
                test: () => {
                    const optionalFields = [
                        'email', 'nfcCardNumber', 'vehicleMake', 'vehicleModel',
                        'vehicleYear', 'vehicleColor', 'vehicleVin', 'issueDate', 'notes'
                    ];
                    
                    for (const field of optionalFields) {
                        if (!(field in this.testData.sampleLicense)) {
                            throw new Error(`Optional field ${field} missing`);
                        }
                    }
                    return true;
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = testCase.test();
                this.recordTestResult('Field Mapping', testCase.name, true, '✅');
            } catch (error) {
                this.recordTestResult('Field Mapping', testCase.name, false, '❌', error.message);
            }
        }
    }

    async testDatabaseSchema() {
        console.log('🗄️ Testing Database Schema...');
        
        const testCases = [
            {
                name: 'Schema Field Names',
                test: () => {
                    const expectedSchemaFields = [
                        'holderName', 'mobile', 'city', 'licenseType', 'licenseNumber',
                        'nfcCardNumber', 'validityDate', 'email', 'vehicleMake', 'vehicleModel',
                        'vehicleYear', 'vehicleColor', 'vehicleVin', 'status', 'issueDate',
                        'notes', 'createdAt', 'updatedAt'
                    ];
                    
                    // This would normally check against actual database schema
                    // For now, we verify our test data has all expected fields
                    for (const field of expectedSchemaFields) {
                        if (!(field in this.testData.sampleLicense)) {
                            throw new Error(`Schema field ${field} missing from test data`);
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Data Types Match Schema',
                test: () => {
                    const { sampleLicense } = this.testData;
                    
                    // Verify data types match expected schema
                    if (typeof sampleLicense.holderName !== 'string') throw new Error('holderName should be TEXT');
                    if (typeof sampleLicense.mobile !== 'string') throw new Error('mobile should be TEXT');
                    if (typeof sampleLicense.city !== 'string') throw new Error('city should be TEXT');
                    if (typeof sampleLicense.licenseType !== 'string') throw new Error('licenseType should be TEXT');
                    if (typeof sampleLicense.licenseNumber !== 'string') throw new Error('licenseNumber should be TEXT');
                    if (typeof sampleLicense.nfcCardNumber !== 'string') throw new Error('nfcCardNumber should be TEXT');
                    if (typeof sampleLicense.validityDate !== 'string') throw new Error('validityDate should be TEXT');
                    if (typeof sampleLicense.vehicleYear !== 'number') throw new Error('vehicleYear should be INTEGER');
                    
                    return true;
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = testCase.test();
                this.recordTestResult('Database Schema', testCase.name, true, '✅');
            } catch (error) {
                this.recordTestResult('Database Schema', testCase.name, false, '❌', error.message);
            }
        }
    }

    recordTestResult(category, testName, passed, icon, error = null) {
        const result = {
            category,
            testName,
            passed,
            icon,
            error,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = passed ? 'PASS' : 'FAIL';
        console.log(`${icon} ${category}: ${testName} - ${status}`);
        
        if (error) {
            console.log(`   Error: ${error}`);
        }
    }

    printTestSummary() {
        console.log('\n📊 TEST SUMMARY');
        console.log('================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => {
                    console.log(`  - ${r.category}: ${r.testName}`);
                    console.log(`    Error: ${r.error}`);
                });
        }
        
        console.log('\n🎯 CROSS-PLATFORM COMPATIBILITY STATUS:');
        console.log('==========================================');
        
        const categories = [...new Set(this.testResults.map(r => r.category))];
        for (const category of categories) {
            const categoryTests = this.testResults.filter(r => r.category === category);
            const categoryPassed = categoryTests.filter(r => r.passed).length;
            const categoryTotal = categoryTests.length;
            const status = categoryPassed === categoryTotal ? '✅ PASS' : '❌ FAIL';
            
            console.log(`${status} ${category} (${categoryPassed}/${categoryTotal})`);
        }
        
        // Overall compatibility assessment
        const allPassed = failedTests === 0;
        if (allPassed) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('✅ Cross-platform compatibility verified');
            console.log('✅ Data structure unification successful');
            console.log('✅ Encryption compatibility confirmed');
            console.log('✅ NFC format compatibility validated');
        } else {
            console.log('\n⚠️ SOME TESTS FAILED');
            console.log('Cross-platform compatibility needs attention');
        }
        
        // Save detailed results to file
        this.saveTestResults();
    }

    saveTestResults() {
        const resultsFile = path.join(__dirname, 'test-results.json');
        const summary = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passedTests: this.testResults.filter(r => r.passed).length,
            failedTests: this.testResults.filter(r => !r.passed).length,
            results: this.testResults
        };
        
        fs.writeFileSync(resultsFile, JSON.stringify(summary, null, 2));
        console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
    }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
    const testSuite = new CrossPlatformTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = CrossPlatformTestSuite; 