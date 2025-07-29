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
                standard: card.standard || 'Unknown'
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
                    // Try to read block 0 (manufacturer data) - this should be readable without auth
                    const block0 = await reader.read(0, 16);
                    data.blocks.push({
                        block: 0,
                        data: block0.toString('hex'),
                        length: block0.length,
                        textContent: null
                    });
                    console.log(`📊 Read block 0: ${block0.toString('hex')}`);

                    // Try to read block 1 (UID) - this should also be readable
                    const block1 = await reader.read(1, 16);
                    data.blocks.push({
                        block: 1,
                        data: block1.toString('hex'),
                        length: block1.length,
                        textContent: null
                    });
                    console.log(`📊 Read block 1: ${block1.toString('hex')}`);

                    // For MIFARE Classic, try to read NDEF data from block 4 onwards
                    // First, try to read block 4 to see if it contains NDEF TLV
                    try {
                        const block4 = await reader.read(4, 16);
                        data.blocks.push({
                            block: 4,
                            data: block4.toString('hex'),
                            length: block4.length,
                            textContent: this.extractTextFromBlock(block4)
                        });
                        console.log(`📊 Read block 4: ${block4.toString('hex')}`);

                        // Check if block 4 starts with NDEF TLV (0x03)
                        if (block4[0] === 0x03) {
                            console.log('🔍 Detected NDEF TLV format in block 4');
                            const ndefLength = block4[1];
                            if (ndefLength > 0 && ndefLength <= 14) { // 14 bytes available after TLV header
                                const ndefData = block4.slice(2, 2 + ndefLength);
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
                                const blockData = await reader.read(block, 16);
                                data.blocks.push({
                                    block: block,
                                    data: blockData.toString('hex'),
                                    length: blockData.length,
                                    textContent: this.extractTextFromBlock(blockData)
                                });
                                console.log(`📊 Read block ${block}: ${blockData.toString('hex')}`);
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
                            const blockData = await reader.read(block, 16);
                            data.blocks.push({
                                block: block,
                                data: blockData.toString('hex'),
                                length: blockData.length,
                                textContent: this.extractTextFromBlock(blockData)
                            });
                            console.log(`📊 Read block ${block}: ${blockData.toString('hex')}`);
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
            // --- Use ndef npm library for NDEF parsing ---
            // If block 4 starts with 0x03, treat as TLV and extract NDEF
            if (allData[0] === 0x03) {
                // TLV format: 0x03, length, NDEF, 0xFE
                // Extract NDEF message from TLV
                const tlvLen = allData[1];
                const ndefMsg = allData.slice(2, 2 + tlvLen);
                const ndefText = NdefUtils.parseNdefMessage(ndefMsg);
                if (ndefText) {
                    cardData.extractedText = ndefText;
                    cardData.isAndroidCompatible = true;
                    return;
                }
            } else {
                // Try to parse as NDEF message directly
                const ndefText = NdefUtils.parseNdefMessage(allData);
                if (ndefText) {
                    cardData.extractedText = ndefText;
                    cardData.isAndroidCompatible = true;
                    return;
                }
            }
            // Fallback: try simple text extraction (legacy format)
            try {
                const simpleText = NdefUtils.parseSimpleTextRecord(allData);
                if (simpleText) {
                    cardData.extractedText = `Simple Text: "${simpleText}"`;
                    return;
                }
            } catch (simpleError) {}
            // Last resort: raw text extraction
            const rawText = allData.toString('utf8').replace(/[\x00-\x1F\x7F]/g, '').trim();
            if (rawText && rawText.length > 0) {
                cardData.extractedText = `Raw Text: "${rawText}"`;
            }
        } catch (error) {
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

            // --- Authenticate for MIFARE Classic before write ---
            if (this.currentCard.type && this.currentCard.type.includes('MIFARE Classic')) {
                // Authenticate with Key A (default key)
                const keyType = 0x60; // Key A
                const key = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
                try {
                    await reader.authenticate(4, keyType, key, this.currentCard.uid);
                    console.log('🔑 MIFARE Classic authenticated for block 4');
                } catch (authErr) {
                    throw new Error('Authentication failed for MIFARE Classic: ' + authErr.message);
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
            } catch (e) {}
            if (!isNdefFormatted) {
                writeBuffer = NdefUtils.wrapNdefInTlv(ndefMessage);
                console.log('📝 Tag not NDEF formatted, writing TLV structure');
            } else {
                writeBuffer = ndefMessage;
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
                    totalBytesWritten += (end - start);
                    blocks.push({
                        block: blockNumber,
                        hexData: blockData.toString('hex'),
                        originalData: writeBuffer.slice(start, end),
                        bytesWritten: end - start
                    });
                } catch (blockError) {
                    throw new Error(`Failed to write block ${blockNumber}: ${blockError.message}`);
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
        const reader = Array.from(this.readers.values()).find(r => r.card && r.card.uid === this.currentCard.uid);
        
        if (!reader) {
            throw new Error('Reader not found for current card');
        }
        
        // Read the card data
        const cardData = await this.readCardData(reader, this.currentCard);
        
        return {
            ...this.currentCard,
            ...cardData
        };
    }
}

module.exports = NFCPCSCManager;