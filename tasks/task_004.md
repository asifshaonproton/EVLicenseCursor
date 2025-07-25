---
ID: task_004
Title: Integrate NFC read/write functionality
Status: Pending
Priority: High
Complexity: High
Assignee: [Unassigned]
Dependencies: [task_001]
---

## Description
Implement NFC read and write features to allow scanning and encoding of license data on physical cards/tags.

## Steps
1. Request and validate NFC permissions at runtime.
2. Implement NFC read functionality using Android's NfcAdapter and Ndef APIs.
3. Implement NFC write functionality to encode license data (plain text or NDEF format).
4. Handle errors for unsupported tags, failed reads/writes, and invalid data.
5. Test with multiple NFC tag types (NTAG213/215, MIFARE Classic if possible).
6. Provide clear user feedback for success/failure.

## Acceptance Criteria
- App can read and write NFC tags/cards reliably.
- Error handling is robust and user-friendly.
- Only valid license data is written to tags.
- Feature works on all supported Android devices with NFC.

## Notes
- Follow Android NFC best practices and security guidelines. 