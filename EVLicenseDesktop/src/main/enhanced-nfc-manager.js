const HID = require('node-hid');
const { EventEmitter } = require('events');

/**
 * Enhanced NFC Manager for ACR122U and compatible readers
 * Provides comprehensive NFC functionality with real device details
 */
class EnhancedNFCManager extends EventEmitter {
    constructor() {
        super();
        this.device = null;
        this.isConnected = false;
        this.isPolling = false;
        this.pollingInterval = null;
        this.lastCardUID = null;
        this.pollingIntervalMs = 1000;
        this.deviceInfo = null;
        this.firmwareVersion = null;
        this.supportedCards = [];
        
        // ACR122U and compatible device constants
        this.SUPPORTED_DEVICES = {
            0x072F: { // ACS vendor ID
                0x2200: { name: 'ACR122U', type: 'USB NFC Reader' },
                0x2202: { name: 'ACR1222L', type: 'USB NFC Reader with LCD' },
                0x2211: { name: 'ACR1251U', type: 'USB NFC Reader' },
                0x2212: { name: 'ACR1252U', type: 'USB NFC Reader with SAM' },
                0x2215: { name: 'ACR1255U-J1', type: 'USB NFC Reader' },
                0x2231: { name: 'ACR1281U-C1', type: 'USB DualBoost II' },
                0x2233: { name: 'ACR1283L', type: 'Standalone Contactless Reader' }
            }
        };
        
        // Enhanced APDU Commands with proper error handling
        this.commands = {
            // Reader Management
            GET_FIRMWARE: [0xFF, 0x00, 0x48, 0x00, 0x00],
            SET_TIMEOUT: [0xFF, 0x00, 0x41, 0x00, 0x00],
            GET_DATA: [0xFF, 0xCA, 0x00, 0x00, 0x00],
            DIRECT_TRANSMIT: [0xFF, 0x00, 0x00, 0x00],
            
            // Buzzer Control
            BUZZER_ON: [0xFF, 0x00, 0x52, 0x00, 0x00],
            BUZZER_OFF: [0xFF, 0x00, 0x52, 0x01, 0x00],
            
            // LED Control  
            LED_RED: [0xFF, 0x00, 0x40, 0x01, 0x04, 0x01, 0x00, 0x00, 0x00],
            LED_GREEN: [0xFF, 0x00, 0x40, 0x02, 0x04, 0x02, 0x00, 0x00, 0x00],
            LED_OFF: [0xFF, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00],
            
            // Card Detection
            PICC_REQUEST_TYPE_A: [0xFF, 0x00, 0x00, 0x00, 0x04, 0xD4, 0x4A, 0x01, 0x00],
            PICC_REQUEST_TYPE_B: [0xFF, 0x00, 0x00, 0x00, 0x04, 0xD4, 0x4A, 0x01, 0x03],
            PICC_ANTICOLL: [0xFF, 0x00, 0x00, 0x00, 0x04, 0xD4, 0x4A, 0x02, 0x00],
            PICC_SELECT: [0xFF, 0x00, 0x00, 0x00, 0x09, 0xD4, 0x4A, 0x04, 0x00],
            
            // Authentication
            LOAD_AUTH_KEYS: [0xFF, 0x82, 0x00, 0x00, 0x06],
            AUTH_KEY_A: [0xFF, 0x88, 0x00],
            AUTH_KEY_B: [0xFF, 0x88, 0x00],
            
            // Data Operations
            READ_BINARY: [0xFF, 0xB0, 0x00],
            UPDATE_BINARY: [0xFF, 0xD6, 0x00],
            GET_UID: [0xFF, 0xCA, 0x00, 0x00, 0x00]
        };

        // Default authentication keys
        this.DEFAULT_KEYS = {
            KEY_A: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
            KEY_B: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
            MAD_KEY: [0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5],
            NFC_FORUM_KEY: [0xD3, 0xF7, 0xD3, 0xF7, 0xD3, 0xF7]
        };

        // Card types
        this.CARD_TYPES = {
            0x0004: 'MIFARE Classic 1K',
            0x0002: 'MIFARE Classic 4K', 
            0x0044: 'MIFARE Ultralight',
            0x0042: 'MIFARE Ultralight C',
            0x0344: 'MIFARE DESFire',
            0x0008: 'MIFARE Classic 1K (7-byte UID)',
            0x0018: 'MIFARE Classic 4K (7-byte UID)'
        };
        
        console.log('🔧 Enhanced NFC Manager initialized');
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Enhanced NFC Manager...');
            
            const deviceFound = await this.findAndConnectDevice();
            if (deviceFound) {
                await this.getDeviceInfo();
                await this.initializeReader();
                this.startPolling();
                
                this.emit('device-connected', {
                    device: this.deviceInfo,
                    firmware: this.firmwareVersion,
                    status: 'connected',
                    timestamp: new Date().toISOString()
                });
                
                console.log('✅ Enhanced NFC Manager initialized successfully');
                return true;
            } else {
                console.log('⚠️ No compatible NFC devices found');
                this.emit('device-disconnected', { 
                    message: 'No compatible NFC devices found',
                    timestamp: new Date().toISOString()
                });
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced NFC Manager:', error);
            this.emit('error', { 
                message: 'Failed to initialize NFC Manager', 
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    async findAndConnectDevice() {
        try {
            const devices = HID.devices();
            let foundDevice = null;
            
            // Search for supported devices
            for (const device of devices) {
                if (this.SUPPORTED_DEVICES[device.vendorId] && 
                    this.SUPPORTED_DEVICES[device.vendorId][device.productId]) {
                    foundDevice = device;
                    break;
                }
            }
            
            if (!foundDevice) {
                console.log('⚠️ No supported NFC devices found');
                return false;
            }
            
            console.log(`📱 Found compatible device: ${foundDevice.product} (${foundDevice.serialNumber})`);
            
            // Connect to device
            this.device = new HID.HID(foundDevice.path);
            this.isConnected = true;
            
            // Store device information
            this.deviceInfo = {
                vendorId: foundDevice.vendorId,
                productId: foundDevice.productId,
                path: foundDevice.path,
                serialNumber: foundDevice.serialNumber,
                manufacturer: foundDevice.manufacturer,
                product: foundDevice.product,
                release: foundDevice.release,
                interface: foundDevice.interface,
                usage: foundDevice.usage,
                usagePage: foundDevice.usagePage,
                deviceType: this.SUPPORTED_DEVICES[foundDevice.vendorId][foundDevice.productId]
            };
            
            console.log('✅ Connected to NFC device successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to connect to NFC device:', error);
            this.isConnected = false;
            return false;
        }
    }

    async getDeviceInfo() {
        try {
            console.log('📋 Getting device firmware information...');
            
            const response = await this.sendCommand(this.commands.GET_FIRMWARE);
            if (response && response.length >= 4) {
                // Parse firmware version from response
                const major = response[response.length - 4];
                const minor = response[response.length - 3];
                const revision = response[response.length - 2];
                
                this.firmwareVersion = `${major}.${minor}.${revision}`;
                console.log(`📟 Firmware version: ${this.firmwareVersion}`);
                
                // Update device info with firmware
                this.deviceInfo.firmwareVersion = this.firmwareVersion;
                this.deviceInfo.capabilities = this.getDeviceCapabilities();
            }
            
        } catch (error) {
            console.warn('⚠️ Could not retrieve firmware information:', error.message);
            this.firmwareVersion = 'Unknown';
        }
    }

    getDeviceCapabilities() {
        const deviceType = this.deviceInfo.deviceType;
        
        const capabilities = {
            supportedProtocols: ['ISO14443-A', 'ISO14443-B', 'ISO15693'],
            maxDataRate: '424 kbps',
            workingDistance: '~5cm',
            supportedCards: ['MIFARE Classic', 'MIFARE Ultralight', 'NTAG', 'DESFire'],
            features: ['LED Control', 'Buzzer Control', 'Anti-collision', 'Multi-tag support']
        };

        // Add device-specific capabilities
        switch (deviceType.name) {
            case 'ACR122U':
                capabilities.features.push('USB 2.0', 'PC/SC compliance');
                break;
            case 'ACR1222L':
                capabilities.features.push('LCD Display', 'Keypad');
                break;
            case 'ACR1252U':
                capabilities.features.push('SAM slot', 'Secure operations');
                break;
        }
        
        return capabilities;
    }

    async initializeReader() {
        try {
            console.log('🔧 Initializing reader settings...');
            
            // Set timeout
            await this.sendCommand([...this.commands.SET_TIMEOUT, 0x0A]);
            
            // Turn off LED initially
            await this.sendCommand(this.commands.LED_OFF);
            
            // Brief buzzer to indicate ready
            await this.sendCommand(this.commands.BUZZER_ON);
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.sendCommand(this.commands.BUZZER_OFF);
            
            console.log('✅ Reader initialized successfully');
            
        } catch (error) {
            console.warn('⚠️ Reader initialization partial:', error.message);
        }
    }

    async sendCommand(command, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.device || !this.isConnected) {
                reject(new Error('No NFC device connected'));
                return;
            }
            
            const timer = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, timeout);
            
            try {
                // Send command
                this.device.write(command);
                
                // Wait for response
                this.device.read((error, data) => {
                    clearTimeout(timer);
                    
                    if (error) {
                        reject(error);
                    } else {
                        resolve(data);
                    }
                });
                
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    async startPolling() {
        if (this.isPolling) {
            console.log('📡 Polling already active');
            return;
        }
        
        this.isPolling = true;
        console.log('🔄 Starting enhanced card polling...');
        
        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForCards();
            } catch (error) {
                console.error('❌ Polling error:', error.message);
                this.emit('error', { 
                    message: 'Card polling error', 
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }, this.pollingIntervalMs);
        
        // Set LED to green to indicate polling
        try {
            await this.sendCommand(this.commands.LED_GREEN);
        } catch (error) {
            console.warn('⚠️ Could not set LED:', error.message);
        }
    }

    async pollForCards() {
        if (!this.isConnected) return;
        
        try {
            // Request Type A cards
            const response = await this.sendCommand(this.commands.PICC_REQUEST_TYPE_A, 2000);
            
            if (response && response.length > 10 && response[7] === 0xD5 && response[8] === 0x4B) {
                // Card detected
                const cardPresent = response[9] === 0x01;
                
                if (cardPresent) {
                    const cardData = await this.readCardDetails();
                    
                    if (cardData && cardData.uid && cardData.uid !== this.lastCardUID) {
                        this.lastCardUID = cardData.uid;
                        
                        // Card detection feedback
                        await this.cardDetectedFeedback();
                        
                        this.emit('card-detected', {
                            ...cardData,
                            timestamp: new Date().toISOString(),
                            readerInfo: this.deviceInfo
                        });
                        
                        console.log(`💳 Card detected: ${cardData.uid} (${cardData.type})`);
                    }
                } else if (this.lastCardUID) {
                    // Card removed
                    this.lastCardUID = null;
                    
                    await this.sendCommand(this.commands.LED_GREEN);
                    
                    this.emit('card-removed', {
                        timestamp: new Date().toISOString(),
                        readerInfo: this.deviceInfo
                    });
                    
                    console.log('📤 Card removed');
                }
            }
            
        } catch (error) {
            // Suppress timeout errors during normal polling
            if (!error.message.includes('timeout')) {
                throw error;
            }
        }
    }

    async readCardDetails() {
        try {
            // Get UID
            const uidResponse = await this.sendCommand(this.commands.GET_UID, 3000);
            
            if (!uidResponse || uidResponse.length < 8) {
                return null;
            }
            
            // Extract UID from response
            const uidLength = uidResponse[uidResponse.length - 1];
            const uidStart = uidResponse.length - 1 - uidLength;
            const uid = Array.from(uidResponse.slice(uidStart, uidStart + uidLength))
                           .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                           .join(':');
            
            // Get ATR for card type detection
            const atr = this.parseATR(uidResponse);
            const cardType = this.detectCardType(uidResponse, atr);
            
            // Try to read additional data
            const additionalData = await this.readAdditionalCardData();
            
            return {
                uid: uid,
                type: cardType.name,
                size: cardType.size,
                sectors: cardType.sectors,
                technology: cardType.technology,
                atr: atr,
                rawData: uidResponse,
                additionalData: additionalData,
                capabilities: cardType.capabilities
            };
            
        } catch (error) {
            console.warn('⚠️ Error reading card details:', error.message);
            return null;
        }
    }

    parseATR(response) {
        // Parse Answer To Reset from response
        if (response && response.length > 10) {
            return Array.from(response.slice(0, Math.min(20, response.length)))
                       .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                       .join(' ');
        }
        return 'Unknown';
    }

    detectCardType(response, atr) {
        // Default card type
        let cardType = {
            name: 'Unknown NFC Card',
            size: 'Unknown',
            sectors: 0,
            technology: 'ISO14443-A',
            capabilities: ['Read', 'Write']
        };
        
        if (response && response.length > 10) {
            const sak = response[response.length - 2]; // Select Acknowledge
            
            // Detect based on SAK value
            switch (sak) {
                case 0x08:
                    cardType = {
                        name: 'MIFARE Classic 1K',
                        size: '1KB',
                        sectors: 16,
                        technology: 'ISO14443-A',
                        capabilities: ['Read', 'Write', 'Authentication']
                    };
                    break;
                case 0x18:
                    cardType = {
                        name: 'MIFARE Classic 4K', 
                        size: '4KB',
                        sectors: 40,
                        technology: 'ISO14443-A',
                        capabilities: ['Read', 'Write', 'Authentication']
                    };
                    break;
                case 0x00:
                    cardType = {
                        name: 'MIFARE Ultralight',
                        size: '512 bits',
                        sectors: 4,
                        technology: 'ISO14443-A',
                        capabilities: ['Read', 'Write']
                    };
                    break;
                case 0x20:
                    cardType = {
                        name: 'MIFARE DESFire',
                        size: 'Variable',
                        sectors: 0,
                        technology: 'ISO14443-A',
                        capabilities: ['Read', 'Write', 'Authentication', 'Encryption']
                    };
                    break;
            }
        }
        
        return cardType;
    }

    async readAdditionalCardData() {
        try {
            // Try to read first sector/block
            const readCommand = [...this.commands.READ_BINARY, 0x00, 0x10];
            const response = await this.sendCommand(readCommand, 2000);
            
            if (response && response.length > 2) {
                // Check if read was successful (SW1 SW2 = 90 00)
                const sw1 = response[response.length - 2];
                const sw2 = response[response.length - 1];
                
                if (sw1 === 0x90 && sw2 === 0x00) {
                    const data = response.slice(0, response.length - 2);
                    return {
                        firstBlock: Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
                        dataLength: data.length,
                        hasData: data.some(b => b !== 0x00)
                    };
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Could not read additional card data:', error.message);
        }
        
        return {
            firstBlock: 'Not accessible',
            dataLength: 0,
            hasData: false
        };
    }

    async cardDetectedFeedback() {
        try {
            // LED to red to indicate card detected
            await this.sendCommand(this.commands.LED_RED);
            
            // Short beep
            await this.sendCommand(this.commands.BUZZER_ON);
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.sendCommand(this.commands.BUZZER_OFF);
            
        } catch (error) {
            console.warn('⚠️ Could not provide card detection feedback:', error.message);
        }
    }

    stopPolling() {
        if (!this.isPolling) return;
        
        this.isPolling = false;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Turn off LED
        try {
            this.sendCommand(this.commands.LED_OFF);
        } catch (error) {
            console.warn('⚠️ Could not turn off LED:', error.message);
        }
        
        console.log('⏹️ Enhanced NFC polling stopped');
    }

    async readCard() {
        if (!this.isConnected) {
            throw new Error('No NFC device connected');
        }
        
        console.log('📖 Reading NFC card...');
        
        try {
            // First ensure card is present
            const cardData = await this.readCardDetails();
            
            if (!cardData) {
                throw new Error('No card detected or card read failed');
            }
            
            // Try to read more comprehensive data
            const extendedData = await this.readExtendedCardData(cardData);
            
            return {
                ...cardData,
                ...extendedData,
                readTimestamp: new Date().toISOString(),
                readerInfo: this.deviceInfo
            };
            
        } catch (error) {
            console.error('❌ Error reading card:', error);
            throw error;
        }
    }

    async readExtendedCardData(cardData) {
        const extendedData = {
            sectors: [],
            totalDataRead: 0,
            readErrors: []
        };
        
        try {
            // For MIFARE Classic cards, try to read multiple sectors
            if (cardData.type.includes('MIFARE Classic')) {
                const sectorCount = cardData.type.includes('1K') ? 16 : 40;
                
                for (let sector = 0; sector < Math.min(sectorCount, 4); sector++) {
                    try {
                        const sectorData = await this.readSector(sector);
                        if (sectorData) {
                            extendedData.sectors.push({
                                sector: sector,
                                data: sectorData,
                                readable: true
                            });
                            extendedData.totalDataRead += sectorData.length;
                        }
                    } catch (error) {
                        extendedData.readErrors.push(`Sector ${sector}: ${error.message}`);
                        extendedData.sectors.push({
                            sector: sector,
                            data: null,
                            readable: false,
                            error: error.message
                        });
                    }
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Could not read extended card data:', error.message);
        }
        
        return extendedData;
    }

    async readSector(sectorNumber) {
        try {
            // Calculate block address (each sector has 4 blocks)
            const blockAddress = sectorNumber * 4;
            
            const readCommand = [...this.commands.READ_BINARY, blockAddress, 0x10];
            const response = await this.sendCommand(readCommand, 3000);
            
            if (response && response.length > 2) {
                const sw1 = response[response.length - 2];
                const sw2 = response[response.length - 1];
                
                if (sw1 === 0x90 && sw2 === 0x00) {
                    return response.slice(0, response.length - 2);
                }
            }
            
            return null;
            
        } catch (error) {
            throw new Error(`Failed to read sector ${sectorNumber}: ${error.message}`);
        }
    }

    async writeCard(data) {
        if (!this.isConnected) {
            throw new Error('No NFC device connected');
        }
        
        console.log('✍️ Writing to NFC card...');
        
        try {
            // Ensure card is present
            const cardData = await this.readCardDetails();
            
            if (!cardData) {
                throw new Error('No card detected');
            }
            
            // Prepare data for writing
            const writeData = this.prepareWriteData(data);
            
            // Write to card (block 1 for most cards)
            const writeCommand = [...this.commands.UPDATE_BINARY, 0x01, writeData.length, ...writeData];
            const response = await this.sendCommand(writeCommand, 5000);
            
            if (response && response.length >= 2) {
                const sw1 = response[response.length - 2];
                const sw2 = response[response.length - 1];
                
                if (sw1 === 0x90 && sw2 === 0x00) {
                    // Write successful feedback
                    await this.writeSuccessfulFeedback();
                    
                    return {
                        success: true,
                        bytesWritten: writeData.length,
                        cardInfo: cardData,
                        writeTimestamp: new Date().toISOString(),
                        readerInfo: this.deviceInfo
                    };
                } else {
                    throw new Error(`Write failed: SW1=${sw1.toString(16)}, SW2=${sw2.toString(16)}`);
                }
            } else {
                throw new Error('Invalid response from card');
            }
            
        } catch (error) {
            console.error('❌ Error writing to card:', error);
            throw error;
        }
    }

    prepareWriteData(data) {
        if (typeof data === 'string') {
            // Convert string to bytes
            return Array.from(Buffer.from(data, 'utf8')).slice(0, 16); // Max 16 bytes
        } else if (Array.isArray(data)) {
            return data.slice(0, 16);
        } else if (typeof data === 'object') {
            // Convert object to JSON string then to bytes
            const jsonString = JSON.stringify(data);
            return Array.from(Buffer.from(jsonString, 'utf8')).slice(0, 16);
        }
        
        throw new Error('Invalid data format for writing');
    }

    async writeSuccessfulFeedback() {
        try {
            // Green LED and double beep for successful write
            await this.sendCommand(this.commands.LED_GREEN);
            
            for (let i = 0; i < 2; i++) {
                await this.sendCommand(this.commands.BUZZER_ON);
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.sendCommand(this.commands.BUZZER_OFF);
                if (i < 1) await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.warn('⚠️ Could not provide write feedback:', error.message);
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            polling: this.isPolling,
            deviceInfo: this.deviceInfo,
            firmwareVersion: this.firmwareVersion,
            lastCardUID: this.lastCardUID,
            capabilities: this.deviceInfo ? this.deviceInfo.capabilities : null,
            timestamp: new Date().toISOString()
        };
    }

    async refreshDevices() {
        console.log('🔄 Refreshing NFC devices...');
        
        if (this.isConnected) {
            await this.disconnect();
        }
        
        // Wait a moment for device to be released
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return await this.initialize();
    }

    async disconnect() {
        console.log('🔌 Disconnecting Enhanced NFC Manager...');
        
        try {
            this.stopPolling();
            
            if (this.device && this.isConnected) {
                // Turn off LED and buzzer
                try {
                    await this.sendCommand(this.commands.LED_OFF);
                    await this.sendCommand(this.commands.BUZZER_OFF);
                } catch (error) {
                    console.warn('⚠️ Could not turn off LED/buzzer during disconnect:', error.message);
                }
                
                this.device.close();
                this.device = null;
            }
            
            this.isConnected = false;
            this.deviceInfo = null;
            this.firmwareVersion = null;
            this.lastCardUID = null;
            
            this.emit('device-disconnected', {
                message: 'NFC device disconnected',
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Enhanced NFC Manager disconnected successfully');
            
        } catch (error) {
            console.error('❌ Error disconnecting Enhanced NFC Manager:', error);
            throw error;
        }
    }

    cleanup() {
        return this.disconnect();
    }
}

module.exports = EnhancedNFCManager;