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
     * Create NDEF message exactly like Android's NdefRecord.createTextRecord()
     * @param {string} text - The text to encode
     * @returns {Buffer} - Complete NDEF message matching Android format
     */
    static createNdefMessage(text) {
        // Create text record payload exactly like Android's createTextRecord
        const languageCode = 'en';
        const textData = Buffer.from(text, 'utf8');
        const langBytes = Buffer.from(languageCode, 'utf8');
        
        // Status byte: UTF-8 encoding (0x00) + language code length
        const statusByte = langBytes.length;
        
        // Create payload: [status byte][language code][text]
        const payload = Buffer.alloc(1 + langBytes.length + textData.length);
        let offset = 0;
        
        payload[offset] = statusByte;
        offset += 1;
        
        langBytes.copy(payload, offset);
        offset += langBytes.length;
        
        textData.copy(payload, offset);
        
        // Create NDEF record exactly like Android
        // Header: MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001 (Well-known type)
        const flags = 0xD1; // 11010001
        const typeLength = 1; // 'T' is 1 byte
        const payloadLength = payload.length;
        const type = Buffer.from('T');
        
        // Build complete NDEF record
        const record = Buffer.alloc(3 + typeLength + payloadLength);
        offset = 0;
        
        // Header
        record[offset] = flags;
        offset += 1;
        
        // Type length
        record[offset] = typeLength;
        offset += 1;
        
        // Payload length
        record[offset] = payloadLength;
        offset += 1;
        
        // Type
        type.copy(record, offset);
        offset += typeLength;
        
        // Payload
        payload.copy(record, offset);
        
        console.log(`📋 Created Android-compatible NDEF record: ${record.length} bytes`);
        console.log(`📋 Record hex: ${record.toString('hex')}`);
        
        return record;
    }
    
    /**
     * Parse NDEF message exactly like Android's readNdefMessage
     * @param {Buffer} ndefMessage - The complete NDEF message
     * @returns {string|null} - Extracted text or null
     */
    static parseNdefMessage(ndefMessage) {
        try {
            if (!ndefMessage || ndefMessage.length < 4) {
                return null;
            }
            
            console.log(`📋 Parsing NDEF message: ${ndefMessage.length} bytes`);
            console.log(`📋 Hex data: ${ndefMessage.toString('hex')}`);
            
            // Parse NDEF record header
            const flags = ndefMessage[0];
            const typeLength = ndefMessage[1];
            const payloadLength = ndefMessage[2];
            
            console.log(`📋 Flags: 0x${flags.toString(16)}, TypeLen: ${typeLength}, PayloadLen: ${payloadLength}`);
            
            // Check if it's a text record
            const tnf = flags & 0x07;
            if (tnf !== 0x01) { // Not well-known type
                console.log(`⚠️ Not a well-known type record, TNF: ${tnf}`);
                return null;
            }
            
            // Calculate payload start position
            const payloadStart = 3 + typeLength;
            
            if (ndefMessage.length < payloadStart + payloadLength) {
                console.log(`⚠️ Message too short for declared payload length`);
                return null;
            }
            
            // Extract payload
            const payload = ndefMessage.slice(payloadStart, payloadStart + payloadLength);
            console.log(`📋 Payload: ${payload.toString('hex')}`);
            
            // Parse text record payload exactly like Android
            if (payload.length < 1) {
                return null;
            }
            
            const statusByte = payload[0];
            const languageCodeLength = statusByte & 0x3F; // Lower 6 bits
            
            console.log(`📋 Status byte: 0x${statusByte.toString(16)}, Lang code length: ${languageCodeLength}`);
            
            if (payload.length < 1 + languageCodeLength) {
                console.log(`⚠️ Payload too short for language code`);
                return null;
            }
            
            // Skip status byte and language code, extract text
            const textStart = 1 + languageCodeLength;
            const textData = payload.slice(textStart);
            
            const extractedText = textData.toString('utf8');
            console.log(`✅ Extracted text: "${extractedText}"`);
            
            return extractedText;
        } catch (error) {
            console.error('❌ Error parsing NDEF message:', error);
            return null;
        }
    }
    
    /**
     * Parse TLV format to extract NDEF record
     * @param {Buffer} tlvData - TLV formatted data
     * @returns {string|null} - Extracted text or null
     */
    static parseTlvFormat(tlvData) {
        try {
            let offset = 0;
            
            while (offset < tlvData.length) {
                const type = tlvData[offset];
                offset += 1;
                
                if (type === 0x00) {
                    // NULL TLV - skip
                    continue;
                } else if (type === 0xFE) {
                    // Terminator TLV - end
                    break;
                } else if (type === 0x03) {
                    // NDEF Message TLV
                    let length;
                    
                    if (offset >= tlvData.length) break;
                    
                    if (tlvData[offset] === 0xFF) {
                        // 3-byte length format
                        if (offset + 2 >= tlvData.length) break;
                        offset += 1;
                        length = (tlvData[offset] << 8) | tlvData[offset + 1];
                        offset += 2;
                    } else {
                        // 1-byte length format
                        length = tlvData[offset];
                        offset += 1;
                    }
                    
                    if (offset + length > tlvData.length) break;
                    
                    // Extract NDEF record
                    const ndefRecord = tlvData.slice(offset, offset + length);
                    
                    // Parse the NDEF record
                    return this.parseNdefRecord(ndefRecord);
                } else {
                    // Unknown TLV type - skip
                    if (offset >= tlvData.length) break;
                    const length = tlvData[offset];
                    offset += 1 + length;
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error parsing TLV format:', error);
            return null;
        }
    }
    
    /**
     * Parse a single NDEF record
     * @param {Buffer} ndefRecord - The NDEF record
     * @returns {string|null} - Extracted text or null
     */
    static parseNdefRecord(ndefRecord) {
        try {
            if (!ndefRecord || ndefRecord.length < 3) {
                return null;
            }
            
            const flags = ndefRecord[0];
            const typeLength = ndefRecord[1];
            const payloadLength = ndefRecord[2];
            
            // Check if it's a text record
            const tnf = flags & 0x07;
            if (tnf !== 0x01) { // Not well-known type
                return null;
            }
            
            // Calculate payload start position
            const payloadStart = 3 + typeLength;
            
            if (ndefRecord.length < payloadStart + payloadLength) {
                return null;
            }
            
            // Extract payload
            const payload = ndefRecord.slice(payloadStart, payloadStart + payloadLength);
            
            // Parse text record payload
            return this.parseTextRecord(payload);
        } catch (error) {
            console.error('❌ Error parsing NDEF record:', error);
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