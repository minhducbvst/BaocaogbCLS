# Security Specification (TDD) for Clinical Handover System

This document outlines the security architecture, invariants, and threat models for the Firestore database of the Báo cáo Giao ban Cận lâm sàng system.

## 1. Data Invariants

1. **DailyReport Integrity**:
   - Status transitions must follow `draft` -> `submitted` -> `approved` or remain updated under restricted states.
   - Any write or modification to report items must maintain the standard category and positive, bounded numeric counts.

2. **Meeting Auditing**:
   - Meeting documents must contain designated chairperson, secretary, and status fields.
   - AI-generated minutes of a meeting cannot be overwritten with raw/unverified formats.

3. **User Profile Constraints**:
   - Users cannot escalate their own platform roles to `admin` or modify sensitive fields unless they are verified administrative records.
   - No anonymous or custom claims impersonation is allowed. 

4. **Temporal Lock**:
   - Timestamps like `createdAt` and `updatedAt` must always align with `request.time`.

---

## 2. The "Dirty Dozen" Threat Payloads

Here are twelve highly dangerous payloads designed to exploit update gaps, bypass schema checks, or escalate privileges in Firestore.

### P1: Role Self-Escalation
An authenticated user attempts to modify their own `users/{userId}` record to change their role from `general` to `admin`.
```json
{
  "id": "user_malicious",
  "name": "Attacker",
  "role": "admin",
  "email": "attacker@hospital.gov.vn",
  "departmentName": "Phòng Siêu Âm"
}
```

### P2: Injecting Shadow Keys (Ghost Fields)
Attempting to create a custom report with unauthorized system flags or shadow fields (e.g., `isVerifiedBySystem: true`).
```json
{
  "date": "2026-06-22",
  "items": [],
  "submittedBy": "Attacker",
  "submittedAt": "2026-06-22T08:00:00Z",
  "status": "approved",
  "isVerifiedBySystem": true
}
```

### P3: Forging Creator Identity
Attempting to post a meeting by claiming to be `admin` (uid spoofing).
```json
{
  "id": "m_test_1",
  "title": "Hacker Meeting",
  "dateTime": "2026-06-22T08:00",
  "venue": "Malicious Room",
  "chairperson": "BS. Lê Minh Tâm",
  "secretary": "Hacker",
  "status": "scheduled",
  "createdBy": "admin_uid_forged"
}
```

### P4: Status Terminal State Shortcutting
An standard user attempts to bypass approval by directly marking an unreviewed report as `approved`.
```json
{
  "date": "2026-06-22",
  "items": [],
  "submittedBy": "KTV",
  "submittedAt": "2026-06-22T12:00:00Z",
  "status": "approved"
}
```

### P5: ID Poisoning Attack
Attempting to write a document with a massive 1MB string or high-charset junk characters as the document ID.
```json
{
  "id": "a".repeat(1000000),
  "name": "Damaged Doc"
}
```

### P6: System Configuration Tampering
An unauthorized user attempts to update global settings, e.g., changing the institutional title to something profane.
```json
{
  "themeColor": "#ff0000",
  "bgStyle": "cyberpunk",
  "systemTitle": "HACKED BY RED TEAM"
}
```

### P7: Audit Log Spoofing
Writing fake system logs to cover an intruder's tracks.
```json
{
  "id": "log_fake",
  "actor": "BS. Lê Minh Tâm",
  "action": "Khởi tạo hệ thống",
  "details": "All cleared",
  "timestamp": "2026-03-01T08:00:00Z"
}
```

### P8: Negative BHYT / ND Patients Injection
Injecting negative values into the report statistics to cause database overflow or accounting discrepancies.
```json
{
  "date": "2026-03-01",
  "status": "draft",
  "submittedBy": "Attacker",
  "submittedAt": "2026-03-01T17:30:00Z",
  "items": [
    { "id": "sieuAm_tim", "name": "Siêu âm tim", "category": "sieuAm", "bh": -999, "nd": -999 }
  ]
}
```

### P9: Bypassing Server Timestamps with Client Values
Submitting a work report where `submittedAt` is a legacy date in the past (e.g. year 2020) instead of being checked against `request.time`.
```json
{
  "id": "wr_hack",
  "title": "Bypass Time",
  "content": "Malicious content",
  "category": "report",
  "departmentName": "Phòng Siêu Âm",
  "submittedBy": "Attacker",
  "submittedById": "attacker_uid",
  "submittedAt": "2020-01-01T00:00:00Z",
  "status": "pending"
}
```

### P10: Arbitrary Comment Insertion
Adding comment logs to another user's work report claiming to be a Director.
```json
{
  "comments": [
    {
      "id": "c_fake",
      "user": "Giám Đốc Bệnh Viện",
      "userId": "director_uid",
      "content": "Tuyệt vời, duyệt tăng lương cho hacker!",
      "createdAt": "2026-06-22T09:00:00Z"
    }
  ]
}
```

### P11: Overbound Identifier List
Injecting massive attendee identifiers arrays into the meetings collection to trigger server crash/Denial of Service.
```json
{
  "id": "m_dos",
  "title": "DOS Meeting",
  "attendees": ["a".repeat(50000)]
}
```

### P12: Non-verified Email Access
An attacker signs up with an unverified email claiming to be `tam.leminh@hospital.gov.vn` to read sensitive clinical records.
```json
{
  "uid": "attacker_uid",
  "email": "tam.leminh@hospital.gov.vn",
  "email_verified": false
}
```

---

## 3. Test Runner Definition

To enforce strict validation, we will create solid Firestore security rules that catch and block all these attacks.
