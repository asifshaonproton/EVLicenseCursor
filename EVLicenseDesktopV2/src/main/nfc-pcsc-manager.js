const { NFC } = require('nfc-pcsc');
const { EventEmitter } = require('events');
const CryptoUtils = require('./crypto-utils');
const NdefUtils = require('./ndef-utils');

class NFCPCSCManager extends EventEmitter {
    constructor() {
        super();
        this.nfc = null;
        this.readers = new Map();
        this.activeReaders = new Map();
        this.isInitialized = false;
        this.connectedReaders = [];
        this.currentCard = null;
        this.lastCardUID = null;
        
        // Initialize and keep reference
        this.nfc = new NFC();
        
        console.log('🔧 NFC-PCSC Manager initialized');
        
        // Set up global error handler
        this.nfc.on('error', (err) => {
            console.error('🚨 NFC Error:', err);
            this.emit('error', err);
        });
    }

    async initialize() {
        try {
            console.log('🚀 Initializing NFC-PCSC Manager...');
            
            // Set up reader connection handler
            this.nfc.on('reader', (reader) => {
                console.log(`📖 Reader connected: ${reader.name}`);
                this.handleReaderConnection(reader);
            });

            // Wait longer for readers to be detected (up to 5 seconds)
            console.log('⏳ Waiting for NFC readers to be detected...');
            let waitTime = 0;
            const maxWaitTime = 5000; // 5 seconds
            const checkInterval = 500; // Check every 500ms
            
            while (this.readers.size === 0 && waitTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitTime += checkInterval;
                console.log(`⏳ Still waiting... (${waitTime}ms elapsed)`);
            }
            
            if (this.readers.size === 0) {
                const supportUrl = 'https://www.acs.com.hk/en/products/3/acr122u-usb-nfc-reader/';
                const driverUrl = 'https://www.acs.com.hk/en/products/3/acr122u-usb-nfc-reader/#tab_download';
                const msg = `No NFC reader detected after ${maxWaitTime}ms.\n\nIf you are using an ACS ACR122U, please ensure the official PC/SC driver is installed.\n\nDownload: ${driverUrl}`;
                console.error(msg);
                this.emit('error', new Error(msg));
            } else {
                console.log(`✅ Found ${this.readers.size} NFC reader(s)`);
            }

            this.isInitialized = true;
            console.log('✅ NFC-PCSC Manager initialized successfully');
            
            // Emit initialization complete
            this.emit('initialized');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize NFC Manager:', error);
            this.emit('error', error);
            return false;
        }
    }

    handleReaderConnection(reader) {
        const readerInfo = {
            name: reader.name,
            connected: true,
            card: null,
            lastSeen: new Date(),
            capabilities: this.getReaderCapabilities(reader.name),
            reader: reader
        };

        this.readers.set(reader.name, readerInfo);
        this.connectedReaders.push(readerInfo);

        console.log(`🔗 Reader ${reader.name} added to active readers`);
        
        // Emit reader connected event with details
        this.emit('reader-connected', {
            name: reader.name,
            capabilities: readerInfo.capabilities,
            connected: true
        });

        // Handle reader disconnect
        reader.on('end', () => {
            console.log(`📖❌ Reader ${reader.name} disconnected`);
            this.readers.delete(reader.name);
            this.connectedReaders = this.connectedReaders.filter(r => r.name !== reader.name);
            
            this.emit('reader-disconnected', {
                name: reader.name,
                connected: false
            });
        });

        // Handle reader errors
        reader.on('error', (err) => {
            console.error(`📖🚨 Reader ${reader.name} error:`, err);
            this.emit('reader-error', {
                name: reader.name,
                error: err.message
            });
        });

        // Handle card detection
        reader.on('card', (card) => {
            console.log(`💳 Card detected on ${reader.name}`);
            this.handleCardDetected(reader, card);
        });

        // Handle card removal
        reader.on('card.off', (card) => {
            console.log(`💳❌ Card removed from ${reader.name}`);
            this.handleCardRemoved(reader, card);
        });
    }

    async handleCardDetected(reader, card) {
        try {
            const cardData = {
                uid: card.uid,
                atr: card.atr,
                type: this.detectCardType(card.atr),
                reader: reader.name,
                detectedAt: new Date(),
                standard: card.standard || 'Unknown',
                card: card // Store the actual card object for reading operations
            };

            console.log('🏷️ Card details:', cardData);

            // Try to read additional card data
            try {
                const additionalData = await this.readCardData(reader, card);
                cardData.data = additionalData;
            } catch (readError) {
                console.warn('⚠️ Could not read additional card data:', readError.message);
                cardData.data = null;
            }

            this.currentCard = cardData;
            this.lastCardUID = cardData.uid;

            // Update reader info
            const readerInfo = this.readers.get(reader.name);
            if (readerInfo) {
                readerInfo.card = cardData;
                readerInfo.lastSeen = new Date();
            }

            // Emit card detected event
            this.emit('card-detected', cardData);

        } catch (error) {
            console.error('❌ Error handling card detection:', error);
            this.emit('error', error);
        }
    }

    handleCardRemoved(reader, card) {
        console.log(`💳🔄 Card removed from ${reader.name}`);
        
        // Update reader info
        const readerInfo = this.readers.get(reader.name);
        if (readerInfo) {
            readerInfo.card = null;
            readerInfo.lastSeen = new Date();
        }

        if (this.currentCard && this.currentCard.uid === card.uid) {
            this.currentCard = null;
        }

        // Emit card removed event
        this.emit('card-removed', {
            uid: card.uid,
            reader: reader.name,
            removedAt: new Date()
        });
    }

    async readCardData(reader, card) {
        try {
            // Basic card information
            const data = {
                uid: card.uid,
                atr: card.atr,
                type: this.detectCardType(card.atr),
                standard: card.standard || 'Unknown',
                blocks: [],
                extractedText: null,
                ndefMessage: null
            };

            console.log(`📖 Reading card data for ${card.type} with UID: ${card.uid}`);

            // For MIFARE Classic cards, try to authenticate and read
            if (card.type.includes('MIFARE Classic')) {
                try {
                    // Use the reader's transmit method to send APDU commands
                    // First, try to read block 0 (manufacturer data) - this should be readable without auth
                    const block0Command = Buffer.from([0xFF, 0xCA, 0x00, 0x00, 0x04]); // GET UID command
                    const block0Response = await reader.transmit(block0Command, 16);
                    
                    if (block0Response && block0Response.length >= 4) {
                        data.blocks.push({
                            block: 0,
                            data: block0Response.toString('hex'),
                            length: block0Response.length,
                            textContent: null
                        });
                        console.log(`📊 Read block 0: ${block0Response.toString('hex')}`);
                    }

                    // Try to read block 1 (UID) using READ BINARY command
                    const block1Command = Buffer.from([0xFF, 0xB0, 0x00, 0x01, 0x10]); // READ BINARY command
                    try {
                        const block1Response = await reader.transmit(block1Command, 16);
                        data.blocks.push({
                            block: 1,
                            data: block1Response.toString('hex'),
                            length: block1Response.length,
                            textContent: null
                        });
                        console.log(`📊 Read block 1: ${block1Response.toString('hex')}`);
                    } catch (block1Error) {
                        console.log(`⚠️ Could not read block 1: ${block1Error.message}`);
                    }

                    // For MIFARE Classic, try to read NDEF data from block 4 onwards
                    // First, try to read block 4 to see if it contains NDEF TLV
                    try {
                        const block4Command = Buffer.from([0xFF, 0xB0, 0x00, 0x04, 0x10]); // READ BINARY command
                        const block4Response = await reader.transmit(block4Command, 16);
                        
                        data.blocks.push({
                            block: 4,
                            data: block4Response.toString('hex'),
                            length: block4Response.length,
                            textContent: this.extractTextFromBlock(block4Response)
                        });
                        console.log(`📊 Read block 4: ${block4Response.toString('hex')}`);
                        console.log(`🔍 DEBUG: Block 4 as ASCII: "${block4Response.toString('ascii')}"`);
                        console.log(`🔍 DEBUG: Block 4 as UTF-8: "${block4Response.toString('utf8')}"`);

                        // Check if block 4 starts with NDEF TLV (0x03)
                        if (block4Response[0] === 0x03) {
                            console.log('🔍 Detected NDEF TLV format in block 4');
                            const ndefLength = block4Response[1];
                            if (ndefLength > 0 && ndefLength <= 14) { // 14 bytes available after TLV header
                                const ndefData = block4Response.slice(2, 2 + ndefLength);
                                try {
                                    const NdefUtils = require('./ndef-utils');
                                    const extractedText = NdefUtils.parseNdefMessage(ndefData);
                                    if (extractedText) {
                                        data.extractedText = extractedText;
                                        data.ndefMessage = extractedText;
                                        console.log(`📝 Extracted NDEF text: "${extractedText}"`);
                                    }
                                } catch (ndefError) {
                                    console.log('⚠️ NDEF parsing failed:', ndefError.message);
                                }
                            }
                        }

                        // Try to read a few more blocks for additional data
                        for (let block = 5; block < 8; block++) {
                            try {
                                const blockCommand = Buffer.from([0xFF, 0xB0, 0x00, block, 0x10]); // READ BINARY command
                                const blockResponse = await reader.transmit(blockCommand, 16);
                                data.blocks.push({
                                    block: block,
                                    data: blockResponse.toString('hex'),
                                    length: blockResponse.length,
                                    textContent: this.extractTextFromBlock(blockResponse)
                                });
                                console.log(`📊 Read block ${block}: ${blockResponse.toString('hex')}`);
                            } catch (blockError) {
                                console.log(`⚠️ Could not read block ${block}: ${blockError.message}`);
                                break;
                            }
                        }
                    } catch (block4Error) {
                        console.log('⚠️ Could not read block 4:', block4Error.message);
                    }

                } catch (authError) {
                    console.log('⚠️ MIFARE Classic authentication/reading failed:', authError.message);
                }
            } else {
                // For other card types, try direct reading
                try {
                    for (let block = 0; block < 8; block++) {
                        try {
                            const blockCommand = Buffer.from([0xFF, 0xB0, 0x00, block, 0x10]); // READ BINARY command
                            const blockResponse = await reader.transmit(blockCommand, 16);
                            data.blocks.push({
                                block: block,
                                data: blockResponse.toString('hex'),
                                length: blockResponse.length,
                                textContent: this.extractTextFromBlock(blockResponse)
                            });
                            console.log(`📊 Read block ${block}: ${blockResponse.toString('hex')}`);
                            console.log(`🔍 DEBUG: Block ${block} as ASCII: "${blockResponse.toString('ascii')}"`);
                            console.log(`🔍 DEBUG: Block ${block} as UTF-8: "${blockResponse.toString('utf8')}"`);
                        } catch (blockError) {
                            console.log(`⚠️ Could not read block ${block}: ${blockError.message}`);
                            break;
                        }
                    }
                } catch (readError) {
                    console.log('⚠️ Block reading not supported:', readError.message);
                }
            }

            // If no NDEF text was extracted, try to extract from raw blocks
            if (!data.extractedText) {
            this.extractCleanText(data);
            }

            console.log(`✅ Card reading completed. Extracted text: "${data.extractedText}"`);
            return data;
        } catch (error) {
            console.error('❌ Error reading card data:', error);
            throw error;
        }
    }

    extractTextFromBlock(blockData) {
        try {
            if (!blockData || blockData.length === 0) return null;
            
            // Convert to string, but stop at first null byte (end of text)
            const fullText = blockData.toString('utf8');
            const nullIndex = fullText.indexOf('\0');
            const text = nullIndex >= 0 ? fullText.substring(0, nullIndex) : fullText;
            
            // Only return if there's meaningful text content (printable ASCII)
            if (text && text.length > 0 && /^[\x20-\x7E]+$/.test(text)) {
                return text;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    extractCleanText(cardData) {
        try {
            if (!cardData.blocks || cardData.blocks.length === 0) return;
            // Get data blocks (4+) sorted by block number
            const dataBlocks = cardData.blocks
                .filter(block => block.block >= 4)
                .sort((a, b) => a.block - b.block);
            if (dataBlocks.length === 0) return;
            // Concatenate all block data to reconstruct NDEF record
            let allData = Buffer.alloc(0);
            for (const block of dataBlocks) {
                try {
                    const blockBuffer = Buffer.from(block.data, 'hex');
                    allData = Buffer.concat([allData, blockBuffer]);
                } catch (e) {
                    break;
                }
            }
            if (allData.length === 0) return;
            
            // DEBUG: Log the raw data being processed
            console.log(`🔍 DEBUG: Raw hex data from blocks: ${allData.toString('hex')}`);
            console.log(`🔍 DEBUG: Raw data length: ${allData.length} bytes`);
            console.log(`🔍 DEBUG: First 16 bytes as hex: ${allData.slice(0, 16).toString('hex')}`);
            console.log(`🔍 DEBUG: First 16 bytes as ASCII: ${allData.slice(0, 16).toString('ascii')}`);
            
            // DEBUG: Check if this might be encrypted/encoded data
            const rawTextDebug = allData.toString('utf8').replace(/[\x00-\x1F\x7F]/g, '').trim();
            console.log(`🔍 DEBUG: Raw UTF-8 text: "${rawTextDebug}"`);
            
            // Check if it looks like base64 encoded data
            const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
            if (base64Pattern.test(rawTextDebug)) {
                console.log(`🔍 DEBUG: Data appears to be base64 encoded`);
                try {
                    const decoded = Buffer.from(rawTextDebug, 'base64');
                    console.log(`🔍 DEBUG: Base64 decoded length: ${decoded.length} bytes`);
                    console.log(`🔍 DEBUG: Base64 decoded hex: ${decoded.toString('hex')}`);
                    
                    // Try to decrypt if it's our encrypted format
                    try {
                        const CryptoUtils = require('./crypto-utils');
                        const decrypted = CryptoUtils.decrypt(rawTextDebug);
                        console.log(`🔍 DEBUG: Decrypted data: "${decrypted}"`);
                        
                        // Try to parse as JSON
                        try {
                            const jsonData = JSON.parse(decrypted);
                            console.log(`🔍 DEBUG: Parsed JSON:`, jsonData);
                            cardData.extractedText = `Decrypted License: ${jsonData.holderName || 'Unknown'} - ${jsonData.licenseNumber || 'No License'}`;
                            cardData.decryptedData = jsonData;
                            return;
                        } catch (jsonError) {
                            console.log(`🔍 DEBUG: Not valid JSON after decryption: ${jsonError.message}`);
                        }
                    } catch (decryptError) {
                        console.log(`🔍 DEBUG: Decryption failed: ${decryptError.message}`);
                    }
                } catch (base64Error) {
                    console.log(`🔍 DEBUG: Base64 decoding failed: ${base64Error.message}`);
                }
            }
            
            // Check if it's a simple repeated pattern (like "cccc")
            const uniqueChars = [...new Set(rawTextDebug)];
            if (uniqueChars.length === 1 && rawTextDebug.length > 1) {
                console.log(`🔍 DEBUG: Detected repeated character pattern: "${rawTextDebug}" (${rawTextDebug.length} times)`);
                console.log(`🔍 DEBUG: This might be padding, null bytes, or a reading error`);
            }
            
            // --- Use ndef npm library for NDEF parsing ---
            // If block 4 starts with 0x03, treat as TLV and extract NDEF
            if (allData[0] === 0x03) {
                console.log('🔍 DEBUG: Detected TLV format (0x03)');
                // TLV format: 0x03, length, NDEF, 0xFE
                // Extract NDEF message from TLV
                const tlvLen = allData[1];
                const ndefMsg = allData.slice(2, 2 + tlvLen);
                console.log(`🔍 DEBUG: TLV length: ${tlvLen}, NDEF message hex: ${ndefMsg.toString('hex')}`);
                const ndefText = NdefUtils.parseNdefMessage(ndefMsg);
                if (ndefText) {
                    cardData.extractedText = ndefText;
                    cardData.isAndroidCompatible = true;
                    console.log(`🔍 DEBUG: Successfully extracted NDEF text: "${ndefText}"`);
                    return;
                } else {
                    console.log('🔍 DEBUG: NDEF parsing failed for TLV data');
                }
            } else {
                console.log(`🔍 DEBUG: First byte is 0x${allData[0].toString(16)}, not TLV format`);
                // Try to parse as NDEF message directly
                const ndefText = NdefUtils.parseNdefMessage(allData);
                if (ndefText) {
                    cardData.extractedText = ndefText;
                    cardData.isAndroidCompatible = true;
                    console.log(`🔍 DEBUG: Successfully extracted NDEF text: "${ndefText}"`);
                    return;
                } else {
                    console.log('🔍 DEBUG: Direct NDEF parsing failed');
                }
            }
            // Fallback: try simple text extraction (legacy format)
            try {
                const simpleText = NdefUtils.parseSimpleTextRecord(allData);
                if (simpleText) {
                    cardData.extractedText = `Simple Text: "${simpleText}"`;
                    console.log(`🔍 DEBUG: Extracted simple text: "${simpleText}"`);
                    return;
                } else {
                    console.log('🔍 DEBUG: Simple text parsing failed');
                }
            } catch (simpleError) {
                console.log(`🔍 DEBUG: Simple text parsing error: ${simpleError.message}`);
            }
            // Last resort: raw text extraction
            const rawText = allData.toString('utf8').replace(/[\x00-\x1F\x7F]/g, '').trim();
            if (rawText && rawText.length > 0) {
                cardData.extractedText = `Raw Text: "${rawText}"`;
                console.log(`🔍 DEBUG: Raw text extraction result: "${rawText}"`);
                console.log(`🔍 DEBUG: This is likely binary data interpreted as UTF-8 text`);
            } else {
                console.log('🔍 DEBUG: No readable text found in raw data');
            }
        } catch (error) {
            console.log(`🔍 DEBUG: Error in extractCleanText: ${error.message}`);
            // ignore
        }
    }

    detectCardType(atr) {
        if (!atr) return 'Unknown';
        
        const atrHex = atr.toString('hex').toLowerCase();
        
        // Common card type detection based on ATR
        if (atrHex.includes('3b8f8001804f0ca0000003060300030000000068')) {
            return 'MIFARE Classic 1K';
        } else if (atrHex.includes('3b8f8001804f0ca000000306030001000000006a')) {
            return 'MIFARE Classic 4K';
        } else if (atrHex.includes('3b8f8001804f0ca0000003060300020000000069')) {
            return 'MIFARE Ultralight';
        } else if (atrHex.includes('3b8180018080')) {
            return 'MIFARE DESFire';
        } else if (atrHex.includes('3b8a80')) {
            return 'ISO14443 Type A';
        } else if (atrHex.includes('3b8b80')) {
            return 'ISO14443 Type B';
        }
        
        return `Unknown (ATR: ${atrHex})`;
    }

    getReaderCapabilities(readerName) {
        const name = readerName.toLowerCase();
        
        // Common reader capabilities based on name patterns
        const capabilities = {
            nfc: true,
            iso14443a: true,
            iso14443b: false,
            iso15693: false,
            felica: false,
            mifare: true,
            ntag: true,
            ultralight: true,
            desfire: false
        };

        // ACR readers
        if (name.includes('acr122') || name.includes('acr1222') || name.includes('acr125')) {
            capabilities.iso14443b = true;
            capabilities.iso15693 = true;
            capabilities.felica = true;
            capabilities.desfire = true;
        }

        // Add more reader-specific capabilities as needed
        return capabilities;
    }

    async writeCard(data) {
        try {
            if (!this.currentCard) {
                throw new Error('No card present for writing');
            }

            const readerInfo = Array.from(this.readers.values())
                .find(r => r.card && r.card.uid === this.currentCard.uid);
            if (!readerInfo) {
                throw new Error('Reader with current card not found');
            }
            const reader = readerInfo.reader;
            
            console.log(`📝 Writing to card type: ${this.currentCard.type}, UID: ${this.currentCard.uid}`);

            // --- Authenticate for MIFARE Classic before write ---
            if (this.currentCard.type && this.currentCard.type.includes('MIFARE Classic')) {
                console.log('🔑 Attempting MIFARE Classic authentication...');
                
                // For MIFARE Classic, we need to authenticate for each sector we want to write to
                // Sector 1 (blocks 4-7) is commonly used for NDEF data
                const sectorNumber = 1; // Sector 1 (blocks 4-7)
                const blockNumber = 4; // First block of sector 1
                
                // Try multiple authentication methods for MIFARE Classic
                const authMethods = [
                    { keyType: 0x60, key: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), name: 'Key A (default)' },
                    { keyType: 0x61, key: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), name: 'Key B (default)' },
                    { keyType: 0x60, key: Buffer.from([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5]), name: 'Key A (custom)' },
                    { keyType: 0x61, key: Buffer.from([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5]), name: 'Key B (custom)' },
                    { keyType: 0x60, key: Buffer.from([0xD3, 0xF7, 0xD3, 0xF7, 0xD3, 0xF7]), name: 'Key A (transport)' },
                    { keyType: 0x61, key: Buffer.from([0xD3, 0xF7, 0xD3, 0xF7, 0xD3, 0xF7]), name: 'Key B (transport)' }
                ];
                
                let authenticated = false;
                let lastError = null;
                
                for (const method of authMethods) {
                    try {
                        console.log(`🔑 Trying ${method.name} for sector ${sectorNumber} (block ${blockNumber})...`);
                        await reader.authenticate(blockNumber, method.keyType, method.key, this.currentCard.uid);
                        console.log(`✅ MIFARE Classic authenticated with ${method.name} for sector ${sectorNumber}`);
                        authenticated = true;
                        break;
                    } catch (authErr) {
                        console.log(`❌ ${method.name} failed: ${authErr.message}`);
                        lastError = authErr;
                    }
                }
                
                if (!authenticated) {
                    console.log('⚠️ All authentication methods failed, trying alternative approach...');
                    
                    // Try using APDU commands for authentication
                    try {
                        console.log('🔄 Trying APDU-based authentication...');
                        
                        // MIFARE Classic authentication via APDU
                        const authCommand = Buffer.concat([
                            Buffer.from([0xFF, 0x86, 0x00, 0x00, 0x05, 0x01, 0x00]), // AUTHENTICATE
                            Buffer.from([0x60, 0x00]), // Key A, block 0
                            Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]) // Default key
                        ]);
                        
                        const authResponse = await reader.transmit(authCommand, 2);
                        console.log('✅ APDU authentication successful');
                        authenticated = true;
                    } catch (apduAuthErr) {
                        console.log(`❌ APDU authentication failed: ${apduAuthErr.message}`);
                        console.log('📝 Proceeding with write attempt without authentication...');
                    }
                }
            }

            // --- Prepare NDEF message using ndef library ---
            let finalData;
            if (typeof data === 'object' && data !== null) {
                const licenseData = { ...data };
                if (this.currentCard && this.currentCard.uid) {
                    const uidDecimal = this.currentCard.uid.replace(/:/g, '');
                    licenseData.nfcCardNumber = uidDecimal;
                }
                const licenseJson = CryptoUtils.createLicenseJson(licenseData);
                finalData = CryptoUtils.encrypt(licenseJson);
            } else if (typeof data === 'string') {
                finalData = CryptoUtils.encrypt(data);
            } else {
                finalData = String(data);
            }

            // --- Create NDEF message and wrap in TLV if needed ---
            let ndefMessage = NdefUtils.createNdefMessage(finalData);
            let writeBuffer;
            
            // Check if tag is already NDEF formatted (simple check: block 4 starts with 0x03)
            let isNdefFormatted = false;
            try {
                const block4 = await reader.read(4, 16);
                if (block4[0] === 0x03) isNdefFormatted = true;
                console.log(`📋 Block 4 first byte: 0x${block4[0].toString(16)}, NDEF formatted: ${isNdefFormatted}`);
            } catch (e) {
                console.log(`⚠️ Could not read block 4 to check NDEF format: ${e.message}`);
            }
            
            if (!isNdefFormatted) {
                writeBuffer = NdefUtils.wrapNdefInTlv(ndefMessage);
                console.log('📝 Tag not NDEF formatted, writing TLV structure');
            } else {
                writeBuffer = ndefMessage;
                console.log('📝 Tag is NDEF formatted, writing NDEF message directly');
            }

            // --- Write to card (block 4 onwards for Classic, block 4 for Ultralight/NTAG) ---
            let maxBlockSize = 16;
            let blockStart = 4;
            if (this.currentCard.type && (this.currentCard.type.includes('Ultralight') || this.currentCard.type.includes('NTAG'))) {
                maxBlockSize = 4;
                blockStart = 4; // For NTAG/Ultralight, NDEF usually starts at page 4 (block 4)
            }
            
            const blocks = [];
            let totalBytesWritten = 0;
            const totalBlocks = Math.ceil(writeBuffer.length / maxBlockSize);
            
            // For MIFARE Classic, try different write approaches
            if (this.currentCard.type && this.currentCard.type.includes('MIFARE Classic')) {
                console.log('📝 Writing to MIFARE Classic card...');
                
                // For MIFARE Classic, try writing to sector 0 first (blocks 0-3) which might be more accessible
                let writeSectors = [0, 1]; // Try sector 0 first, then sector 1
                let writeSuccessful = false;
                
                for (const sector of writeSectors) {
                    if (writeSuccessful) break;
                    
                    console.log(`📝 Trying to write to sector ${sector}...`);
                    const sectorBlockStart = sector * 4; // Each sector has 4 blocks
                    
                    try {
                        // Try using APDU commands for MIFARE Classic writing
                        for (let i = 0; i < totalBlocks; i++) {
                            const blockNumber = sectorBlockStart + i;
                            const start = i * maxBlockSize;
                            const end = Math.min(start + maxBlockSize, writeBuffer.length);
                            let blockData = writeBuffer.slice(start, end);
                            if (blockData.length < maxBlockSize) {
                                const padding = Buffer.alloc(maxBlockSize - blockData.length, 0x00);
                                blockData = Buffer.concat([blockData, padding]);
                            }
                            
                            try {
                                // Use APDU command for MIFARE Classic write
                                const apduCommand = Buffer.concat([
                                    Buffer.from([0xFF, 0xD6, 0x00, blockNumber, maxBlockSize]), // WRITE BINARY
                                    blockData
                                ]);
                                
                                const response = await reader.transmit(apduCommand, maxBlockSize + 2);
                                console.log(`✅ Block ${blockNumber} written successfully in sector ${sector}`);
                                
                                totalBytesWritten += (end - start);
                                blocks.push({
                                    block: blockNumber,
                                    hexData: blockData.toString('hex'),
                                    originalData: writeBuffer.slice(start, end),
                                    bytesWritten: end - start,
                                    method: 'APDU',
                                    sector: sector
                                });
                            } catch (blockError) {
                                console.log(`❌ APDU write failed for block ${blockNumber}, trying direct write...`);
                                
                                try {
                                    // Fallback to direct write
                                    await reader.write(blockNumber, blockData);
                                    console.log(`✅ Block ${blockNumber} written with direct method in sector ${sector}`);
                                    
                                    totalBytesWritten += (end - start);
                                    blocks.push({
                                        block: blockNumber,
                                        hexData: blockData.toString('hex'),
                                        originalData: writeBuffer.slice(start, end),
                                        bytesWritten: end - start,
                                        method: 'direct',
                                        sector: sector
                                    });
                                } catch (directError) {
                                    console.log(`❌ Direct write also failed for block ${blockNumber}: ${directError.message}`);
                                    
                                    // For MIFARE Classic, try one more approach - using MIFARE commands
                                    try {
                                        console.log(`🔄 Trying MIFARE-specific write for block ${blockNumber}...`);
                                        
                                        // Try MIFARE WRITE command
                                        const mifareCommand = Buffer.concat([
                                            Buffer.from([0xFF, 0xD6, 0x00, blockNumber, 0x10]), // MIFARE WRITE
                                            blockData
                                        ]);
                                        
                                        const mifareResponse = await reader.transmit(mifareCommand, 0x10 + 2);
                                        console.log(`✅ Block ${blockNumber} written with MIFARE command in sector ${sector}`);
                                        
                                        totalBytesWritten += (end - start);
                                        blocks.push({
                                            block: blockNumber,
                                            hexData: blockData.toString('hex'),
                                            originalData: writeBuffer.slice(start, end),
                                            bytesWritten: end - start,
                                            method: 'MIFARE',
                                            sector: sector
                                        });
                                    } catch (mifareError) {
                                        console.log(`❌ All write methods failed for block ${blockNumber} in sector ${sector}`);
                                        throw new Error(`All write methods failed for block ${blockNumber}: ${mifareError.message}`);
                                    }
                                }
                            }
                        }
                        
                        // If we get here, the write was successful for this sector
                        writeSuccessful = true;
                        console.log(`✅ Successfully wrote to sector ${sector}`);
                        break;
                        
                    } catch (sectorError) {
                        console.log(`❌ Failed to write to sector ${sector}: ${sectorError.message}`);
                        if (sector === writeSectors[writeSectors.length - 1]) {
                            throw new Error(`Failed to write to any sector: ${sectorError.message}`);
                        }
                    }
                }
            } else {
                // For other card types (Ultralight, NTAG, etc.)
                console.log('📝 Writing to non-MIFARE Classic card...');
                
                for (let i = 0; i < totalBlocks; i++) {
                    const blockNumber = blockStart + i;
                    const start = i * maxBlockSize;
                    const end = Math.min(start + maxBlockSize, writeBuffer.length);
                    let blockData = writeBuffer.slice(start, end);
                    if (blockData.length < maxBlockSize) {
                        const padding = Buffer.alloc(maxBlockSize - blockData.length, 0x00);
                        blockData = Buffer.concat([blockData, padding]);
                    }
                    try {
                        await reader.write(blockNumber, blockData);
                        console.log(`✅ Block ${blockNumber} written successfully`);
                        totalBytesWritten += (end - start);
                        blocks.push({
                            block: blockNumber,
                            hexData: blockData.toString('hex'),
                            originalData: writeBuffer.slice(start, end),
                            bytesWritten: end - start,
                            method: 'direct'
                        });
                    } catch (blockError) {
                        console.log(`❌ Direct write failed for block ${blockNumber}, trying APDU...`);
                        
                        try {
                            // Try APDU write for non-MIFARE Classic cards
                            const apduCommand = Buffer.concat([
                                Buffer.from([0xFF, 0xD6, 0x00, blockNumber, maxBlockSize]), // WRITE BINARY
                                blockData
                            ]);
                            
                            const response = await reader.transmit(apduCommand, maxBlockSize + 2);
                            console.log(`✅ Block ${blockNumber} written with APDU`);
                            
                            totalBytesWritten += (end - start);
                            blocks.push({
                                block: blockNumber,
                                hexData: blockData.toString('hex'),
                                originalData: writeBuffer.slice(start, end),
                                bytesWritten: end - start,
                                method: 'APDU'
                            });
                        } catch (apduError) {
                            throw new Error(`Failed to write block ${blockNumber}: ${apduError.message}`);
                        }
                    }
                }
            }

            this.emit('card-written', {
                uid: this.currentCard.uid,
                originalData: data,
                encryptedData: finalData,
                ndefMessage: ndefMessage.toString('hex'),
                blocks: blocks,
                totalBytesWritten: totalBytesWritten,
                isAndroidCompatible: true,
                timestamp: new Date()
            });

            return {
                success: true,
                totalBytesWritten,
                blocks
            };
        } catch (error) {
            console.error('❌ Error writing to card:', error);
            throw error;
        }
    }

    async writeTestLicenseToCard() {
        try {
            if (!this.currentCard) {
                throw new Error('No card present for writing');
            }

            const readerInfo = Array.from(this.readers.values())
                .find(r => r.card && r.card.uid === this.currentCard.uid);
            if (!readerInfo) {
                throw new Error('Reader with current card not found');
            }
            const reader = readerInfo.reader;
            
            console.log(`📝 Writing test license to card type: ${this.currentCard.type}, UID: ${this.currentCard.uid}`);

            // Create test license data
            const testLicenseData = {
                holderName: "John Doe",
                mobile: "+1234567890",
                city: "Rangpur",
                licenseType: "A",
                licenseNumber: "LIC123456",
                nfcCardNumber: this.currentCard.uid,
                validityDate: "2025-12-31",
                email: "john@example.com",
                vehicleMake: "Toyota",
                vehicleModel: "Corolla",
                vehicleYear: 2020,
                vehicleColor: "White",
                vehicleVin: "1HGBH41JXMN109186",
                status: "Active",
                issueDate: "2024-01-15",
                notes: "Test license for debugging"
            };

            // Write the test data
            const result = await this.writeCard(testLicenseData);
            
            console.log('✅ Test license written successfully');
            return {
                success: true,
                message: 'Test license written successfully',
                licenseData: testLicenseData,
                writeResult: result
            };
        } catch (error) {
            console.error('❌ Error writing test license:', error);
            throw error;
        }
    }

    getStatus() {
        const readers = Array.from(this.readers.values()).map(reader => ({
            name: reader.name,
            connected: reader.connected,
            hasCard: !!reader.card,
            cardUID: reader.card ? reader.card.uid : null,
            lastSeen: reader.lastSeen,
            capabilities: reader.capabilities
        }));

        return {
            initialized: this.isInitialized,
            readersCount: this.readers.size,
            readers: readers,
            currentCard: this.currentCard,
            lastCardUID: this.lastCardUID,
            hasActiveCard: !!this.currentCard,
            status: this.isInitialized ? 'Ready' : 'Initializing'
        };
    }

    getDetailedReaderInfo() {
        return Array.from(this.readers.values()).map(reader => ({
            name: reader.name,
            vendor: this.extractVendorFromName(reader.name),
            model: this.extractModelFromName(reader.name),
            connected: reader.connected,
            capabilities: reader.capabilities,
            currentCard: reader.card ? {
                uid: reader.card.uid,
                type: reader.card.type,
                atr: reader.card.atr ? reader.card.atr.toString('hex') : null,
                detectedAt: reader.card.detectedAt
            } : null,
            lastSeen: reader.lastSeen
        }));
    }

    extractVendorFromName(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('acr') || nameLower.includes('acs')) {
            return 'ACS (Advanced Card Systems)';
        } else if (nameLower.includes('omnikey')) {
            return 'HID Global (OMNIKEY)';
        } else if (nameLower.includes('gemalto')) {
            return 'Gemalto';
        } else if (nameLower.includes('identiv')) {
            return 'Identiv';
        }
        return 'Unknown Vendor';
    }

    extractModelFromName(name) {
        const patterns = [
            { pattern: /acr122u/i, model: 'ACR122U NFC Reader' },
            { pattern: /acr1222l/i, model: 'ACR1222L VisualVantage' },
            { pattern: /acr125/i, model: 'ACR125 nPA Reader' },
            { pattern: /acr1251u/i, model: 'ACR1251U USB NFC Reader II' },
            { pattern: /acr1252u/i, model: 'ACR1252U USB NFC Reader III' },
            { pattern: /acr1255u/i, model: 'ACR1255U-J1 Secure Bluetooth NFC Reader' },
            { pattern: /acr1281u/i, model: 'ACR1281U-C1 Dual Boost II' },
            { pattern: /acr1283l/i, model: 'ACR1283L Standalone Contactless Reader' }
        ];

        for (const { pattern, model } of patterns) {
            if (pattern.test(name)) {
                return model;
            }
        }

        return name; // Return original name if no pattern matches
    }

    async refreshReaders() {
        try {
            console.log('🔄 Refreshing NFC readers...');
            
            // The nfc-pcsc library automatically manages reader connections
            // We just need to update our status
            const status = this.getStatus();
            
            this.emit('readers-refreshed', status);
            
            return status;
        } catch (error) {
            console.error('❌ Error refreshing readers:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            console.log('🧹 Cleaning up NFC-PCSC Manager...');
            
            // Clear readers
            this.readers.clear();
            this.connectedReaders = [];
            this.currentCard = null;
            this.lastCardUID = null;
            
            // Close NFC instance if it exists
            if (this.nfc) {
                // nfc-pcsc doesn't have a close method, but we can remove listeners
                this.nfc.removeAllListeners();
            }
            
            this.isInitialized = false;
            
            console.log('✅ NFC-PCSC Manager cleaned up');
            
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    // Polling methods for compatibility
    async startPolling() {
        // nfc-pcsc automatically polls for cards when readers are connected
        console.log('📡 NFC polling is automatically active with connected readers');
        this.emit('polling-started');
        return true;
    }

    async stopPolling() {
        // nfc-pcsc automatically manages polling
        console.log('📡 NFC polling control is managed automatically by nfc-pcsc');
        this.emit('polling-stopped');
        return true;
    }

    // Read card method for compatibility
    async readCard() {
        if (!this.currentCard) {
            throw new Error('No card present to read');
        }
        
        // Find the reader that has the current card
        const readerInfo = Array.from(this.readers.values()).find(r => r.card && r.card.uid === this.currentCard.uid);
        
        if (!readerInfo) {
            throw new Error('Reader not found for current card');
        }
        
        // Get the actual card object from the current card data
        const card = this.currentCard.card || this.currentCard;
        
        // Read the card data
        const cardData = await this.readCardData(readerInfo.reader, card);
        
        // Add detailed debugging information
        this.logDetailedCardInfo(cardData);
        
        return {
            ...this.currentCard,
            ...cardData
        };
    }

    async testCardReading() {
        console.log('\n🧪 CARD READING TEST MODE');
        console.log('=====================================');
        console.log('This will help determine if "cccc" is static data or varies between cards.');
        console.log('Please place different NFC cards on the reader to test.');
        console.log('=====================================\n');
        
        // Set up a test listener
        this.testResults = [];
        this.testModeActive = true;
        
        // Store the original card detected handler
        this.originalCardDetectedHandler = this.listeners('card-detected')[0];
        
        // Set up test handler
        this.testHandler = async (cardData) => {
            console.log(`\n🧪 TEST RESULT - Card ${this.testResults.length + 1}:`);
            console.log(`UID: ${cardData.uid}`);
            console.log(`Type: ${cardData.type}`);
            console.log(`Extracted Text: "${cardData.extractedText}"`);
            
            this.testResults.push({
                uid: cardData.uid,
                type: cardData.type,
                extractedText: cardData.extractedText,
                timestamp: new Date().toISOString()
            });
            
            console.log(`\n📊 TEST SUMMARY (${this.testResults.length} cards tested):`);
            this.testResults.forEach((result, index) => {
                console.log(`${index + 1}. UID: ${result.uid} | Text: "${result.extractedText}"`);
            });
            
            // Check if all cards show the same text
            const uniqueTexts = [...new Set(this.testResults.map(r => r.extractedText))];
            if (uniqueTexts.length === 1) {
                console.log(`\n⚠️ WARNING: All ${this.testResults.length} cards show the same text: "${uniqueTexts[0]}"`);
                console.log('This suggests the text might be static data or a reading error.');
            } else {
                console.log(`\n✅ Different cards show different text (${uniqueTexts.length} unique texts)`);
                console.log('This suggests the text is coming from actual card data.');
            }
            console.log('=====================================\n');
        };
        
        // Listen for card detection during test
        this.on('card-detected', this.testHandler);
        
        return { success: true, message: 'Test mode started' };
    }

    async stopCardReadingTest() {
        if (!this.testModeActive) {
            return { success: false, message: 'Test mode not active' };
        }
        
        // Remove test handler
        if (this.testHandler) {
            this.off('card-detected', this.testHandler);
            this.testHandler = null;
        }
        
        this.testModeActive = false;
        
        console.log('\n🧪 TEST MODE ENDED');
        console.log(`Total cards tested: ${this.testResults.length}`);
        
        const results = [...this.testResults];
        this.testResults = [];
        
        return { 
            success: true, 
            message: `Test completed. ${results.length} cards tested.`,
            results: results
        };
    }

    logDetailedCardInfo(cardData) {
        console.log('\n🔍 DETAILED CARD ANALYSIS:');
        console.log('=====================================');
        console.log(`Card UID: ${cardData.uid}`);
        console.log(`Card Type: ${cardData.type}`);
        console.log(`ATR: ${cardData.atr ? cardData.atr.toString('hex') : 'N/A'}`);
        console.log(`Standard: ${cardData.standard}`);
        console.log(`Total Blocks Read: ${cardData.blocks ? cardData.blocks.length : 0}`);
        
        if (cardData.blocks && cardData.blocks.length > 0) {
            console.log('\n📊 BLOCK ANALYSIS:');
            cardData.blocks.forEach(block => {
                console.log(`Block ${block.block}:`);
                console.log(`  Hex: ${block.data}`);
                console.log(`  Length: ${block.length} bytes`);
                console.log(`  ASCII: "${Buffer.from(block.data, 'hex').toString('ascii')}"`);
                console.log(`  UTF-8: "${Buffer.from(block.data, 'hex').toString('utf8')}"`);
                if (block.textContent) {
                    console.log(`  Extracted Text: "${block.textContent}"`);
                }
                console.log('');
            });
        }
        
        console.log(`Final Extracted Text: "${cardData.extractedText}"`);
        console.log('=====================================\n');
    }
}

module.exports = NFCPCSCManager;