Prescription Generation Flow:

- Doctor sees his Doctor Schedule of the day
- clicks on the patient using name or phone number or tokenNo
- EncounterId of that Schedule will be used to create the prescription
- then the doctor will see a form - with the existing data already filled(if old patient) else Doctor will fill on the spot the general details or the patient will be asked to pre fill the data in reception or online
- then the form will have a section to add medicine - which will have Serial No, Medicine DropBox, dosage, frequency, duration days - and a ADD MEDICINE button which on clicking will add the medicine to the prescription
- after adding, the doctor can edit or delete the medicine
- then similarly add more rows of medicine

- then a form with diagnosis text box, symptoms text box, allergies noted text box, severity - dropdown

- after pressing create prescription, the doctor will be able to update the already created prescription which was created when the doctor pressed the patient on schedule window
- diagnosis model row will also get created simultaneously when click create

Implementation Details:

API Endpoint: POST /prescriptions (Create)
Request Body:
{
  "encounterId": "uuid",
  "nextVisit": "2026-03-15",
  "generatedAt": "2026-02-27T10:00:00Z",
  "diagnosisText": "Patient has hypertension",
  "symptoms": "Headache, dizziness",
  "allergiesNoted": "Penicillin allergy",
  "severity": "MODERATE"
}

Response: Prescription with included medicines and encounter relations

API Endpoint: PUT /prescriptions/:id (Update)
Request Body: Same format as create (all fields optional)
- Updates prescription fields atomically with diagnosis
- If diagnosis exists, updates it; otherwise creates new diagnosis record
- Only creates diagnosis if at least one diagnosis field is provided
- Uses database transaction to ensure both updates complete or both rollback

API Endpoint: POST /prescriptions/:prescriptionId/medications (Add Medicine)
Request Body:
{
  "prescriptionId": "uuid",
  "medicineId": "uuid", 
  "dosage": "500mg",
  "frequency": "twice daily",
  "durationDays": 7
}

Response: Created PrescriptionMedicine record

API Endpoint: GET /prescriptions/:prescriptionId/medications (Get Medicines)
Response: Array of medicines added to prescription (empty array if none added yet)

API Endpoint: PUT /prescriptions/:prescriptionId/medications/:id (Update Medicine)
Request Body: { "dosage": "1000mg", "frequency": "once daily", "durationDays": 14 }

API Endpoint: DELETE /prescriptions/:prescriptionId/medications/:id (Remove Medicine)

Validation Rules:
- Prescription creation validates that encounter exists (404 if not found)
- Prescription creation prevents duplicates per encounter (409 if exists)
- Prescription update validates prescription exists (404 if not found)
- Prescription medicine routes properly extract prescriptionId from URL path
- No error thrown when prescription has no medicines yet (returns empty array)
- Diagnosis fields are optional; only created if at least one field has a value

Note: Prescription creation validates that a prescription doesn't already exist for the same encounter to prevent duplicates