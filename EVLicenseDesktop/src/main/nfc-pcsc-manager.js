const { NFC } = require('nfc-pcsc');
const { EventEmitter } = require('events');

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
                blocks: []
            };

            // Try to read blocks including data blocks (0-15 for typical MIFARE cards)
            try {
                // Read blocks 0-15 to capture both header and data blocks
                for (let block = 0; block < 16; block++) {
                    try {
                        const blockData = await reader.read(block, 16);
                        data.blocks.push({
                            block: block,
                            data: blockData.toString('hex'),
                            length: blockData.length,
                            // Try to extract readable text for data blocks (4+)
                            textContent: block >= 4 ? this.extractTextFromBlock(blockData) : null
                        });
                        console.log(`📊 Read block ${block}: ${blockData.toString('hex')}`);
                    } catch (blockError) {
                        // Some blocks may not be readable (especially sector trailers)
                        console.warn(`⚠️ Could not read block ${block}:`, blockError.message);
                        
                        // For MIFARE Classic, skip sector trailer blocks (3, 7, 11, 15)
                        // but continue reading other blocks
                        if (block % 4 === 3) {
                            console.log(`ℹ️ Skipping sector trailer block ${block}`);
                            continue;
                        }
                        
                        // If we can't read multiple consecutive blocks, stop
                        if (block > 3) {
                            console.log(`ℹ️ Stopping read at block ${block} due to access restrictions`);
                            break;
                        }
                    }
                }
            } catch (readError) {
                console.warn('⚠️ Block reading not supported:', readError.message);
            }

            return data;
        } catch (error) {
            console.error('❌ Error reading card data:', error);
            throw error;
        }
    }

    extractTextFromBlock(blockData) {
        try {
            if (!blockData || blockData.length === 0) return null;
            
            // Convert to string and remove null bytes
            const text = blockData.toString('utf8').replace(/\0/g, '').trim();
            
            // Only return if there's meaningful text content (printable ASCII)
            if (text && text.length > 0 && /^[\x20-\x7E]+$/.test(text)) {
                return text;
            }
            
            return null;
        } catch (error) {
            return null;
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
            
            console.log('📝 Writing data to card:', data);
            
            // Convert data to buffer if needed
            let buffer;
            if (typeof data === 'string') {
                buffer = Buffer.from(data, 'utf8');
            } else if (Array.isArray(data)) {
                buffer = Buffer.from(data);
            } else if (typeof data === 'object') {
                buffer = Buffer.from(JSON.stringify(data), 'utf8');
            } else {
                buffer = data;
            }

            console.log(`📊 Data length: ${buffer.length} bytes`);

            // Split data into 16-byte blocks and write across multiple blocks
            const maxBlockSize = 16;
            const blocks = [];
            let totalBytesWritten = 0;
            
            // Calculate how many blocks we need
            const totalBlocks = Math.ceil(buffer.length / maxBlockSize);
            console.log(`📦 Will write ${totalBlocks} blocks starting from block 4`);

            // Write data across multiple blocks starting from block 4
            for (let i = 0; i < totalBlocks; i++) {
                const blockNumber = 4 + i; // Start from block 4
                const start = i * maxBlockSize;
                const end = Math.min(start + maxBlockSize, buffer.length);
                
                let blockData = buffer.slice(start, end);
                
                // Pad block to 16 bytes with zeros
                if (blockData.length < maxBlockSize) {
                    const padding = Buffer.alloc(maxBlockSize - blockData.length, 0);
                    blockData = Buffer.concat([blockData, padding]);
                }

                try {
                    await reader.write(blockNumber, blockData);
                    totalBytesWritten += (end - start);
                    blocks.push({
                        block: blockNumber,
                        hexData: blockData.toString('hex'),
                        originalData: buffer.slice(start, end).toString('utf8'),
                        bytesWritten: end - start
                    });
                    console.log(`✅ Block ${blockNumber} written successfully (${end - start} bytes)`);
                } catch (blockError) {
                    console.error(`❌ Error writing block ${blockNumber}:`, blockError);
                    throw new Error(`Failed to write block ${blockNumber}: ${blockError.message}`);
                }
            }

            console.log(`✅ Writing completed. Total: ${totalBytesWritten} bytes across ${blocks.length} blocks`);
            
            // Emit write success event
            this.emit('card-written', {
                uid: this.currentCard.uid,
                originalData: data,
                buffer: buffer.toString('hex'),
                blocks: blocks,
                totalBytesWritten: totalBytesWritten,
                timestamp: new Date()
            });

            return {
                success: true,
                message: `Successfully wrote ${totalBytesWritten} bytes to ${blocks.length} blocks`,
                originalData: data,
                blocks: blocks,
                totalBytesWritten: totalBytesWritten,
                startBlock: 4,
                endBlock: 4 + blocks.length - 1
            };

        } catch (error) {
            console.error('❌ Error writing to card:', error);
            this.emit('card-write-error', {
                error: error.message,
                uid: this.currentCard ? this.currentCard.uid : null,
                timestamp: new Date()
            });
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
        
        return this.currentCard;
    }
}

module.exports = NFCPCSCManager;