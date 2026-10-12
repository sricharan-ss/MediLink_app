# Phase 7 — Notifications & Medication Reminders Implementation Report

## Overview
Phase 7 extends MediLink with complete end-to-end notification delivery and medication reminder scheduling across Flutter and Express/PostgreSQL/Prisma. All requirements have been implemented and verified without breaking existing patient, doctor, appointment, consultation, prescription, or payment workflows.

---

## 1. Exact Files Modified & Created

### Backend Changes:
1. `backend/src/modules/notifications/notification.repo.js`:
   - Added `createNotificationSafely(data)` to enforce idempotency and prevent duplicate notifications when operations are retried.
   - Enhanced `getNotifications(filters)` to sort by `createdAt: 'desc'` so users see most recent notifications first.
2. `backend/src/modules/notifications/notification.controller.js`:
   - Added ownership verification in `update` (`PUT /api/notifications/:id`) preventing cross-user mutation (returns 403 Forbidden).
   - Added ownership verification in `getById` (`GET /api/notifications/:id`) returning 403 Forbidden for unauthorized users.
   - Enforced non-admin user scoping in `getAll` (`GET /api/notifications`), preventing query parameter tampering with other users' IDs.
3. `backend/src/routes/notification.route.js`:
   - Added `PATIENT` role to `PUT /:id` endpoint so patients can mark notifications as read.
   - Added `DOCTOR` role to `DELETE /:id` endpoint.
4. `backend/src/modules/encounters/encounter.service.js`:
   - In `createEncounter`: Dispatched `APPOINTMENT` notifications to both patient ("Appointment Booked") and doctor ("New Appointment Booked") using `createNotificationSafely`.
   - In `updateEncounter`:
     - Dispatched `APPOINTMENT` notifications on cancellation ("Appointment Cancelled") to patient and doctor.
     - Dispatched `APPOINTMENT` notifications on rescheduling ("Appointment Rescheduled") to patient and doctor.
     - Dispatched `APPOINTMENT` notification on completion ("Consultation Completed") to patient.
5. `backend/src/modules/prescriptions/prescription.service.js`:
   - Updated `createPrescription` to save the prescription to the database before creating the notification.
   - Fixed notification target to notify the patient ("Prescription Issued") with type `PRESCRIPTION` using `createNotificationSafely`.

### Frontend (Flutter) Changes:
1. `lib/services/patient_api_service.dart`:
   - Updated `_request` to parse JSON array responses (`rawDecoded is List ? {'data': rawDecoded} : ...`) preventing Dart type cast exceptions on endpoints returning top-level lists.
   - Implemented persistent medication schedule management in `SharedPreferences` (`medilink_medication_schedules_${patientId}`) supporting create, edit, pause/status toggle, delete, and mark taken.
   - Seeded medication dashboard schedules from real patient prescription medicines without inferring unprescribed schedules.
2. `lib/screens/notification_center_screen.dart`:
   - Corrected model ID resolution using `notification['notificationId'] ?? notification['id']`.
   - Added unread count indicators in AppBar with dynamic "Mark all read" action.
   - Added type-specific visual icons (`Icons.calendar_today_rounded`, `Icons.medication_rounded`, `Icons.science_rounded`, `Icons.receipt_long_rounded`).
   - Added relative formatted timestamps (`Just now`, `5m ago`, `2h ago`, `3d ago`, date).
   - Enhanced empty and error states with descriptive messaging and retry button.
3. `test/notification_and_reminders_test.dart`:
   - Created comprehensive unit tests validating medication reminder lifecycle, duplicate prevention, and notification service initialization.
4. `backend/scripts/testPhase7.js`:
   - Created automated backend test suite verifying all 8 Phase 7 requirements against the running server and PostgreSQL database.

---

## 2. API Endpoints & Notification Contracts

| Endpoint | Method | Roles Allowed | Description |
|---|---|---|---|
| `/api/notifications` | `GET` | `PATIENT`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `HOSPITAL_ADMIN`, `SUPER_ADMIN` | Retrieves notifications for authenticated user (ordered desc). |
| `/api/notifications/:id` | `GET` | `PATIENT`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `HOSPITAL_ADMIN`, `SUPER_ADMIN` | Retrieves specific notification. Enforces ownership (403 for non-owners). |
| `/api/notifications/:id` | `PUT` | `PATIENT`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `HOSPITAL_ADMIN`, `SUPER_ADMIN` | Updates notification (e.g. `isRead: true`). Enforces ownership (403 for non-owners). |
| `/api/notifications/:id` | `DELETE` | `PATIENT`, `DOCTOR`, `RECEPTIONIST`, `HOSPITAL_ADMIN`, `SUPER_ADMIN` | Deletes notification. Enforces ownership (403 for non-owners). |

### Event Notification Matrix:
- **Appointment Booked**:
  - Patient: Title `"Appointment Booked"`, Type `"APPOINTMENT"`
  - Doctor: Title `"New Appointment Booked"`, Type `"APPOINTMENT"`
- **Appointment Rescheduled**:
  - Patient: Title `"Appointment Rescheduled"`, Type `"APPOINTMENT"`
  - Doctor: Title `"Appointment Rescheduled"`, Type `"APPOINTMENT"`
- **Appointment Cancelled**:
  - Patient: Title `"Appointment Cancelled"`, Type `"APPOINTMENT"`
  - Doctor: Title `"Appointment Cancelled"`, Type `"APPOINTMENT"`
- **Consultation Completed**:
  - Patient: Title `"Consultation Completed"`, Type `"APPOINTMENT"`
- **Prescription Issued**:
  - Patient: Title `"Prescription Issued"`, Type `"PRESCRIPTION"`

---

## 3. Reminder Behavior & Local Scheduling

- **Separation of Concerns**:
  - Server-delivered notifications: Persisted in PostgreSQL `Notification` table; delivered for critical clinical events (appointments, prescriptions, lab results).
  - Medication reminders: Scheduled locally on client device via `FlutterLocalNotificationsPlugin` and `timezone` package.
- **Data Source**: Derived directly from real prescription records (`PrescriptionMedicine` records containing medicine name, dosage, frequency, duration).
- **No Unprescribed Inferences**: Reminders do not infer arbitrary dosage schedules. Patient configures preferred reminder times, which are persisted locally per patient in `SharedPreferences`.
- **Duplicate Prevention**:
  - Server-side: `createNotificationSafely` checks existing `(userId, type, title, relatedId)` before creating notifications.
  - Client-side: Schedules deduplicate by medicine ID and time slot; notifications use deterministic 32-bit hash IDs.
- **Graceful Error Handling**:
  - System handles notification permission denial gracefully; medication screens and schedules continue functioning without crashes.

---

## 4. Test Results

### 1. Backend Validation Suite (`backend/scripts/testPhase7.js`):
- **Result**: `41 PASSED, 0 FAILED`
  - Test 1 (Own notifications only): `6 passed`
  - Test 2 (Cross-user read/update/delete blocked): `3 passed`
  - Test 3 (Mark-as-read updates correctly): `4 passed`
  - Test 4 (Appointment & clinical notifications): `13 passed`
  - Test 5 (Deduplication safeguards on retries): `3 passed`
  - Test 6 (Medication reminder lifecycle): `6 passed`
  - Test 7 (Unauthorized & invalid requests rejected): `2 passed`
  - Test 8 (Workflow regressions check): `4 passed`

### 2. Prisma Schema Validation (`npx prisma validate`):
- **Result**: `The schema at prisma\schema.prisma is valid 🚀`

### 3. Flutter Static Analysis (`flutter analyze`):
- **Result**: `0 errors, 0 warnings` (24 preexisting deprecation/const hints in legacy screens, none in new Phase 7 files).

### 4. Flutter Test Suite (`flutter test`):
- **Result**: `25 PASSED, 0 FAILED` across all unit test suites.

---

## 5. Remaining Limitations & Device-Level Verification Requirements
1. **Background Delivery on Physical Devices**:
   - Android 13+ requires runtime `POST_NOTIFICATIONS` permission granted by the user.
   - iOS requires user permission prompt for alerts/badges/sounds.
   - Exact device alarms on modern Android may require `SCHEDULE_EXACT_ALARM` permission if exact timing is preferred over inexact idle windows.
2. **Push Notifications**:
   - Remote push notifications (FCM / APNs) require APNs certificate and Firebase project configuration, which is currently outside local test scope.
