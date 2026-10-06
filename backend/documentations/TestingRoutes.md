# VitaData API Testing Routes

## Overview
This document reflects the current API surface from `src/server.js` and `src/routes/*`.

- Base host (default): `http://localhost:5000`
- API base prefix: `http://localhost:5000/api`
- Public routes: `/health`, `/api`, `/api/health/db`, `/api/auth/*`, `/api/whatsapp/*`
- All other `/api/*` routes are protected by `authMiddleware` in `src/server.js`.

## Quick Health Endpoints
- `GET /health`
- `GET /api`
- `GET /api/health/db`

## Auth
Mounted at: `/api/auth`

- `POST /api/auth/user`

Payload (`POST /api/auth/user`):
Purpose: Start OTP authentication for a user by phone number (create user if needed, then send OTP).
```json
{
  "firstName": "Test",
  "lastName": "User",
  "phoneNumber": "+919876543210"
}
```

## Users
Mounted at: `/api/users`

- `GET /api/users/userbyid` (query: `userId`)
- `GET /api/users/userbyname` (query: `name`)
- `GET /api/users/myinfo` (auth)
- `POST /api/users/uploadProfile` (auth, multipart)
- `POST /api/users/uploadVault` (auth, multipart)
- `GET /api/users/vault` (auth)
- `GET /api/users/profile` (auth)

Payload (`POST /api/users/uploadProfile`):
Purpose: Upload/update the authenticated user's profile image.
- Content-Type: `multipart/form-data`
- Form fields: `file` (required)

Payload (`POST /api/users/uploadVault`):
Purpose: Upload a secure vault file for the authenticated user.
- Content-Type: `multipart/form-data`
- Form fields: `file` (required)

## Doctors
Mounted at: `/api/doctors`

- `POST /api/doctors/`
- `GET /api/doctors/`
- `GET /api/doctors/:id`
- `PUT /api/doctors/:id`
- `DELETE /api/doctors/:id`
- `POST /api/doctors/doctor-schedule`
- `GET /api/doctors/doctor-schedule`
- `GET /api/doctors/doctor-schedule/:id`
- `PUT /api/doctors/doctor-schedule/:id`
- `DELETE /api/doctors/doctor-schedule/:id`
- `POST /api/doctors/doctor-hospital`
- `GET /api/doctors/doctor-hospital`
- `GET /api/doctors/doctor-hospital/:id`
- `PUT /api/doctors/doctor-hospital/:id`
- `DELETE /api/doctors/doctor-hospital/:id`

Payload (`POST /api/doctors/`):
Purpose: Create a doctor profile linked to an existing user.
```json
{
  "userId": "9cf93081-2ac7-4d2b-b375-52a8bff76c8d",
  "specialization": "CARDIOLOGY",
  "licenseNo": "LIC123456",
  "signatureurl": "https://example.com/signature.png",
  "isAvailable": true,
  "avgRating": 4.5,
  "joiningDate": "2026-03-26"
}
```

Payload (`PUT /api/doctors/:id`):
Purpose: Update doctor profile details for the specified doctor.
```json
{
  "specialization": "NEUROLOGY",
  "isAvailable": true,
  "avgRating": 4.8
}
```

Payload (`POST /api/doctors/doctor-schedule`):
Purpose: Create a doctor appointment schedule entry.
```json
{
  "doctorId": "f2f0e5e6-56d2-46db-9135-b34f301840ef",
  "patientId": "f9d89589-7ea8-41f9-ae4a-4d49cf8d9893",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "scheduledTime": "2026-03-26T14:30:00.000Z",
  "slotDuration": 30
}
```

Payload (`PUT /api/doctors/doctor-schedule/:id`):
Purpose: Update a doctor schedule entry (time, duration, etc.).
```json
{
  "scheduledTime": "2026-03-26T15:00:00.000Z",
  "slotDuration": 45
}
```

Payload (`POST /api/doctors/doctor-hospital`):
Purpose: Link a doctor to a hospital.
```json
{
  "doctorId": "f2f0e5e6-56d2-46db-9135-b34f301840ef",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889"
}
```

Payload (`PUT /api/doctors/doctor-hospital/:id`):
Purpose: Update an existing doctor-hospital relationship.
```json
{
  "doctorId": "f2f0e5e6-56d2-46db-9135-b34f301840ef",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889"
}
```

## Patients
Mounted at: `/api/patients`

- `POST /api/patients/`
- `GET /api/patients/`
- `GET /api/patients/:id`
- `PUT /api/patients/:id`
- `DELETE /api/patients/:id`
- `PUT /api/patients/me/profile` (auth; used by app "Tell us about you")
- `POST /api/patients/admitted`
- `GET /api/patients/admitted`
- `GET /api/patients/admitted/:id`
- `PUT /api/patients/admitted/:id`
- `DELETE /api/patients/admitted/:id`

Payload (`POST /api/patients/`):
Purpose: Create a patient profile linked to an existing user.
```json
{
  "userId": "dbb7e48f-1db3-42ca-a81a-826cbcc53d00",
  "gender": "male",
  "dob": "1990-05-15",
  "bloodGroup": "O_POSITIVE",
  "favouriteDoctorIds": [
    "f2f0e5e6-56d2-46db-9135-b34f301840ef"
  ]
}
```

Payload (`PUT /api/patients/:id`):
Purpose: Update patient profile details.
```json
{
  "bloodGroup": "AB_POSITIVE",
  "favouriteDoctorIds": [
    "f2f0e5e6-56d2-46db-9135-b34f301840ef"
  ]
}
```

Payload (`PUT /api/patients/me/profile`):
Purpose: Upsert patient profile for the logged-in user from onboarding.
```json
{
  "age": 28,
  "gender": "male",
  "bloodGroup": "O_POSITIVE",
  "chronicConditions": [
    "Hypertension",
    "Allergies"
  ]
}
```

Payload (`POST /api/patients/admitted`):
Purpose: Admit a patient to a bed in a hospital under a doctor.
```json
{
  "patientId": "f9d89589-7ea8-41f9-ae4a-4d49cf8d9893",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "doctorId": "f2f0e5e6-56d2-46db-9135-b34f301840ef",
  "bedId": "ce36a24a-4088-47b6-8558-f0c25b22b5d2",
  "admissionDate": "2026-03-26",
  "recoveryStatus": "Stable"
}
```

Payload (`PUT /api/patients/admitted/:id`):
Purpose: Update an admitted patient record (discharge, recovery status, ward/bed details).
```json
{
  "dischargeDate": "2026-04-02",
  "recoveryStatus": "InRecovery"
}
```

## Encounters
Mounted at: `/api/encounters`

- `POST /api/encounters/`
- `GET /api/encounters/`
- `GET /api/encounters/:id`
- `PUT /api/encounters/:id`
- `DELETE /api/encounters/:id`

Payload (`POST /api/encounters/`):
Purpose: Create an encounter/appointment between patient and doctor.
```json
{
  "patientId": "f9d89589-7ea8-41f9-ae4a-4d49cf8d9893",
  "doctorId": "f2f0e5e6-56d2-46db-9135-b34f301840ef",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "scheduledTime": "2026-03-28T10:30:00.000Z",
  "duration": 30,
  "visitType": "OPD",
  "reason": "Follow-up checkup"
}
```

Payload (`PUT /api/encounters/:id`):
Purpose: Update encounter status, notes, schedule, or follow-up details.
```json
{
  "status": "COMPLETED",
  "notes": "Patient doing well"
}
```

## Prescriptions
Mounted at: `/api/prescriptions`

- `POST /api/prescriptions/`
- `GET /api/prescriptions/`
- `GET /api/prescriptions/:id`
- `PUT /api/prescriptions/:id`
- `DELETE /api/prescriptions/:id`
- `POST /api/prescriptions/:prescriptionId/medications`
- `GET /api/prescriptions/:prescriptionId/medications`
- `GET /api/prescriptions/:prescriptionId/medications/:id`
- `PUT /api/prescriptions/:prescriptionId/medications/:id`
- `DELETE /api/prescriptions/:prescriptionId/medications/:id`
- `POST /api/prescriptions/:prescriptionId/diagnoses`
- `GET /api/prescriptions/:prescriptionId/diagnoses`
- `GET /api/prescriptions/:prescriptionId/diagnoses/:id`
- `PUT /api/prescriptions/:prescriptionId/diagnoses/:id`
- `DELETE /api/prescriptions/:prescriptionId/diagnoses/:id`

Payload (`POST /api/prescriptions/`):
Purpose: Create a prescription for an encounter.
```json
{
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "nextVisit": "2026-04-02",
  "diagnosisText": "Hypertension",
  "symptoms": "Headache",
  "allergiesNoted": "Penicillin",
  "severity": "MODERATE"
}
```

Payload (`PUT /api/prescriptions/:id`):
Purpose: Update an existing prescription.
```json
{
  "nextVisit": "2026-04-05",
  "severity": "SEVERE"
}
```

Payload (`POST /api/prescriptions/:prescriptionId/medications`):
Purpose: Add a medication entry to a prescription.
```json
{
  "prescriptionId": "3a23d233-c4f4-4d88-ac86-9ee4ca4f2eef",
  "medicineId": "8dfa5db8-e26c-43ff-8c50-69fbb74d32d8",
  "dosage": "5mg",
  "frequency": "TWICE_DAILY",
  "durationDays": 7
}
```

Payload (`PUT /api/prescriptions/:prescriptionId/medications/:id`):
Purpose: Update a prescription medication entry.
```json
{
  "dosage": "10mg",
  "frequency": "ONCE_DAILY",
  "durationDays": 5
}
```

Payload (`POST /api/prescriptions/:prescriptionId/diagnoses`):
Purpose: Add a diagnosis entry associated with the prescription encounter.
```json
{
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "icdCode": "I10",
  "diagnosisText": "Essential hypertension",
  "symptoms": [
    "High blood pressure"
  ],
  "allergiesNoted": [
    "Penicillin"
  ],
  "severity": "MODERATE"
}
```

Payload (`PUT /api/prescriptions/:prescriptionId/diagnoses/:id`):
Purpose: Update a diagnosis entry for the prescription.
```json
{
  "diagnosisText": "Hypertension controlled",
  "severity": "MILD"
}
```

## Medicines
Mounted at: `/api/medicines`

- `POST /api/medicines/`
- `GET /api/medicines/`
- `GET /api/medicines/:id`
- `PUT /api/medicines/:id`
- `DELETE /api/medicines/:id`

Payload (`POST /api/medicines/`):
Purpose: Create a medicine master/catalog record.
```json
{
  "name": "Aspirin",
  "type": "Pain Reliever",
  "manufacturer": "Bayer",
  "shortComposition1": "Acetylsalicylic acid",
  "shortComposition2": "100mg",
  "saltComposition": "ASA - 500mg",
  "isDiscontinued": false
}
```

Payload (`PUT /api/medicines/:id`):
Purpose: Update medicine catalog details.
```json
{
  "manufacturer": "Generic Pharma",
  "isDiscontinued": false
}
```

## Labs
Mounted at: `/api/labs`

- `POST /api/labs/`
- `GET /api/labs/`
- `GET /api/labs/:id`
- `PUT /api/labs/:id`
- `DELETE /api/labs/:id`
- `POST /api/labs/schedules`
- `GET /api/labs/schedules`
- `GET /api/labs/schedules/:id`
- `PUT /api/labs/schedules/:id`
- `DELETE /api/labs/schedules/:id`

Payload (`POST /api/labs/`):
Purpose: Create a lab record for a hospital.
```json
{
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "name": "Central Diagnostic Lab",
  "capacity": 20,
  "availableSlots": 20,
  "bookedSlots": 0
}
```

Payload (`PUT /api/labs/:id`):
Purpose: Update lab metadata such as capacity and slot counters.
```json
{
  "capacity": 25,
  "availableSlots": 25
}
```

Payload (`POST /api/labs/schedules`):
Purpose: Create a lab schedule/slot booking entry.
```json
{
  "labId": "e1979d5b-e633-4f95-ab59-0af7ea00e326",
  "patientId": "f9d89589-7ea8-41f9-ae4a-4d49cf8d9893",
  "date": "2026-03-27",
  "slotTime": "08:00",
  "slotDuration": 30,
  "isBooked": false
}
```

Payload (`PUT /api/labs/schedules/:id`):
Purpose: Update a lab schedule entry.
```json
{
  "slotTime": "09:00",
  "slotDuration": 45,
  "isBooked": true
}
```

## Feedback
Mounted at: `/api/feedback`

- `POST /api/feedback/`
- `GET /api/feedback/`
- `GET /api/feedback/:id`
- `PUT /api/feedback/:id`
- `DELETE /api/feedback/:id`

Payload (`POST /api/feedback/`):
Purpose: Submit feedback for an encounter.
```json
{
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "question": "Was the doctor professional?",
  "rating": 5,
  "comment": "Excellent service"
}
```

Payload (`PUT /api/feedback/:id`):
Purpose: Update an existing feedback response.
```json
{
  "question": "Was the doctor professional?",
  "rating": 4,
  "comment": "Good care"
}
```

## Notifications
Mounted at: `/api/notifications`

- `POST /api/notifications/`
- `GET /api/notifications/`
- `GET /api/notifications/:id`
- `PUT /api/notifications/:id`
- `DELETE /api/notifications/:id`

Payload (`POST /api/notifications/`):
Purpose: Create a notification for a user.
```json
{
  "userId": "9cf93081-2ac7-4d2b-b375-52a8bff76c8d",
  "title": "Appointment Reminder",
  "message": "Your appointment is tomorrow at 10:00 AM",
  "type": "APPOINTMENT",
  "isRead": false
}
```

Payload (`PUT /api/notifications/:id`):
Purpose: Update notification content or read status.
```json
{
  "isRead": true
}
```

## Vitals
Mounted at: `/api/vitals`

- `POST /api/vitals/`
- `GET /api/vitals/`
- `GET /api/vitals/:id`
- `PUT /api/vitals/:id`
- `DELETE /api/vitals/:id`
- `POST /api/vitals/types`
- `GET /api/vitals/types`
- `GET /api/vitals/types/:id`
- `PUT /api/vitals/types/:id`
- `DELETE /api/vitals/types/:id`
- `POST /api/vitals/devices`
- `GET /api/vitals/devices`
- `GET /api/vitals/devices/:id`
- `PUT /api/vitals/devices/:id`
- `DELETE /api/vitals/devices/:id`

Payload (`POST /api/vitals/`):
Purpose: Record a vital measurement for an encounter.
```json
{
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "vitalTypeId": "f510f111-bcd8-4cc4-95ad-37646653bfe4",
  "deviceId": "1f74f944-c42b-4655-af4e-f0e27f20a5fd",
  "value": "37.2",
  "recordedAt": "2026-03-26",
  "source": "MANUAL",
  "qualityScore": 98
}
```

Payload (`PUT /api/vitals/:id`):
Purpose: Update an existing vital measurement.
```json
{
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "vitalTypeId": "f510f111-bcd8-4cc4-95ad-37646653bfe4",
  "deviceId": "1f74f944-c42b-4655-af4e-f0e27f20a5fd",
  "value": "37.5",
  "source": "MANUAL",
  "qualityScore": 99
}
```

Payload (`POST /api/vitals/types`):
Purpose: Create a vital type definition (e.g., temperature, pulse).
```json
{
  "name": "Body Temperature",
  "unit": "C",
  "normalRange": "36.5-37.5"
}
```

Payload (`PUT /api/vitals/types/:id`):
Purpose: Update a vital type definition.
```json
{
  "name": "Temperature",
  "unit": "C",
  "normalRange": "36.5-37.5"
}
```

Payload (`POST /api/vitals/devices`):
Purpose: Register a medical device used for vital capture.
```json
{
  "name": "Thermometer",
  "deviceType": "Temperature Sensor",
  "manufacturer": "Omron",
  "model": "OMR-T100",
  "calibrationDate": "2026-03-26"
}
```

Payload (`PUT /api/vitals/devices/:id`):
Purpose: Update device metadata/calibration info.
```json
{
  "name": "Thermometer Pro",
  "calibrationDate": "2026-03-27"
}
```

## Inventory
Mounted at: `/api/inventory`

- `POST /api/inventory/`
- `GET /api/inventory/`
- `GET /api/inventory/:id`
- `PUT /api/inventory/:id`
- `DELETE /api/inventory/:id`
- `POST /api/inventory/managers`
- `GET /api/inventory/managers`
- `GET /api/inventory/managers/:id`
- `PUT /api/inventory/managers/:id`
- `DELETE /api/inventory/managers/:id`

Payload (`POST /api/inventory/`):
Purpose: Add a medicine batch/item to hospital inventory.
```json
{
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "medicineId": "8dfa5db8-e26c-43ff-8c50-69fbb74d32d8",
  "batchNo": "BATCH-001",
  "quantity": 1000,
  "reorderLevel": 200,
  "managedBy": "4756c3de-d43f-4b89-a5cf-f2a49bd8f76d",
  "price": 5,
  "expiryDate": "2027-03-26"
}
```

Payload (`PUT /api/inventory/:id`):
Purpose: Update inventory quantities, thresholds, or related metadata.
```json
{
  "quantity": 900,
  "reorderLevel": 150
}
```

Payload (`POST /api/inventory/managers`):
Purpose: Create an inventory manager assignment record.
```json
{
  "userId": "9cf93081-2ac7-4d2b-b375-52a8bff76c8d",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "createdAt": "2026-03-26T12:00:00.000Z",
  "updatedAt": "2026-03-26T12:00:00.000Z"
}
```

Payload (`PUT /api/inventory/managers/:id`):
Purpose: Update inventory manager assignment details.
```json
{
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "updatedAt": "2026-03-26T12:30:00.000Z"
}
```

## Payments and Invoices
Mounted at: `/api/payments`

- `POST /api/payments/invoices`
- `GET /api/payments/invoices`
- `GET /api/payments/invoices/:id`
- `PUT /api/payments/invoices/:id`
- `DELETE /api/payments/invoices/:id`
- `POST /api/payments/invoices/items`
- `GET /api/payments/invoices/items`
- `GET /api/payments/invoices/items/:id`
- `PUT /api/payments/invoices/items/:id`
- `DELETE /api/payments/invoices/items/:id`
- `POST /api/payments/`
- `GET /api/payments/`
- `GET /api/payments/:id`
- `PUT /api/payments/:id`
- `DELETE /api/payments/:id`
- `POST /api/payments/order`
- `POST /api/payments/verify`
- `POST /api/payments/capture`
- `POST /api/payments/:id/refund`

Payload (`POST /api/payments/invoices`):
Purpose: Create an invoice for a patient and hospital.
```json
{
  "patientId": "f9d89589-7ea8-41f9-ae4a-4d49cf8d9893",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "invoiceNumber": "INV-2026-001",
  "totalAmount": 50000,
  "discountAmount": 5000,
  "taxAmount": 4050,
  "finalAmount": 49050,
  "status": "PENDING",
  "dueDate": "2026-04-26"
}
```

Payload (`PUT /api/payments/invoices/:id`):
Purpose: Update invoice status, due date, paid date, or notes.
```json
{
  "status": "PAID",
  "paidDate": "2026-03-26"
}
```

Payload (`POST /api/payments/invoices/items`):
Purpose: Add a billable item line to an invoice.
```json
{
  "invoiceId": "1511ecd4-ba10-4fc6-858f-bf3f4651baaf",
  "itemType": "ENCOUNTER",
  "itemId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "description": "Consultation Fee",
  "quantity": 1,
  "unitPrice": 5000,
  "totalPrice": 5000
}
```

Payload (`PUT /api/payments/invoices/items/:id`):
Purpose: Update an invoice line item.
```json
{
  "description": "Consultation and registration",
  "quantity": 1,
  "unitPrice": 5500,
  "totalPrice": 5500
}
```

Payload (`POST /api/payments/`):
Purpose: Record a payment transaction against an invoice.
```json
{
  "invoiceId": "1511ecd4-ba10-4fc6-858f-bf3f4651baaf",
  "mode": "CARD",
  "amount": 49050,
  "transactionId": "TXN-2026-001",
  "orderId": "ORDER-2026-001",
  "transactionDate": "2026-03-26",
  "status": "SUCCESS",
  "remarks": "Payment successful",
  "paidBy": "Card",
  "receiptNumber": "REC-2026-001",
  "paidAt": "2026-03-26"
}
```

Payload (`PUT /api/payments/:id`):
Purpose: Update payment status or related details.
```json
{
  "status": "REFUNDED",
  "remarks": "Partial refund processed"
}
```

Payload (`POST /api/payments/order`):
Purpose: Create a payment gateway order for invoice payment.
```json
{
  "invoiceId": "1511ecd4-ba10-4fc6-858f-bf3f4651baaf"
}
```

Payload (`POST /api/payments/verify`):
Purpose: Verify gateway signature and finalize payment capture workflow.
```json
{
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_ABC123",
  "razorpay_signature": "generated_signature"
}
```

Payload (`POST /api/payments/capture`):
Purpose: Capture an authorized gateway payment.
```json
{
  "paymentId": "pay_ABC123",
  "amount": 49050,
  "currency": "INR"
}
```

Payload (`POST /api/payments/:id/refund`):
Purpose: Initiate a refund for the specified payment.
```json
{
  "amount": 1000,
  "notes": {
    "reason": "Duplicate payment"
  }
}
```

## Hospital Admin and Hospital
Mounted at: `/api/admin` and `/api/hospitals`

- `POST /api/admin/signup`
- `POST /api/admin/verify-otp`
- `POST /api/admin/login`
- `PATCH /api/admin/link-doctor`
- `PATCH /api/admin/link-nurse`
- `PATCH /api/admin/link-lab-manager`
- `PATCH /api/admin/link-inventory-manager`
- `PATCH /api/admin/link-Receptionist`
- `GET /api/admin/view-requests`
- `POST /api/admin/create-request`
- `POST /api/hospitals/create-hospital`

Payload (`POST /api/admin/signup`):
Purpose: Register a hospital admin account and start OTP verification.
```json
{
  "email": "admin@hospital.com",
  "password": "Admin@123"
}
```

Payload (`POST /api/admin/verify-otp`):
Purpose: Verify OTP for hospital admin signup/login flow.
```json
{
  "otp": "123456"
}
```

Payload (`POST /api/admin/login`):
Purpose: Authenticate hospital admin with email/password.
```json
{
  "email": "admin@hospital.com",
  "password": "Admin@123"
}
```

Payload (`PATCH /api/admin/link-doctor`):
Purpose: Link a doctor to the authenticated admin's hospital.
```json
{
  "licenseNo": "LIC123456"
}
```

Payload (`PATCH /api/admin/link-nurse`):
Purpose: Attach a nurse to the authenticated admin's hospital.
```json
{
  "nurseId": "f0ce68e8-c8a9-4f16-84bd-0136b6dcc7df"
}
```

Payload (`PATCH /api/admin/link-lab-manager`):
Purpose: Attach a lab manager to the authenticated admin's hospital.
```json
{
  "labManagerId": "7c150f22-9ba4-4031-a4aa-cf4ff04c88e0"
}
```

Payload (`PATCH /api/admin/link-inventory-manager`):
Purpose: Attach an inventory manager to the authenticated admin's hospital.
```json
{
  "inventoryManagerId": "4756c3de-d43f-4b89-a5cf-f2a49bd8f76d"
}
```

Payload (`PATCH /api/admin/link-Receptionist`):
Purpose: Attach a receptionist to the authenticated admin's hospital.
```json
{
  "receptionistId": "4af38ff7-8237-4b54-bc3c-56dc1fd5f602"
}
```

Payload (`POST /api/admin/create-request`):
Purpose: Create a staff request to join/associate with a hospital.
```json
{
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889"
}
```

Payload (`POST /api/hospitals/create-hospital`):
Purpose: Create a hospital profile under the authenticated admin.
```json
{
  "name": "City Care Hospital",
  "address": "123 Main Road",
  "city": "Pune"
}
```

## Single-Action Role Modules
Mounted routes:

- `POST /api/nurses/create`
- `POST /api/inventory-managers/create`
- `POST /api/lab-managers/create`
- `POST /api/receptionists/create`
- `GET /api/lab-managers/lab-tests`
- `POST /api/lab-managers/lab-tests`
- `GET /api/lab-managers/lab-results`
- `POST /api/lab-managers/lab-results`

Payload (`POST /api/nurses/create`):
Purpose: Create a nurse profile for the authenticated user.
```json
{
  "department": "General Ward",
  "licenseNo": "NURSE-2026-001"
}
```

Payload (`POST /api/inventory-managers/create`):
Purpose: Create an inventory manager profile/assignment.
```json
{
  "userId": "9cf93081-2ac7-4d2b-b375-52a8bff76c8d",
  "hospitalId": "dcaaef09-0ebf-4ec7-b96f-6734f22f3889",
  "createdAt": "2026-03-26T12:00:00.000Z",
  "updatedAt": "2026-03-26T12:00:00.000Z"
}
```

Payload (`POST /api/lab-managers/create`):
Purpose: Create a lab manager profile for the authenticated user.
- No request body (uses authenticated `userId` from token).

Payload (`POST /api/receptionists/create`):
Purpose: Create a receptionist profile for the authenticated user.
- No request body (uses authenticated `userId` from token).

Payload (`POST /api/lab-managers/lab-tests`):
Purpose: Create a lab test master record.
```json
{
  "testName": "Hemoglobin",
  "unit": "g/dL",
  "normalRange": "13-17"
}
```

Payload (`POST /api/lab-managers/lab-results`):
Purpose: Record a lab test result for an encounter.
```json
{
  "encounterId": "2fd2f5fa-6bf5-4e57-9776-3d2f6f1f5253",
  "labTestId": "d0525df2-a2f6-4de4-9b9d-1bbf0aa292ef",
  "resultValue": "14.2",
  "isAbnormal": false
}
```

## WhatsApp (Public)
Mounted at: `/api/whatsapp`

- `POST /api/whatsapp/send`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`

Payload (`POST /api/whatsapp/send`):
Purpose: Send a WhatsApp outbound message via configured provider integration.
```json
{
  "to": "+919876543210",
  "bodyText": "Your appointment is tomorrow at 10:00 AM"
}
```

Payload (`POST /api/whatsapp/webhook`):
Purpose: Receive inbound WhatsApp events/messages from Meta webhook.
- Webhook payload from Meta/WhatsApp Cloud API (provider-defined schema).

## Mounted but Currently Empty
These prefixes are mounted in `src/server.js`, but route files currently expose no endpoints:

- `/api/analytics`
- `/api/summaries`
- `/api/video-instructions`

## Testing Notes for Current Project
- Primary script: `test/test.ps1`
- Command: `npm run test`
- Full OTP flow run: `$env:RUN_OTP_FLOW='true'; npm run test`
- Current server default port in code: `5000`
- For protected routes, include `Authorization: Bearer <token>`.
- Multipart routes (`/api/users/uploadProfile`, `/api/users/uploadVault`) require file upload payloads.

