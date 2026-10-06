Flow:
- the receptionist will check after the doctor appointment ends, and if the doctor has any kind of prescribed lab tests then the receptionist will then book a lab test
- if the type of lab is present under the hospital, then the lab scheduling of the hospital will take place - and the patient will either be able to book a slot for lab test using the app/website by logging in, or the receptionist will ask for the time the patient wants the test in
- if that lab is not present under the hospital, and a 3rd party lab which is integrated under the hospital or clinic, then the data(prescriptions) will be sent to that lab and that lab will be able to book slot accordingly
- if there is no 3rd party lab - then the receptionist can just ask the patient to book a lab appointment by themselves

---

Backend Mapping (Current Implementation):

- Lab discovery and scheduling is under `/api/labs`.
- Lab manager operational routes (lab test and lab result creation/updates) are under `/api/lab-managers`.
- This separation keeps scheduling/user-facing flow separate from manager execution flow.

Scheduling APIs:

- `POST /api/labs/schedules` - create slot or directly book slot.
- `GET /api/labs/schedules` - list schedules with filters (`labId`, `patientId`, `date`, `slotTime`, `isBooked`).
- `GET /api/labs/schedules/:id` - get one schedule slot.
- `PUT /api/labs/schedules/:id` - modify slot metadata/booking info.
- `DELETE /api/labs/schedules/:id` - remove schedule slot.

Lab APIs (supporting scheduling context):

- `POST /api/labs` - create lab (admin/receptionist side).
- `GET /api/labs` - list labs for patient/receptionist/doctor visibility.
- `GET /api/labs/:id` - lab details.
- `PUT /api/labs/:id` - update lab metadata.
- `DELETE /api/labs/:id` - remove lab.

---

Critical Error Corrections Added:

- Route precedence fix: `/api/labs/schedules` was previously at risk of matching `/:id` first in Express.
- Current order now keeps `/schedules` routes before `/:id` in lab routing to prevent incorrect handler capture.

---

Logical Changes Recommended for Better Flow Safety:

- Add explicit booking state transition rules:
	- `isBooked=false -> true` requires `patientId`.
	- `isBooked=true -> false` should clear `patientId` (or reject unless explicitly unassigned).
- Link schedules to source encounter/prescription to maintain traceability of why test is booked.
- Prevent updates/deletes for past slots unless role is admin and reason is logged.
- Normalize `date` handling (timezone-safe date boundary) so duplicate-slot checks are deterministic.
- Validate lab capacity at booking time using `availableSlots` and `bookedSlots` (atomic update).
- Add cancellation reason and audit metadata for schedule changes.

---

3rd Party Lab Integration - Suggested Flow Extension:

- Add `sourceType` + `sourceRefId` in schedule payload to distinguish:
	- hospital lab booking
	- external integrated lab booking
- For external labs:
	- mark slot with `externalProviderId` and `externalBookingId`.
	- store sync status (`PENDING`, `SENT`, `CONFIRMED`, `FAILED`).
- If no integrated lab exists, create a non-booked advisory record or notification instead of losing context.

---

Role Flow Clarification:

- Patient: view and book available slots.
- Receptionist: create slots + book on behalf of patient.
- Doctor/Nurse: view schedules.
- Hospital Admin/Super Admin: full control (create/update/delete).
- Lab Manager: test/result execution routes, not core scheduling creation flow.

---

Implemented Hardening Changes (Now in Code):

- date normalization is now applied for schedule operations (`date` is normalized to UTC day boundary).
- duplicate slot check now uses normalized date + slotTime + labId consistently.
- strict booking state rules are enforced:
	- booked slot requires patientId.
	- unbooking clears patientId.
- booking and unbooking now update lab counters in transaction:
	- `availableSlots` decrement/increment
	- `bookedSlots` increment/decrement
- past slot mutation guard is now active:
	- non-admin roles cannot update/delete past slots.
	- admin override is allowed and can carry reason metadata (`changeReason` / `reason`).
- route precedence issue is fixed (`/schedules` routes are evaluated before `/:id`).
- lab test/result controllers now use the shared db client import (`config/db.js`) to avoid runtime import failure.

---

Critical Errors Found and Addressed:

- central error middleware was returning 500 for business errors; now it returns actual status code from AppError and handles validation errors with 400.

---

Logical/Schema Limitations Still Pending (Needs Schema Extension):

- source traceability is not yet persisted in LabSchedule (example: `sourceType`, `sourceRefId`, `externalProviderId`, `externalBookingId`, `syncStatus`).
- cancellation reason and audit actor are only logged at runtime right now; not stored in LabSchedule row.
- third-party lab confirmation lifecycle (PENDING/SENT/CONFIRMED/FAILED) is not yet modeled in schema.

Suggested schema extension for next phase:

- add fields to `LabSchedule`:
	- `sourceType` (PRESCRIPTION/ENCOUNTER/MANUAL)
	- `sourceRefId`
	- `externalProviderId`
	- `externalBookingId`
	- `syncStatus`
	- `changeReason`
	- `updatedBy`

---

Update (Implemented in Backend Now):

- `LabSchedule` flow has been extended at service/validator/repo level with metadata handling:
	- `sourceType`
	- `sourceRefId`
	- `externalProviderId`
	- `externalBookingId`
	- `syncStatus`
	- `changeReason`
	- `updatedBy`
- default behavior:
	- if `sourceType=EXTERNAL`, default `syncStatus=PENDING`.
	- for non-external schedules, default `syncStatus=NOT_REQUIRED`.
- rule enforcement:
	- non-manual source requires `sourceRefId`.
	- external source requires `externalProviderId`.
	- non-external source cannot carry `externalProviderId`.

Query Support Added:

- `GET /api/labs/schedules` now also supports:
	- `sourceType`
	- `sourceRefId`
	- `externalProviderId`
	- `syncStatus`

---

Critical Note (Deployment Order):

- these metadata fields require Prisma migration + client regeneration before production usage.
- safe order:
	1. apply schema migration
	2. run prisma generate
	3. deploy API

---

Final Reconciliation Note:

- the earlier section `Logical/Schema Limitations Still Pending` is now partially outdated after implementation.
- implemented now in backend + schema:
	- `sourceType`
	- `sourceRefId`
	- `externalProviderId`
	- `externalBookingId`
	- `syncStatus`
	- `changeReason`
	- `updatedBy`
- remaining work is operational rollout only:
	- apply migration on target environments
	- verify third-party provider callbacks for external booking lifecycle