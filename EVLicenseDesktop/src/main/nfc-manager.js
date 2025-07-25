const HID = require('node-hid');
const { EventEmitter } = require('events');

class NFCManager extends EventEmitter {
    constructor() {
        super();
        this.device = null;
        this.isConnected = false;
        this.isPolling = false;
        this.pollingInterval = null;
        this.lastCardUID = null;
        this.pollingIntervalMs = 1000;
        
        // ACR122U specific constants
        this.ACR122U_VID = 0x072F;
        this.ACR122U_PID = 0x2200;
        
        // APDU Commands
        this.commands = {
            GET_FIRMWARE: [0xFF, 0x00, 0x48, 0x00, 0x00],
            DIRECT_TRANSMIT: [0xFF, 0x00, 0x00, 0x00],
            LOAD_AUTH_KEYS: [0xFF, 0x82, 0x00, 0x00, 0x06],
            
            // PICC Commands
            PICC_REQUEST_A: [0xFF, 0x00, 0x00, 0x00, 0x04, 0xD4, 0x4A, 0x01, 0x00],
            PICC_ANTICOLL: [0xFF, 0x00, 0x00, 0x00, 0x04, 0xD4, 0x4A, 0x02, 0x00],
            PICC_SELECT: [0xFF, 0x00, 0x00, 0x00, 0x09, 0xD4, 0x4A, 0x04, 0x00],
            
            // Card Operations
            READ_BINARY: [0xFF, 0xB0, 0x00],
            UPDATE_BINARY: [0xFF, 0xD6, 0x00],
            
            // Authentication
            AUTH_KEY_A: [0xFF, 0x88, 0x00],
            AUTH_KEY_B: [0xFF, 0x88, 0x00]
        };
        
        console.log('🔧 NFC Manager initialized');
    }

    async initialize() {
        try {
            console.log('🚀 Initializing NFC Manager...');
            
            // Search for ACR122U device
            const devices = HID.devices();
            const acr122u = devices.find(device => 
                device.vendorId === this.ACR122U_VID && 
                device.productId === this.ACR122U_PID
            );

            if (!acr122u) {
                console.log('⚠️ ACR122U device not found');
                this.emit('device-not-found');
                return false;
            }

            console.log('✅ ACR122U device found:', acr122u.path);
            
            // Connect to device
            try {
                this.device = new HID.HID(acr122u.path);
                this.isConnected = true;
                
                console.log('✅ Connected to ACR122U');
                this.emit('device-connected', acr122u);
                
                // Get firmware version
                const firmwareVersion = await this.getFirmwareVersion();
                console.log('📋 Firmware version:', firmwareVersion);
                
                // Start polling for cards
                this.startPolling();
                
                return true;
                
            } catch (error) {
                console.error('❌ Failed to connect to ACR122U:', error);
                this.emit('connection-error', error);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error initializing NFC Manager:', error);
            this.emit('initialization-error', error);
            return false;
        }
    }

    async getFirmwareVersion() {
        try {
            const response = await this.sendCommand(this.commands.GET_FIRMWARE);
            if (response && response.length >= 4) {
                // Parse firmware version from response
                const versionBytes = response.slice(2, response.length - 2);
                return versionBytes.map(b => String.fromCharCode(b)).join('');
            }
            return 'Unknown';
        } catch (error) {
            console.error('❌ Error getting firmware version:', error);
            return 'Error';
        }
    }

    sendCommand(command, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.device) {
                reject(new Error('Device not connected'));
                return;
            }

            try {
                // Send command
                this.device.write(command);
                
                // Setup timeout
                const timeoutId = setTimeout(() => {
                    reject(new Error('Command timeout'));
                }, timeout);

                // Setup response handler
                const handleResponse = (data) => {
                    clearTimeout(timeoutId);
                    this.device.removeListener('data', handleResponse);
                    resolve(Array.from(data));
                };

                this.device.on('data', handleResponse);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    startPolling() {
        if (this.isPolling) {
            this.stopPolling();
        }

        console.log('🔄 Starting NFC card polling...');
        this.isPolling = true;
        
        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForCard();
            } catch (error) {
                console.error('❌ Error during polling:', error);
                this.emit('polling-error', error);
            }
        }, this.pollingIntervalMs);

        this.emit('polling-started');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        this.isPolling = false;
        this.lastCardUID = null;
        
        console.log('⏹️ NFC card polling stopped');
        this.emit('polling-stopped');
    }

    async pollForCard() {
        try {
            // Send PICC Request Type A command
            const response = await this.sendCommand(this.commands.PICC_REQUEST_A);
            
            if (this.isValidCardResponse(response)) {
                const uid = await this.getCardUID();
                
                if (uid && uid !== this.lastCardUID) {
                    this.lastCardUID = uid;
                    console.log('🎯 Card detected:', uid);
                    
                    const cardInfo = await this.getCardInfo(uid);
                    this.emit('card-detected', cardInfo);
                }
            } else {
                // No card detected, reset last UID if it was set
                if (this.lastCardUID) {
                    console.log('📤 Card removed');
                    this.emit('card-removed');
                    this.lastCardUID = null;
                }
            }
            
        } catch (error) {
            // Silent fail for polling - cards may not always be present
            if (this.lastCardUID) {
                this.emit('card-removed');
                this.lastCardUID = null;
            }
        }
    }

    isValidCardResponse(response) {
        // Check if response indicates card presence
        return response && response.length >= 6 && response[0] === 0xD5;
    }

    async getCardUID() {
        try {
            const response = await this.sendCommand(this.commands.PICC_ANTICOLL);
            
            if (response && response.length >= 10) {
                // Extract UID from response
                const uidStart = 6; // Adjust based on actual response format
                const uidLength = 4; // Typical UID length for MIFARE Classic
                
                const uidBytes = response.slice(uidStart, uidStart + uidLength);
                return uidBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting card UID:', error);
            return null;
        }
    }

    async getCardInfo(uid) {
        try {
            const cardInfo = {
                uid: uid,
                type: 'Unknown',
                size: 'Unknown',
                detected_at: new Date().toISOString(),
                readable: false,
                writable: false
            };

            // Try to determine card type
            try {
                // Attempt to read card information
                const response = await this.sendCommand([
                    ...this.commands.DIRECT_TRANSMIT,
                    0x04, 0xD4, 0x4A, 0x01, 0x00
                ]);
                
                if (response && response.length >= 3) {
                    // Parse ATQA to determine card type
                    const atqa = response.slice(1, 3);
                    cardInfo.type = this.determineCardType(atqa);
                    cardInfo.readable = true;
                }
                
            } catch (error) {
                console.log('⚠️ Could not determine card type');
            }

            return cardInfo;
            
        } catch (error) {
            console.error('❌ Error getting card info:', error);
            return {
                uid: uid,
                type: 'Error',
                detected_at: new Date().toISOString(),
                readable: false,
                writable: false
            };
        }
    }

    determineCardType(atqa) {
        const atqaHex = atqa.map(b => b.toString(16).padStart(2, '0')).join('');
        
        switch (atqaHex.toUpperCase()) {
            case '0004':
                return 'MIFARE Classic 1K';
            case '0002':
                return 'MIFARE Classic 4K';
            case '0044':
                return 'MIFARE Ultralight';
            case '0344':
                return 'MIFARE DESFire';
            case '0004':
                return 'NTAG213/215/216';
            default:
                return `Unknown (ATQA: ${atqaHex})`;
        }
    }

    async readCard(uid) {
        try {
            console.log(`📖 Reading card: ${uid}`);
            
            // For now, implement basic read operation
            const readData = {
                uid: uid,
                timestamp: new Date().toISOString(),
                data: null,
                success: false
            };

            // Attempt to read first few blocks
            try {
                // This is a simplified read operation
                // In practice, you'd need proper authentication for MIFARE cards
                const response = await this.sendCommand([
                    ...this.commands.READ_BINARY,
                    0x00, 0x10 // Read 16 bytes from block 0
                ]);
                
                if (response && response.length > 2) {
                    readData.data = response.slice(0, -2); // Remove status bytes
                    readData.success = true;
                    console.log('✅ Card read successful');
                }
                
            } catch (error) {
                console.log('⚠️ Card read failed:', error.message);
            }

            this.emit('card-read', readData);
            return readData;
            
        } catch (error) {
            console.error('❌ Error reading card:', error);
            this.emit('card-read-error', error);
            throw error;
        }
    }

    async writeCard(uid, data) {
        try {
            console.log(`✍️ Writing to card: ${uid}`);
            
            // Basic write operation (simplified)
            const writeResult = {
                uid: uid,
                timestamp: new Date().toISOString(),
                success: false,
                bytesWritten: 0
            };

            // This is a placeholder for write operations
            // Actual implementation would require proper authentication
            // and block-by-block writing for MIFARE cards
            
            console.log('⚠️ Card writing not fully implemented yet');
            this.emit('card-write', writeResult);
            return writeResult;
            
        } catch (error) {
            console.error('❌ Error writing card:', error);
            this.emit('card-write-error', error);
            throw error;
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            isPolling: this.isPolling,
            deviceInfo: this.device ? {
                vendorId: this.ACR122U_VID,
                productId: this.ACR122U_PID
            } : null,
            lastCardUID: this.lastCardUID,
            pollingInterval: this.pollingIntervalMs
        };
    }

    setPollingInterval(intervalMs) {
        if (intervalMs >= 100 && intervalMs <= 10000) {
            this.pollingIntervalMs = intervalMs;
            
            if (this.isPolling) {
                this.stopPolling();
                this.startPolling();
            }
            
            console.log(`⏱️ Polling interval set to ${intervalMs}ms`);
            return true;
        }
        
        return false;
    }

    disconnect() {
        try {
            console.log('🔌 Disconnecting NFC Manager...');
            
            this.stopPolling();
            
            if (this.device) {
                this.device.close();
                this.device = null;
            }
            
            this.isConnected = false;
            this.lastCardUID = null;
            
            console.log('✅ NFC Manager disconnected');
            this.emit('device-disconnected');
            
        } catch (error) {
            console.error('❌ Error disconnecting NFC Manager:', error);
            this.emit('disconnect-error', error);
        }
    }
}

module.exports = NFCManager;