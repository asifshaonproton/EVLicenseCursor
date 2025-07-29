const crypto = require('crypto');

class CryptoUtils {
    static key = "YourSuperLongSecretKeyForNFCEncryption2024!@#";
    
    static sha256(text) {
        return crypto.createHash('sha256').update(text, 'utf8').digest();
    }
    
    static encrypt(plainText, key = this.key) {
        const keyBytes = this.sha256(key);
        const plainBytes = Buffer.from(plainText, 'utf8');
        const cipherBytes = Buffer.alloc(plainBytes.length);
        
        for (let i = 0; i < plainBytes.length; i++) {
            cipherBytes[i] = plainBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return cipherBytes.toString('base64');
    }
    
    static decrypt(cipherText, key = this.key) {
        try {
            const keyBytes = this.sha256(key);
            const cipherBytes = Buffer.from(cipherText, 'base64');
            const plainBytes = Buffer.alloc(cipherBytes.length);
            
            for (let i = 0; i < cipherBytes.length; i++) {
                plainBytes[i] = cipherBytes[i] ^ keyBytes[i % keyBytes.length];
            }
            
            return plainBytes.toString('utf8');
        } catch (error) {
            console.error('❌ Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    
    static createLicenseJson(licenseData) {
        return JSON.stringify({
            holderName: licenseData.holderName || '',
            mobile: licenseData.mobile || '',
            city: licenseData.city || '',
            licenseType: licenseData.licenseType || '',
            licenseNumber: licenseData.licenseNumber || '',
            nfcCardNumber: licenseData.nfcCardNumber || '',
            validityDate: licenseData.validityDate || ''
        });
    }
    
    static parseLicenseJson(jsonString) {
        try {
            const json = JSON.parse(jsonString);
            return {
                holderName: json.holderName || 'N/A',
                mobile: json.mobile || 'N/A',
                city: json.city || 'N/A',
                licenseType: json.licenseType || 'N/A',
                licenseNumber: json.licenseNumber || 'N/A',
                nfcCardNumber: json.nfcCardNumber || 'N/A',
                validityDate: json.validityDate || 'N/A'
            };
        } catch (error) {
            console.error('❌ JSON parsing error:', error);
            throw new Error('Failed to parse license data');
        }
    }
}

module.exports = CryptoUtils;