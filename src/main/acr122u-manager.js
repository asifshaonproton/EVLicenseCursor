const EventEmitter = require('events');
const HID = require('node-hid');

class Acr122uManager extends EventEmitter {
    constructor() {
        super();
        this.devices = [];
        this.activeDevice = null;
        this.isPolling = false;
        this.pollingInterval = null;
        
        // ACR122U specific constants
        this.VENDOR_ID = 0x072F;  // ACS vendor ID
        this.PRODUCT_IDS = [
            0x2200, // ACR122U
            0x2202, // ACR1222L
            0x2211, // ACR1251U
            0x2212, // ACR1252U
            0x2215, // ACR1255U-J1
            0x2231, // ACR1281U-C1
            0x2233  // ACR1283L
        ];
        
        // APDU commands
        this.COMMANDS = {
            GET_FIRMWARE: [0xFF, 0x00, 0x48, 0x00, 0x00],
            LOAD_AUTH_KEYS: [0xFF, 0x82, 0x00, 0x00, 0x06],
            GET_UID: [0xFF, 0xCA, 0x00, 0x00, 0x00],
            READ_BINARY: [0xFF, 0xB0, 0x00, 0x00, 0x10],
            UPDATE_BINARY: [0xFF, 0xD6, 0x00, 0x00, 0x10],
            PICC_REQUEST_TYPE_A: [0xFF, 0x00, 0x00, 0x00, 0x04, 0xD4, 0x4A, 0x01, 0x00]
        };
    }

    async initialize() {
        try {
            console.log('🔍 Initializing ACR122U Manager...');
            await this.scanDevices();
            this.startPolling();
            console.log('✅ ACR122U Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize ACR122U Manager:', error);
            this.emit('error', { message: 'Failed to initialize ACR122U Manager', error: error.message });
            return false;
        }
    }

    async scanDevices() {
        try {
            const hidDevices = HID.devices();
            this.devices = [];

            for (const device of hidDevices) {
                if (device.vendorId === this.VENDOR_ID && this.PRODUCT_IDS.includes(device.productId)) {
                    const deviceInfo = {
                        path: device.path,
                        vendorId: device.vendorId,
                        productId: device.productId,
                        manufacturer: device.manufacturer || 'ACS',
                        product: device.product || this.getProductName(device.productId),
                        serialNumber: device.serialNumber || 'Unknown',
                        interface: device.interface,
                        connected: false,
                        handle: null
                    };
                    
                    this.devices.push(deviceInfo);
                    console.log(`📱 Found ACR122U device: ${deviceInfo.product} (${deviceInfo.serialNumber})`);
                }
            }

            if (this.devices.length > 0) {
                await this.connectToDevice(this.devices[0]);
            } else {
                console.log('⚠️ No ACR122U devices found');
                this.emit('deviceDisconnected', { message: 'No ACR122U devices found' });
            }

            return this.devices;
        } catch (error) {
            console.error('❌ Error scanning devices:', error);
            throw error;
        }
    }

    async connectToDevice(deviceInfo) {
        try {
            if (this.activeDevice && this.activeDevice.handle) {
                this.activeDevice.handle.close();
            }

            console.log(`🔌 Connecting to device: ${deviceInfo.product}`);
            
            const device = new HID.HID(deviceInfo.path);
            deviceInfo.handle = device;
            deviceInfo.connected = true;
            this.activeDevice = deviceInfo;

            // Test connection with firmware version command
            const firmware = await this.getFirmwareVersion();
            if (firmware) {
                console.log(`✅ Connected to ${deviceInfo.product}, Firmware: ${firmware}`);
                this.emit('deviceConnected', {
                    device: deviceInfo,
                    firmware: firmware
                });
                return true;
            } else {
                throw new Error('Failed to communicate with device');
            }
        } catch (error) {
            console.error(`❌ Failed to connect to device:`, error);
            deviceInfo.connected = false;
            deviceInfo.handle = null;
            this.emit('error', { message: 'Failed to connect to ACR122U device', error: error.message });
            return false;
        }
    }

    async sendCommand(command) {
        if (!this.activeDevice || !this.activeDevice.handle) {
            throw new Error('No active ACR122U device');
        }

        try {
            // Prepare command with proper framing
            const frame = this.frameCommand(command);
            
            // Send command
            this.activeDevice.handle.write(frame);
            
            // Read response with timeout
            return new Promise((resolve, reject) => {
                let timeout = setTimeout(() => {
                    reject(new Error('Command timeout'));
                }, 5000);

                this.activeDevice.handle.read((error, data) => {
                    clearTimeout(timeout);
                    if (error) {
                        reject(error);
                    } else {
                        resolve(this.parseResponse(data));
                    }
                });
            });
        } catch (error) {
            console.error('❌ Error sending command:', error);
            throw error;
        }
    }

    frameCommand(command) {
        // Add proper framing for ACR122U CCID protocol
        const length = command.length;
        const frame = Buffer.alloc(10 + length);
        
        // CCID header
        frame[0] = 0x6F; // PC_to_RDR_XfrBlock
        frame[1] = length & 0xFF;
        frame[2] = (length >> 8) & 0xFF;
        frame[3] = (length >> 16) & 0xFF;
        frame[4] = (length >> 24) & 0xFF;
        frame[5] = 0x00; // Slot
        frame[6] = 0x01; // Sequence
        frame[7] = 0x00; // BWI
        frame[8] = 0x00; // Level parameter
        frame[9] = 0x00; // RFU
        
        // Copy command data
        Buffer.from(command).copy(frame, 10);
        
        return frame;
    }

    parseResponse(data) {
        if (!data || data.length < 10) {
            throw new Error('Invalid response format');
        }

        // Extract response data (skip CCID header)
        const responseLength = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
        const responseData = data.slice(10, 10 + responseLength);
        
        return Array.from(responseData);
    }

    async getFirmwareVersion() {
        try {
            const response = await this.sendCommand(this.COMMANDS.GET_FIRMWARE);
            if (response && response.length >= 4) {
                // Parse firmware version from response
                const version = response.slice(2, -2).map(b => String.fromCharCode(b)).join('');
                return version;
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting firmware version:', error);
            return null;
        }
    }

    async detectCard() {
        try {
            const response = await this.sendCommand(this.COMMANDS.PICC_REQUEST_TYPE_A);
            
            if (response && response.length > 6) {
                const uid = this.extractUID(response);
                if (uid) {
                    return {
                        uid: uid,
                        type: this.determineCardType(response),
                        timestamp: new Date().toISOString(),
                        raw: response
                    };
                }
            }
            return null;
        } catch (error) {
            // Card detection errors are common when no card is present
            return null;
        }
    }

    extractUID(response) {
        try {
            // Look for UID in response based on card type
            if (response.length >= 10) {
                // Extract UID bytes (typically after status bytes)
                const uidStart = 6;
                const uidLength = Math.min(7, response.length - uidStart - 2);
                
                if (uidLength > 0) {
                    const uidBytes = response.slice(uidStart, uidStart + uidLength);
                    return uidBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Error extracting UID:', error);
            return null;
        }
    }

    determineCardType(response) {
        // Simple card type detection based on response
        if (response && response.length > 8) {
            const atqa = response.slice(6, 8);
            if (atqa[0] === 0x04 && atqa[1] === 0x00) {
                return 'MIFARE Ultralight';
            } else if (atqa[0] === 0x02 && atqa[1] === 0x00) {
                return 'MIFARE Classic 1K';
            } else if (atqa[0] === 0x04 && atqa[1] === 0x00) {
                return 'MIFARE Classic 4K';
            }
        }
        return 'Unknown';
    }

    async readCard() {
        try {
            const cardInfo = await this.detectCard();
            if (!cardInfo) {
                throw new Error('No card detected');
            }

            // Try to read data from card
            const data = await this.sendCommand([
                ...this.COMMANDS.READ_BINARY,
                0x10 // Read 16 bytes
            ]);

            return {
                ...cardInfo,
                data: data,
                dataHex: data.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
            };
        } catch (error) {
            console.error('❌ Error reading card:', error);
            throw error;
        }
    }

    async writeCard(data) {
        try {
            const cardInfo = await this.detectCard();
            if (!cardInfo) {
                throw new Error('No card detected');
            }

            // Prepare write command
            const writeData = typeof data === 'string' ? 
                Array.from(Buffer.from(data, 'utf8')) : 
                Array.isArray(data) ? data : [data];

            // Pad to 16 bytes
            while (writeData.length < 16) {
                writeData.push(0x00);
            }

            const writeCommand = [
                ...this.COMMANDS.UPDATE_BINARY,
                ...writeData.slice(0, 16)
            ];

            const response = await this.sendCommand(writeCommand);
            
            if (response && response[response.length - 2] === 0x90 && response[response.length - 1] === 0x00) {
                return { success: true, cardInfo, written: writeData };
            } else {
                throw new Error('Write operation failed');
            }
        } catch (error) {
            console.error('❌ Error writing card:', error);
            throw error;
        }
    }

    startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.pollingInterval = setInterval(async () => {
            try {
                if (this.activeDevice && this.activeDevice.connected) {
                    const cardInfo = await this.detectCard();
                    if (cardInfo) {
                        this.emit('cardDetected', cardInfo);
                    }
                }
            } catch (error) {
                // Polling errors are common and shouldn't be logged as errors
            }
        }, 1000); // Poll every second

        console.log('🔄 Started NFC card polling');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('⏸️ Stopped NFC card polling');
    }

    async refreshDevices() {
        console.log('🔄 Refreshing ACR122U devices...');
        this.stopPolling();
        await this.scanDevices();
        this.startPolling();
    }

    getStatus() {
        return {
            devicesFound: this.devices.length,
            activeDevice: this.activeDevice ? {
                product: this.activeDevice.product,
                serialNumber: this.activeDevice.serialNumber,
                connected: this.activeDevice.connected
            } : null,
            isPolling: this.isPolling
        };
    }

    getProductName(productId) {
        const names = {
            0x2200: 'ACR122U',
            0x2202: 'ACR1222L',
            0x2211: 'ACR1251U',
            0x2212: 'ACR1252U',
            0x2215: 'ACR1255U-J1',
            0x2231: 'ACR1281U-C1',
            0x2233: 'ACR1283L'
        };
        return names[productId] || `Unknown ACR Device (0x${productId.toString(16).toUpperCase()})`;
    }

    cleanup() {
        try {
            this.stopPolling();
            
            if (this.activeDevice && this.activeDevice.handle) {
                this.activeDevice.handle.close();
                this.activeDevice.connected = false;
                this.activeDevice.handle = null;
            }
            
            this.activeDevice = null;
            this.devices = [];
            
            console.log('✅ ACR122U Manager cleanup completed');
        } catch (error) {
            console.error('❌ Error during ACR122U Manager cleanup:', error);
        }
    }
}

module.exports = Acr122uManager;