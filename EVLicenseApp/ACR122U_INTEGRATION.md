# ACR122U NFC Reader Integration

This document explains the ACR122U NFC Reader integration added to the EVLicenseApp project.

## Overview

The app now supports both built-in NFC and external ACR122U NFC readers, allowing users with devices that don't have built-in NFC to use the app with an external reader.

## Supported Devices

### Built-in NFC
- Works with any Android device that has built-in NFC capability
- Requires NFC to be enabled in device settings

### External NFC Readers
- **ACR122U** - Primary focus of this integration
- **ACR1222L** - Should work with minor modifications
- **ACR1251U** - Should work with minor modifications
- **ACR1252U** - Should work with minor modifications
- **ACR1255U-J1** - Should work with minor modifications
- **ACR1281U-C1** - Should work with minor modifications
- **ACR1283L** - Should work with minor modifications

## Hardware Requirements

### For ACR122U Support
- Android device with USB OTG (On-The-Go) support
- USB OTG cable or adapter
- ACR122U NFC Reader device
- Adequate power supply (some devices may need external power)

## Features

### Dual NFC Support
- **Simultaneous Operation**: Both built-in and external NFC can work at the same time
- **Automatic Detection**: The app automatically detects when an ACR122U is connected
- **Status Monitoring**: Real-time status display on the dashboard showing both NFC states
- **Seamless Integration**: Same license management features work with both NFC types

### ACR122U Specific Features
- **USB Permission Handling**: Automatic request for USB device permissions
- **Device Detection**: Automatic detection when ACR122U is plugged in
- **Card Polling**: Continuous polling for NFC cards when connected
- **UID Reading**: Extracts unique card identifiers
- **Error Handling**: Comprehensive error reporting and handling

## App Changes

### New Files
- `Acr122uReader.kt` - Core ACR122U communication class
- `NfcManager.kt` - Unified NFC management for both built-in and external
- `device_filter.xml` - USB device filter for supported readers

### Modified Files
- `MainActivity.kt` - Updated to use new NFC manager
- `DashboardFragment.kt` - Added NFC status display
- `AndroidManifest.xml` - Added USB permissions and device filters
- `build.gradle` - Added USB support dependencies
- `fragment_dashboard.xml` - Added NFC status card

### Permission Changes
- Added `USB_PERMISSION` for communicating with USB devices
- Changed NFC feature from required to optional
- Added USB host feature support

## Usage Instructions

### Setup for Devices Without Built-in NFC
1. Connect ACR122U to Android device via USB OTG cable
2. Launch the EVLicenseApp
3. Grant USB permission when prompted
4. Verify connection on dashboard (should show "External NFC: Connected")
5. Use the app normally - NFC card scanning will work with the external reader

### Setup for Devices With Built-in NFC
1. Enable NFC in Android settings
2. Launch the EVLicenseApp
3. Use the app normally with built-in NFC
4. Optionally connect ACR122U for dual NFC support

### Dashboard Status Display
The dashboard now shows:
- **Built-in NFC: Enabled/Disabled/Not Available**
- **External NFC: Connected/Not Connected**

## Technical Details

### Communication Protocol
- Uses USB HID (Human Interface Device) protocol
- Sends APDU (Application Protocol Data Unit) commands
- Supports ISO14443 Type A and B cards
- Handles MIFARE Classic, MIFARE Ultralight, and NTAG cards

### Key Classes
- **Acr122uReader**: Low-level USB communication with ACR122U
- **NfcManager**: High-level abstraction for both NFC types
- **NfcManager.NfcCallback**: Interface for NFC events

### USB Communication
- Uses Android USB Host API
- Bulk transfer for command/response communication
- 5-second timeout for operations
- Automatic retry and error handling

## Troubleshooting

### ACR122U Not Detected
1. Check USB OTG cable and connections
2. Verify device supports USB host mode
3. Check power supply (may need external power)
4. Try different USB port or cable
5. Check device permissions

### Permission Issues
1. Grant USB permission when prompted
2. If permission dialog doesn't appear, try reconnecting device
3. Check if another app is using the ACR122U

### Communication Errors
1. Disconnect and reconnect the ACR122U
2. Restart the app
3. Check USB cable and connections
4. Verify ACR122U LED status (should be steady blue when ready)

### Power Issues
- ACR122U requires adequate power supply
- Some tablets/phones may not provide enough power
- Try using powered USB hub or external power adapter
- Connection order may matter: device → reader → power

## Supported Card Types

### Both Built-in and ACR122U NFC
- MIFARE Classic (1K, 4K)
- MIFARE Ultralight
- MIFARE DESFire
- NTAG213/215/216
- ISO14443 Type A cards
- ISO14443 Type B cards

## Development Notes

### Adding Support for Other ACR Readers
1. Add vendor/product IDs to `device_filter.xml`
2. Update `NfcManager.ACR_PRODUCT_IDS` set
3. Test USB communication protocols
4. May need to adjust command formats in `Acr122uReader.kt`

### Extending Functionality
- NDEF reading/writing can be added to `Acr122uReader.kt`
- Additional card types can be supported
- Bluetooth ACR readers could be added with similar pattern

## License Data Storage

The NFC card integration remains the same:
- Card UID is stored in the `nfcCardNumber` field
- NDEF data can contain encrypted license information
- Both built-in and external NFC use the same data format
- License details are displayed in the same NFC detail screen

## Testing

### Test Scenarios
1. **Built-in NFC only**: Normal operation with phone's NFC
2. **ACR122U only**: Phone without NFC + ACR122U reader
3. **Dual NFC**: Phone with NFC + ACR122U (both working simultaneously)
4. **Hot-plug**: Connecting/disconnecting ACR122U while app is running
5. **Permission handling**: Granting/denying USB permissions
6. **Power scenarios**: Different power supply configurations

### Test Cards
- Use various card types (MIFARE, NTAG, etc.)
- Test with cards containing NDEF data
- Test with blank cards
- Test card writing functionality

## Future Improvements

- Support for additional ACR reader models
- Bluetooth ACR reader support
- Enhanced NDEF reading/writing
- Card type detection and optimization
- Reader configuration options (LED, beeper, etc.)
- Background scanning capabilities
- Multiple reader support