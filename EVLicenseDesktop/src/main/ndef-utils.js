const ndef = require('ndef');

class NdefUtils {
    
    /**
     * Create an NDEF text record using the ndef npm library
     * @param {string} text - The text to encode
     * @param {string} language - Language code (default: 'en')
     * @returns {Buffer} - The NDEF text record payload
     */
    static createTextRecord(text, language = 'en') {
        const records = [ndef.textRecord(text, language)];
        return Buffer.from(ndef.encodeMessage(records));
    }
    
    /**
     * Parse an NDEF text record using the ndef npm library
     * @param {Buffer} payload - The NDEF text record payload
     * @returns {string|null} - The extracted text
     */
    static parseTextRecord(payload) {
        try {
            const records = ndef.decodeMessage(payload);
            const textRecord = records.find(r => r.type && r.type.toString() === 'T');
            if (textRecord) {
                return ndef.text.decodePayload(textRecord.payload);
            }
            return null;
        } catch (error) {
            console.error('❌ Error parsing NDEF text record:', error);
            return null;
        }
    }
    
    /**
     * Create a complete NDEF message (single text record)
     * @param {string} text - The text to encode
     * @param {string} language - Language code (default: 'en')
     * @returns {Buffer} - Complete NDEF message
     */
    static createNdefMessage(text, language = 'en') {
        const records = [ndef.textRecord(text, language)];
        return Buffer.from(ndef.encodeMessage(records));
    }
    
    /**
     * Parse an NDEF message and extract the first text record
     * @param {Buffer} ndefMessage - The complete NDEF message
     * @returns {string|null} - Extracted text or null
     */
    static parseNdefMessage(ndefMessage) {
        try {
            const records = ndef.decodeMessage(ndefMessage);
            const textRecord = records.find(r => r.type && r.type.toString() === 'T');
            if (textRecord) {
                return ndef.text.decodePayload(textRecord.payload);
            }
            return null;
        } catch (error) {
            console.error('❌ Error parsing NDEF message:', error);
            return null;
        }
    }
    
    /**
     * Format a buffer as TLV for NDEF (0x03, length, NDEF, 0xFE)
     * @param {Buffer} ndefMessage - The NDEF message
     * @returns {Buffer} - TLV formatted data
     */
    static wrapNdefInTlv(ndefMessage) {
        const tlv = Buffer.alloc(ndefMessage.length + 2);
        tlv[0] = 0x03; // NDEF Message TLV
        tlv[1] = ndefMessage.length;
        ndefMessage.copy(tlv, 2);
        // Optionally add 0xFE terminator if space allows
        return Buffer.concat([tlv, Buffer.from([0xFE])]);
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