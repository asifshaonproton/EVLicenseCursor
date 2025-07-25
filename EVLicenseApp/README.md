# EVLicenseApp

Android app for Electric Vehicle License Management with NFC/RFID integration.

## Features
- Local authentication (email/password)
- Dashboard with license stats and quick actions
- License CRUD (add/edit/delete/search)
- **Dual NFC Support**: Built-in NFC and external ACR122U NFC Reader
- NFC/RFID read/write for license cards
- Offline support (Room/SQLite)
- Material 3 design with custom branding
- USB OTG support for external readers

## Setup Instructions
1. Open the project in Android Studio (Hedgehog or newer).
2. Sync Gradle and let dependencies download.
3. Build and run on an Android device (min SDK 26).
4. For devices without built-in NFC: Connect ACR122U NFC Reader via USB OTG.
5. Use the provided login screen to access the app.

## NFC Support
### Built-in NFC
- Works with any Android device with built-in NFC
- Enable NFC in device settings

### External NFC (ACR122U)
- Supports devices without built-in NFC
- Requires USB OTG cable and ACR122U reader
- Automatic detection and setup
- Grant USB permissions when prompted

See [ACR122U_INTEGRATION.md](ACR122U_INTEGRATION.md) for detailed setup and troubleshooting.

## Branding
- Primary Blue: #0072CE
- Accent Red: #E2231A
- Green: #2BA84A
- Logos and splash images are in the `res/drawable` and `res/mipmap` folders.

## Package Name
`com.ektai.evlicense`

---
Developed by Talukdar & Son's, Software Eng. Asif Hossain 