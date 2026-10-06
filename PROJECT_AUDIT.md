# PROJECT AUDIT: MediLink – Smart Healthcare Patient Management System

**Date:** 2026-09-18  
**Audit Type:** Non-destructive comprehensive end-to-end audit  
**Frontend Root:** `C:\Users\S S SRICHARAN\Downloads\mediLink` (`lib/`)  
**Backend Root:** `C:\Users\S S SRICHARAN\Downloads\mediLink\backend` (`backend/`)  
**Database:** Local PostgreSQL (`medilink`) with Prisma ORM  

---

## 1. Executive Summary & Verification Results

- **Flutter Analyze:** 49 info diagnostics (deprecation notices `withOpacity`, const constructors, and `use_build_context_synchronously` warnings). **0 fatal compilation errors**.
- **Flutter Test Suite:** **12/12 unit and widget tests passing** (`00:09 +12: All tests passed!`).
- **Prisma Schema Validation:** Validated cleanly against [backend/prisma/schema.prisma](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/prisma/schema.prisma) (`The schema at prisma\schema.prisma is valid 🚀`).
- **Backend Server:** Node.js Express server configured at [backend/src/server.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/server.js).

---

## 2. Feature-by-Feature API & Backend Matrix

| # | Feature Area | Flutter Screen / Component | Flutter Endpoint Used | Actual Backend Route | Endpoint Status | Supporting DB Models | Missing Backend / Contract Mismatch |
|---|---|---|---|---|---|---|---|
| 1 | **Phone Login / Init** | `LoginPhoneInputScreen` | `POST /api/auth/login/phone` | `POST /api/auth/login/phone` | **WORKING** | `User`, `OtpLog` | Working. Dev OTP returned in development mode. |
| 2 | **Patient Signup / Init** | `PhoneInputScreen` | `POST /api/auth/user` | `POST /api/auth/user` | **WORKING** | `User`, `tempUser` | Working. |
| 3 | **OTP Verification** | `OtpVerificationScreen` | `POST /api/auth/login/phone/verify`<br>`POST /api/auth/verify-otp` | `POST /api/auth/login/phone/verify`<br>`POST /api/auth/verify-otp` | **WORKING** | `User`, `tempUser` | Returns `accessToken`, `refreshToken`, and user status. |
| 4 | **Patient Profile (Get/Update)** | `ProfileScreen`, `ProfileSetupScreen`, `MyInformationScreen` | `GET /api/users/myinfo`<br>`PUT /api/patients/me/profile` | `GET /api/users/myinfo`<br>`PUT /api/patients/me/profile` | **WORKING** | `User`, `Patient` | `myinfo` returns user info; `upsertMyProfile` updates patient details & `favoriteDoctorIds`. |
| 5 | **Doctor Listing / Search** | `DoctorListScreen`, `SearchResultsScreen` | `GET /api/doctors?q=...` | `GET /api/doctors` | **ROLE BLOCKED** | `Doctor`, `User`, `Hospital` | **Critical Issue:** Route has `roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'])`. It **blocks `PATIENT`** with 403 Forbidden! Needs `PATIENT` role added or public access. |
| 6 | **Doctor Detail** | `DoctorProfileScreen` | `GET /api/doctors/:id` | `GET /api/doctors/:id` | **ROLE BLOCKED** | `Doctor`, `User`, `Hospital` | Same as above: role middleware blocks `PATIENT`. |
| 7 | **Doctor Schedule / Slots** | `BookAppointmentScreen` | `GET /api/doctors/:id/slots` | `GET /api/doctors/doctor-schedule` | **WRONG PATH & ROLE BLOCKED** | `DoctorSchedule`, `Slot` | Backend route is `/api/doctors/doctor-schedule` (requires `['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']`). No patient slot endpoint exists; Flutter falls back to hardcoded `_weekdaySlots`. |
| 8 | **Hospital Listing** | `HospitalListScreen`, `MainAppScreen` | `GET /api/hospitals` | *None* (Only `POST /api/hospitals/create-hospital` exists) | **MISSING** | `Hospital` | Backend has no public or patient `GET /api/hospitals` listing route. Flutter falls back to hardcoded `_fallbackHospitals`. |
| 9 | **Hospital Detail** | `HospitalDetailScreen` | `GET /api/hospitals/:id` | *None* | **MISSING** | `Hospital` | No `GET /api/hospitals/:id` endpoint exists. Flutter falls back to hardcoded detail. |
| 10 | **Appointment Booking** | `BookAppointmentScreen` | `POST /api/encounters` | `POST /api/encounters` | **WORKING** | `Encounter`, `DoctorSchedule` | Role middleware includes `PATIENT`. |
| 11 | **Appointment List & Details** | `AppointmentDetailScreen`, `MainAppScreen` | `GET /api/encounters?patientId=...`<br>`GET /api/encounters/:id` | `GET /api/encounters`<br>`GET /api/encounters/:id` | **WORKING** | `Encounter` | Role middleware includes `PATIENT`. |
| 12 | **Appointment Cancel** | `AppointmentDetailScreen` | `PUT /api/encounters/:id` | `PUT /api/encounters/:id` | **WORKING** | `Encounter` | Updates status to `CANCELLED` and saves `cancellationNote`. |
| 13 | **Appointment Reschedule** | `AppointmentDetailScreen` | `PUT /api/encounters/:id` | `PUT /api/encounters/:id` | **WORKING** | `Encounter` | Updates `scheduledTime` and status to `SCHEDULED`. |
| 14 | **Favorite Doctors** | `FavoriteDoctorsScreen` | `PUT /api/patients/me/profile` | `PUT /api/patients/me/profile` | **WORKING** | `Patient` (`favoriteDoctorIds String[]`) | Syncs with `favoriteDoctorIds` in `Patient` model. |
| 15 | **Prescriptions** | `MedicalHistoryScreen`, `MainAppScreen` | `GET /api/prescriptions?patientId=...` | `GET /api/prescriptions` | **ROLE BLOCKED** | `Prescription`, `PrescriptionMedicine`, `Medicine` | **Critical Issue:** Route has `roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'])`. It **blocks `PATIENT`** with 403 Forbidden! Also `getAll` only filters by `encounterId`, not `patientId`. |
| 16 | **Medical Summaries** | `MedicalSummariesScreen` | `GET /api/summaries?patientId=...`<br>`GET /api/summaries/:id` | `GET /api/summaries` | **MISSING / EMPTY ROUTE** | `Summary` | [summary.route.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/routes/summary.route.js) has no routes defined, and [summary.controller.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/modules/summaries/summary.controller.js) is an empty file (0 bytes). |
| 17 | **Medicine Catalog Search** | `OrderMedicinesScreen` | `GET /api/medicines?search=...` | `GET /api/medicines` | **WORKING** | `Medicine` | Authenticated GET returns medicines. |
| 18 | **Medication Dashboard** | `MedicationsScreen` | `GET /api/medicines/dashboard` | *None* | **MISSING** | `Prescription`, `Medicine` | Does not exist in backend. Flutter falls back to empty summary map. |
| 19 | **Medication Orders** | `OrderMedicinesScreen`, `OrderHistoryScreen`, `OrderTrackingScreen` | `GET /api/medicines/orders`<br>`POST /api/medicines/orders` | *None* | **MISSING** | `Invoice`, `InvoiceItem` (or custom order model) | Backend has no `Order` model or `medicines/orders` route. Existing backend uses `Invoice` + `InvoiceItem`. |
| 20 | **Medication Refill** | `RefillPageScreen` | `POST /api/medicines/refill` | *None* | **MISSING** | `Prescription`, `Encounter` | Does not exist on backend. |
| 21 | **Medication Schedules** | `MedicationsScreen` | `GET /api/medicines/schedules`<br>`POST /api/medicines/schedules` | *None* | **MISSING** | `reminderJob` | Does not exist on backend under medicines. (Backend has `reminderJob` under cron workers). |
| 22 | **Payment Order (Razorpay)** | `OrderMedicinesScreen`, `PaymentHistoryScreen` | `POST /api/payments/order` | `POST /api/payments/order` | **PARTIALLY IMPLEMENTED / CONTRACT MISMATCH** | `Invoice`, `Payment` | Backend requires an existing `invoiceId`. Flutter order screen tries to pass an arbitrary `orderId` without creating an invoice first. |
| 23 | **Payment Verification** | `OrderMedicinesScreen` | `POST /api/payments/verify` | `POST /api/payments/verify` | **WORKING** | `Payment` | Signature verification against Razorpay key/secret. |
| 24 | **Payment History** | `PaymentHistoryScreen` | `GET /api/payments?patientId=...` | `GET /api/payments` | **ROLE BLOCKED** | `Payment`, `Invoice` | `GET /api/payments` requires `['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']`. `PATIENT` role is blocked! Also `Invoice` listing is restricted. |
| 25 | **Notifications** | `NotificationCenterScreen` | `GET /api/notifications` | `GET /api/notifications` | **WORKING** | `Notification` | Role middleware includes `PATIENT`. |
| 26 | **Secure Vault** | `SecureVaultScreen` | `POST /api/users/uploadVault`<br>`GET /api/users/vault` | `POST /api/users/uploadVault`<br>`GET /api/users/vault` | **WORKING** | `vault`, `User` | Uploads file via Multer to Cloudinary and saves URL in PostgreSQL `vault` table. |

---

## 3. Critical Blockers & Analysis

### 3.1. Role Authorization Blockers (403 Forbidden for Patients)
Several endpoints that patients must access are strictly restricted to staff roles in [doctor.route.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/routes/doctor.route.js), [prescription.route.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/routes/prescription.route.js), and [payment.route.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/routes/payment.route.js):
1. **`GET /api/doctors` and `GET /api/doctors/:id`**: Restricted to `['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']`. Patients cannot browse or search doctors without receiving a 403 Forbidden!
2. **`GET /api/prescriptions` and `GET /api/prescriptions/:id`**: Restricted to `['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']`. Patients cannot view their own prescriptions!
3. **`GET /api/payments`**: Restricted to `['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']`. Patients cannot view their payment history!

### 3.2. Empty & Missing Backend Endpoints
1. **`GET /api/hospitals`**: Does not exist in [hospital.routes.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/routes/hospital.routes.js). Only `POST /api/hospitals/create-hospital` exists.
2. **`GET /api/summaries`**: [summary.route.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/routes/summary.route.js) and [summary.controller.js](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/backend/src/modules/summaries/summary.controller.js) are completely empty files (0 bytes), even though the `Summary` Prisma model exists in the database schema.
3. **Medicine Management (`/api/medicines/orders`, `/dashboard`, `/refill`, `/schedules`)**: The backend only has CRUD for `Medicine` (medicine catalog). It does not have an order or refill workflow.

### 3.3. Payment Integration Contract Mismatch
- The backend's `POST /api/payments/order` expects `{ invoiceId, amount, currency, notes }`.
- It fetches the `Invoice` model by `invoiceId` from PostgreSQL, checks if a pending Razorpay order exists, or creates a new one through the Razorpay SDK.
- The Flutter medicine ordering screen (`order_medicines_screen.dart`) tries to invoke `createMedicationOrderPayment(orderId)` where `orderId` is a mock or non-invoice ID. Without creating a proper `Invoice` (or an Invoice with `InvoiceItem`s) first, `POST /api/payments/order` fails on foreign key / invoice lookup.

### 3.4. Fake Fallback Behavior That Masks Backend Failures
1. **`PatientApiService.createMedicationOrder`**:
   ```dart
   } catch (_) {
     return {
       'id': 'ord-local-${DateTime.now().millisecondsSinceEpoch}',
       'orderType': orderType,
       'status': 'PENDING',
       'items': items,
     };
   }
   ```
   If the backend fails, it returns a fake local order object that deceives the user into thinking the order was submitted.
2. **`PatientApiService.createMedicationRefill`**:
   ```dart
   } catch (_) {
     return {'success': true, 'message': 'Refill request submitted'};
   }
   ```
   Silently reports success even when the backend endpoint is nonexistent or down.
3. **`PatientApiService.getDoctorSlots`**:
   Falls back to hardcoded `_weekdaySlots` and `_weekendSlots` because backend slot querying requires staff permissions and an exact date schedule.

### 3.5. Lingering Old Brown/Cream Branding in Flutter Screens
While [app_colors.dart](file:///C:/Users/S%20S%20SRICHARAN/Downloads/mediLink/lib/core/app_colors.dart) maps backward-compatibility aliases like `AppColors.brownDeep = primary`, several screens still have hardcoded raw hex colors:
- `const Color(0xFF3B1F0A)` (old brown deep)
- `const Color(0xFFFFFDF8)` (old cream background)
- `const Color(0xFFA0622A)` (old brown light)
- `const Color(0xFF6B3A1F)` (old brown gradient)
Found in:
- `lib/screens/refill_page_screen.dart`
- `lib/screens/order_tracking_screen.dart`
- `lib/screens/medications_screen.dart`
- `lib/screens/secure_vault_screen.dart`
- `lib/screens/hospital_detail_screen.dart`
- `lib/screens/doctor_profile_screen.dart`
- `lib/screens/book_appointment_screen.dart`

---

## 4. Recommended Implementation Order

1. **Step 1: Unblock Role Authorization on Backend (Zero Schema Impact)**
   - Allow `PATIENT` role on `GET /api/doctors` and `GET /api/doctors/:id`.
   - Allow `PATIENT` role on `GET /api/prescriptions` and `GET /api/prescriptions/:id` (filtering by patient's encounters).
   - Allow `PATIENT` role on `GET /api/payments` and `GET /api/payments/invoices` (filtered by patientId).

2. **Step 2: Implement Missing Backend Read Endpoints**
   - Implement `GET /api/hospitals` and `GET /api/hospitals/:id` in `hospital.controller.js` and `hospital.routes.js`.
   - Implement `GET /api/summaries` and `GET /api/summaries/:id` in `summary.controller.js`, `summary.service.js`, `summary.repo.js`, and `summary.route.js` using the existing `Summary` Prisma model.

3. **Step 3: Align Medicine Ordering & Billing Flow**
   - Use the existing `Invoice` + `InvoiceItem` Prisma models to support medicine orders:
     - When placing a medicine order, create an `Invoice` with `itemType: MEDICINE`.
     - Link the resulting `invoiceId` to `POST /api/payments/order` for Razorpay order generation.
   - Remove fake success fallback in `PatientApiService.createMedicationOrder` and `createMedicationRefill` so real errors are surfaced to the user.

4. **Step 4: Clean Up Lingering Hardcoded Brown Palette in Flutter**
   - Replace remaining hardcoded hex colors (`0xFF3B1F0A`, `0xFFFFFDF8`, `0xFFA0622A`, `0xFF6B3A1F`) in the 7 affected screens with standard `AppColors` tokens (`primary`, `secondary`, `paleGreen`, `textPrimary`, `textSecondary`, `background`).

5. **Step 5: End-to-End Local Testing with Database**
   - Push schema to local Postgres: `npx prisma db push`.
   - Seed medicines: `npm run seed:medicines`.
   - Start backend: `npm run dev`.
   - Run Flutter on Windows / Emulator and execute the full patient journey.

---

## 5. File Modification Plan

### Exact Files That Will Need Modification (in Implementation Phase):
- **Backend Route & Controller Files:**
  - `backend/src/routes/doctor.route.js` (add `PATIENT` to `GET /` and `GET /:id`)
  - `backend/src/routes/prescription.route.js` (add `PATIENT` to `GET /` and `GET /:id`)
  - `backend/src/modules/prescriptions/prescription.repo.js` (add `patientId` query filter via `encounter.patientId`)
  - `backend/src/routes/hospital.routes.js` (add `GET /` and `GET /:id`)
  - `backend/src/modules/hospitals/hospital.controller.js` (add list/getById)
  - `backend/src/routes/summary.route.js` (populate endpoints)
  - `backend/src/modules/summaries/summary.controller.js`, `summary.service.js`, `summary.repo.js` (populate logic)
  - `backend/src/routes/payment.route.js` (allow `PATIENT` to fetch their invoices/payments)
- **Flutter Files:**
  - `lib/services/patient_api_service.dart` (remove fake fallback objects, harmonize invoice creation with payment order)
  - `lib/screens/refill_page_screen.dart` (theme colors)
  - `lib/screens/order_tracking_screen.dart` (theme colors)
  - `lib/screens/medications_screen.dart` (theme colors)
  - `lib/screens/secure_vault_screen.dart` (theme colors)
  - `lib/screens/hospital_detail_screen.dart` (theme colors)
  - `lib/screens/doctor_profile_screen.dart` (theme colors)
  - `lib/screens/book_appointment_screen.dart` (theme colors)

### Files That Should NOT Be Modified:
- `backend/prisma/schema.prisma` (preserve existing database schema without destructive changes)
- `backend/src/config/db.js`
- `backend/src/middleware/authMiddleware.js`
- `lib/core/session_store.dart` (already solid and tested)
- `lib/core/backend_config.dart`
- `lib/core/app_colors.dart` (design system tokens already finalized)
- Any external directories or VITADATA references outside the workspace
