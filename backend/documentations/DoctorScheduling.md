Working Flow:

Offline:
- Patient calls reception/goes to reception
- Receptionist - starts with scheduling of Doctor
- Asks for phone number - searches on the form (search through DB)
    - If exists - then auto fills the general data
    - else - receptionist asks the general data
- if user was new, then a new user(patient) is created
- else the encounter is scheduled under the existing patient

Online:
- Patient opens the app using MPIN or OTP(if first time) - if on app
    else using OTP if using website
- goes to schedule an appointment
- filters come - Hospital/Doctor/Specialization/Time - orders and groups accordingly
- patient selects the doctor - then is redirected to the doctor schedule
- doctor schedule consists of the timing slots - categorised as filled and unfilled
- after selecting the schedule - the patient will have to pay for the appointment through the app, or offline in the reception
- invoice will be generated for the encounter - and a payment will be generated in the payments

Common Case:
- after paying, the seat in that slot will be booked
- a token number will be auto-generated based on the doctor's appointment order for that day (not hospital-wide)
- **Token Generation Logic:** 
  - Query all encounters for this doctor on this date
  - Sort by scheduledTime (ascending)
  - tokenNo = total count for today + 1
  - Example: If doctor has 5 appointments already scheduled, new patient gets token 6
  - Next day resets: back to token 1
- the app/website dashboard will show the live encounter - which token number is inside and who is missed and all stuff
- if a token number misses its appointment the next token will be asked to enter, if the missed token comes again later on, then the patient will have to wait till a slot with empty booking is reached(after 4 slots, cause 4 slots will then be moved forward), then the patient will be given a new updated token on visit

---

## Encounter Routes (Doctor Schedule Cascades)

**Base URL**: `/api/encounters`

#### 1. Create Appointment (Schedule + Encounter)
```
POST /api/encounters
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "scheduledTime": "2026-02-25T10:00:00Z",
  "duration": 15,
  "status": "SCHEDULED",
  "visitType": "OPD",
  "reason": "Regular checkup"
}

Response: 201 Created
{
  "encounterId": "encounter-uuid",
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "scheduledTime": "2026-02-25T10:00:00Z",
  "duration": 15,
  "status": "SCHEDULED",
  "visitType": "OPD",
  "reason": "Regular checkup",
  "createdAt": "2026-02-25T09:00:00Z"
}
```
**Frontend Usage (Receptionist/Patient)**:
```javascript
// After patient selection and payment confirmation
const response = await fetch('/api/encounters', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    doctorId: selectedDoctor.doctorId,
    patientId: patientData.patientId,
    hospitalId: patientData.hospitalId,
    scheduledTime: selectedSlot.time,
    duration: 15,
    status: 'SCHEDULED',
    visitType: 'OPD',
    reason: patientComplaint
  })
});
const encounter = await response.json();
// Auto generates token and doctor schedule behind the scenes
```

#### 2. Get Available Slots (List Encounters for Doctor)
```
GET /api/encounters?doctorId=<doctor-uuid>&status=SCHEDULED
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "encounterId": "encounter-uuid-1",
    "scheduledTime": "2026-02-25T10:00:00Z",
    "duration": 15,
    "patientId": "patient-uuid-1",
    "status": "SCHEDULED",
    "visitType": "OPD"
  },
  {
    "encounterId": "encounter-uuid-2",
    "scheduledTime": "2026-02-25T10:15:00Z",
    "duration": 15,
    "patientId": null,  // Available slot
    "status": "SCHEDULED",
    "visitType": "OPD"
  }
]
```
**Frontend Usage (Doctor/Nurse to view schedule)**:
```javascript
// Get today's schedule for a doctor
const response = await fetch(`/api/encounters?doctorId=${doctorId}&status=SCHEDULED`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const schedule = await response.json();
// Display slots with patient details and available slots
```

#### 3. Update Encounter (Reschedule)
```
PUT /api/encounters/:encounterId
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "scheduledTime": "2026-02-25T11:00:00Z",
  "duration": 15
}

Response: 200 OK
{
  "encounterId": "encounter-uuid",
  "scheduledTime": "2026-02-25T11:00:00Z",
  "duration": 15,
  "updatedAt": "2026-02-25T09:30:00Z"
}
```
**Frontend Usage (Receptionist reschedule)**:
```javascript
// Reschedule appointment to new time
const response = await fetch(`/api/encounters/${encounterId}`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    scheduledTime: newSlot.time,
    duration: 15
  })
});
const updated = await response.json();
// Doctor schedule automatically updated
```

#### 4. Cancel Appointment (Delete Encounter)
```
DELETE /api/encounters/:encounterId
Authorization: Bearer <token>

Response: 204 No Content
```
**Frontend Usage (Cancel button)**:
```javascript
const response = await fetch(`/api/encounters/${encounterId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
// Doctor schedule automatically deleted when encounter deleted
// Refund automatically generated if payment was successful
```

#### 5. Get Encounter Details
```
GET /api/encounters/:encounterId
Authorization: Bearer <token>

Response: 200 OK
{
  "encounterId": "encounter-uuid",
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "scheduledTime": "2026-02-25T10:00:00Z",
  "duration": 15,
  "status": "SCHEDULED",
  "visitType": "OPD",
  "reason": "Regular checkup",
  "createdAt": "2026-02-25T09:00:00Z"
}
```

---

## Implementation Details

### Bidirectional Sync (Doctor Schedule & Encounter)

**Create Encounter → Auto-create DoctorSchedule**
- When patient books slot → Encounter created
- DoctorSchedule auto-created with same `encounterId`, `patientId`, `scheduledTime`
- One slot = One patient (15 minutes each)

**Update Encounter → Update DoctorSchedule**
- Change appointment time → Doctor schedule time updated
- Change patient/doctor → Doctor schedule updated

**Delete Encounter → Delete DoctorSchedule**
- Cancel appointment → Doctor schedule deleted automatically
- Slot becomes available for next patient

### Schema
```
Encounter
├── encounterId (PK)
├── doctorId (FK)
├── patientId (FK)
├── hospitalId (FK)
├── scheduledTime (DateTime)
├── duration (Int) - default 15 mins
├── status (SCHEDULED, COMPLETED, CANCELLED)
└── ...

DoctorSchedule
├── scheduleId (PK)
├── encounterId (FK) - Links to Encounter
├── doctorId (FK)
├── patientId (FK)
├── hospitalId (FK)
├── scheduledTime (DateTime)
├── slotDuration (Int) - 15 mins
├── isBooked (Boolean)
└── ...
```

### Slot Booking Flow

1. **Receptionist/Patient selects slot** → Views available encounters (with null patientId)
2. **POST /api/encounters** → Creates encounter + auto-creates doctor schedule + generates token
3. **Token Generation Logic:**
   - Gets all encounters for this doctor for this date (sorted by time)
   - Assigns sequential token: tokenNo = count + 1
   - So if doctor already has 5 appointments, next patient gets token 6
   - Tokens reset daily per doctor
4. **isBooked flag set to true** → Slot now occupied, no longer available
5. **Invoice auto-generated** → Contains encounter details and consultation fee with 10% tax
6. **Payment Flow** → See [PaymentFlow.md](PaymentFlow.md) for complete payment, verification, and refund workflows
7. **Patient Confirmation** → After successful payment, appointment shows in app with token number
7. **Patient notified** → Via app/SMS with appointment details and token number
8. **Cancellation & Refund** → DELETE /api/encounters → Auto-creates refund record (see PaymentFlow.md)