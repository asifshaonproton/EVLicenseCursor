class NdefUtils {
    
    /**
     * Create an NDEF text record with language code (like Android)
     * @param {string} text - The text to encode
     * @param {string} language - Language code (default: 'en')
     * @returns {Buffer} - The NDEF text record payload
     */
    static createTextRecord(text, language = 'en') {
        const languageCode = Buffer.from(language, 'utf8');
        const textData = Buffer.from(text, 'utf8');
        
        // NDEF Text Record format:
        // [Status byte][Language code length][Language code][Text]
        const statusByte = languageCode.length; // UTF-8 encoding, language code length
        
        const payload = Buffer.alloc(1 + languageCode.length + textData.length);
        let offset = 0;
        
        // Status byte
        payload[offset] = statusByte;
        offset += 1;
        
        // Language code
        languageCode.copy(payload, offset);
        offset += languageCode.length;
        
        // Text data
        textData.copy(payload, offset);
        
        return payload;
    }
    
    /**
     * Parse an NDEF text record (like Android does)
     * @param {Buffer} payload - The NDEF text record payload
     * @returns {string} - The extracted text
     */
    static parseTextRecord(payload) {
        try {
            if (!payload || payload.length < 1) {
                return null;
            }
            
            const statusByte = payload[0];
            const languageCodeLength = statusByte & 0x3F; // Lower 6 bits
            
            if (payload.length < 1 + languageCodeLength) {
                return null;
            }
            
            // Extract text (skip status byte and language code)
            const textStart = 1 + languageCodeLength;
            const textData = payload.slice(textStart);
            
            return textData.toString('utf8');
        } catch (error) {
            console.error('❌ Error parsing NDEF text record:', error);
            return null;
        }
    }
    
    /**
     * Create a complete NDEF message with proper headers
     * @param {string} text - The text to encode
     * @returns {Buffer} - Complete NDEF message
     */
    static createNdefMessage(text) {
        const textRecord = this.createTextRecord(text);
        
        // NDEF Record Header
        // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001 (Well-known type)
        const flags = 0xD1; // 11010001
        const type = Buffer.from('T'); // Text record type
        const payloadLength = textRecord.length;
        
        // Build complete NDEF record
        const record = Buffer.alloc(3 + payloadLength);
        let offset = 0;
        
        // Header flags
        record[offset] = flags;
        offset += 1;
        
        // Type length
        record[offset] = type.length;
        offset += 1;
        
        // Payload length (short record)
        record[offset] = payloadLength;
        offset += 1;
        
        // Type (we skip it as it's implicit for our use case)
        // type.copy(record, offset);
        // offset += type.length;
        
        // Payload
        textRecord.copy(record, offset);
        
        return record;
    }
    
    /**
     * Extract text from a complete NDEF message
     * @param {Buffer} ndefMessage - The complete NDEF message
     * @returns {string|null} - Extracted text or null
     */
    static parseNdefMessage(ndefMessage) {
        try {
            if (!ndefMessage || ndefMessage.length < 3) {
                return null;
            }
            
            const flags = ndefMessage[0];
            const typeLength = ndefMessage[1];
            const payloadLength = ndefMessage[2];
            
            // Check if it's a text record
            const tnf = flags & 0x07;
            if (tnf !== 0x01) { // Not well-known type
                return null;
            }
            
            // Calculate payload start position
            const payloadStart = 3 + typeLength;
            
            if (ndefMessage.length < payloadStart + payloadLength) {
                return null;
            }
            
            // Extract payload
            const payload = ndefMessage.slice(payloadStart, payloadStart + payloadLength);
            
            // Parse text record payload
            return this.parseTextRecord(payload);
        } catch (error) {
            console.error('❌ Error parsing NDEF message:', error);
            return null;
        }
    }
    
    /**
     * Create a simple NDEF-like structure for block writing (fallback)
     * This creates a simplified format that can be written to raw blocks
     * @param {string} text - The text to encode
     * @returns {Buffer} - Encoded data
     */
    static createSimpleTextRecord(text) {
        // Simple format: [length][text]
        const textData = Buffer.from(text, 'utf8');
        const lengthByte = Math.min(textData.length, 255);
        
        const record = Buffer.alloc(1 + textData.length);
        record[0] = lengthByte;
        textData.copy(record, 1);
        
        return record;
    }
    
    /**
     * Parse simple text record
     * @param {Buffer} data - The encoded data
     * @returns {string|null} - Extracted text or null
     */
    static parseSimpleTextRecord(data) {
        try {
            if (!data || data.length < 1) {
                return null;
            }
            
            const length = data[0];
            if (data.length < 1 + length) {
                return null;
            }
            
            return data.slice(1, 1 + length).toString('utf8');
        } catch (error) {
            console.error('❌ Error parsing simple text record:', error);
            return null;
        }
    }
}

module.exports = NdefUtils;