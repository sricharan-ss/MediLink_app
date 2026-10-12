import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret_here';

function getAuthHeader(userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '2h' });
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('           STARTING PHASE 5 VALIDATION SUITE        ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Fetch Doctor 1, Doctor 2, Patient 1, Patient 2
  const doctor1 = await prisma.doctor.findFirst({
    where: { user: { phoneNumber: '+919000000101' } },
    include: { user: true, hospitals: true }
  });
  const doctor2 = await prisma.doctor.findFirst({
    where: { user: { phoneNumber: '+919000000102' } },
    include: { user: true, hospitals: true }
  });

  const patient1 = await prisma.patient.findFirst({
    where: { user: { phoneNumber: '+919361023556' } },
    include: { user: true }
  });

  // Find or create a second patient for privacy testing
  let patient2 = await prisma.patient.findFirst({
    where: { NOT: { patientId: patient1.patientId } },
    include: { user: true }
  });
  if (!patient2) {
    const user2 = await prisma.user.create({
      data: {
        firstName: 'Privacy',
        lastName: 'Tester',
        phoneNumber: '+919888877777',
      }
    });
    patient2 = await prisma.patient.create({
      data: {
        userId: user2.userId,
        age: 30,
        gender: 'OTHER'
      },
      include: { user: true }
    });
  }

  const medicine = await prisma.medicine.findFirst({
    where: { isDiscontinued: false }
  });

  if (!doctor1 || !doctor2 || !patient1 || !medicine) {
    console.error('Missing seed data for doctors, patients, or medicines.');
    process.exit(1);
  }

  const hospitalId = doctor1.hospitals[0]?.hospitalId || (await prisma.hospital.findFirst()).hospitalId;
  const doc1Headers = getAuthHeader(doctor1.userId);
  const doc2Headers = getAuthHeader(doctor2.userId);
  const pat1Headers = getAuthHeader(patient1.userId);
  const pat2Headers = getAuthHeader(patient2.userId);

  console.log(`Testing with Doctor 1: Dr. ${doctor1.user.firstName} ${doctor1.user.lastName} (${doctor1.doctorId})`);
  console.log(`Testing with Doctor 2: Dr. ${doctor2.user.firstName} ${doctor2.user.lastName} (${doctor2.doctorId})`);
  console.log(`Testing with Patient 1: ${patient1.user.firstName} (${patient1.patientId})`);
  console.log(`Testing with Medicine: ${medicine.name} (${medicine.medicineId})\n`);

  // Create an encounter assigned to Doctor 1
  const enc1Res = await fetch(`${BASE_URL}/encounters`, {
    method: 'POST',
    headers: pat1Headers,
    body: JSON.stringify({
      patientId: patient1.patientId,
      doctorId: doctor1.doctorId,
      hospitalId: hospitalId,
      scheduledTime: new Date(Date.now() + 86400000 * 5).toISOString(),
      visitType: 'OPD',
      reason: 'Chest tightness and shortness of breath'
    })
  });
  const encounter1 = await enc1Res.json();
  assert(enc1Res.status === 201 && encounter1.encounterId, 'Setup: Created encounter for Doctor 1');

  // Create an encounter assigned to Doctor 2
  const enc2Res = await fetch(`${BASE_URL}/encounters`, {
    method: 'POST',
    headers: pat1Headers,
    body: JSON.stringify({
      patientId: patient1.patientId,
      doctorId: doctor2.doctorId,
      hospitalId: hospitalId,
      scheduledTime: new Date(Date.now() + 86400000 * 6).toISOString(),
      visitType: 'OPD',
      reason: 'Frequent migraines'
    })
  });
  const encounter2 = await enc2Res.json();
  assert(enc2Res.status === 201 && encounter2.encounterId, 'Setup: Created encounter for Doctor 2');

  // TEST 1: Doctor can view their own appointments
  const doc1ListRes = await fetch(`${BASE_URL}/encounters`, {
    headers: doc1Headers
  });
  const doc1List = await doc1ListRes.json();
  const containsOwn = Array.isArray(doc1List) && doc1List.some(e => e.encounterId === encounter1.encounterId);
  assert(doc1ListRes.status === 200 && containsOwn, 'Test 1: Doctor 1 can view their assigned appointment');

  // TEST 2: Doctor cannot view another doctor's appointments
  const containsOther = Array.isArray(doc1List) && doc1List.some(e => e.encounterId === encounter2.encounterId);
  assert(!containsOther, 'Test 2a: Doctor 1 appointment list excludes Doctor 2 appointments');

  const doc1ViewDoc2Res = await fetch(`${BASE_URL}/encounters/${encounter2.encounterId}`, {
    headers: doc1Headers
  });
  assert(doc1ViewDoc2Res.status === 403, 'Test 2b: Doctor 1 direct GET of Doctor 2 encounter returns 403 Forbidden');

  // TEST 3: Doctor cannot modify another doctor's encounter
  const doc1ModDoc2Res = await fetch(`${BASE_URL}/encounters/${encounter2.encounterId}`, {
    method: 'PUT',
    headers: doc1Headers,
    body: JSON.stringify({
      status: 'IN_PROGRESS'
    })
  });
  assert(doc1ModDoc2Res.status === 403, 'Test 3: Doctor 1 PUT to modify Doctor 2 encounter returns 403 Forbidden');

  // TEST 4: Doctor can start and complete an assigned consultation
  // 4a. Start consultation -> IN_PROGRESS
  const startRes = await fetch(`${BASE_URL}/encounters/${encounter1.encounterId}`, {
    method: 'PUT',
    headers: doc1Headers,
    body: JSON.stringify({
      status: 'IN_PROGRESS'
    })
  });
  const startedEnc = await startRes.json();
  assert(
    startRes.status === 200 && startedEnc.status === 'IN_PROGRESS' && startedEnc.actualStartTime,
    'Test 4a: Doctor 1 starts consultation -> status IN_PROGRESS with actualStartTime recorded'
  );

  // 4b. Record diagnosis, notes, outcome, followUpDate
  const followUp = new Date(Date.now() + 86400000 * 14).toISOString();
  const notesRes = await fetch(`${BASE_URL}/encounters/${encounter1.encounterId}`, {
    method: 'PUT',
    headers: doc1Headers,
    body: JSON.stringify({
      diagnosis: 'Mild Angina Pectoris',
      notes: 'ECG normal, patient advised moderate exercise and low sodium diet.',
      outcome: 'Prescribed nitrate medication, review after two weeks.',
      followUpDate: followUp
    })
  });
  const notedEnc = await notesRes.json();
  assert(
    notesRes.status === 200 &&
    notedEnc.diagnosis === 'Mild Angina Pectoris' &&
    notedEnc.notes?.includes('low sodium diet') &&
    notedEnc.followUpDate,
    'Test 4b: Doctor 1 records clinical diagnosis, notes, outcome, and followUpDate'
  );

  // 4c. Complete consultation -> COMPLETED
  const completeRes = await fetch(`${BASE_URL}/encounters/${encounter1.encounterId}`, {
    method: 'PUT',
    headers: doc1Headers,
    body: JSON.stringify({
      status: 'COMPLETED'
    })
  });
  const completedEnc = await completeRes.json();
  assert(
    completeRes.status === 200 && completedEnc.status === 'COMPLETED' && completedEnc.actualEndTime,
    'Test 4c: Doctor 1 completes consultation -> status COMPLETED with actualEndTime recorded'
  );

  // TEST 5: Invalid status transitions are rejected
  // Cannot transition from COMPLETED back to SCHEDULED or IN_PROGRESS
  const invalidTransitionRes = await fetch(`${BASE_URL}/encounters/${encounter1.encounterId}`, {
    method: 'PUT',
    headers: doc1Headers,
    body: JSON.stringify({
      status: 'IN_PROGRESS'
    })
  });
  assert(
    invalidTransitionRes.status === 400,
    'Test 5: Re-opening completed consultation is rejected with 400 Bad Request'
  );

  // TEST 6: Prescription creation validates encounter ownership
  // 6a. Doctor 1 cannot create prescription for Doctor 2's encounter
  const crossDocPresRes = await fetch(`${BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: doc1Headers,
    body: JSON.stringify({
      encounterId: encounter2.encounterId,
      diagnosisText: 'Migraine with Aura',
      medicines: [{
        medicineId: medicine.medicineId,
        dosage: '10mg',
        frequency: 'Once daily at bedtime',
        durationDays: 10
      }]
    })
  });
  assert(
    crossDocPresRes.status === 403,
    'Test 6a: Doctor 1 creating prescription for Doctor 2 encounter returns 403 Forbidden'
  );

  // 6b. Doctor 1 CAN create prescription for their own encounter
  const doc1PresRes = await fetch(`${BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: doc1Headers,
    body: JSON.stringify({
      encounterId: encounter1.encounterId,
      diagnosisText: 'Mild Angina Pectoris',
      symptoms: 'Substernal chest tightness',
      severity: 'MILD',
      nextVisit: followUp,
      medicines: [{
        medicineId: medicine.medicineId,
        dosage: '5mg',
        frequency: 'Once daily morning',
        durationDays: 14
      }]
    })
  });
  const doc1Pres = await doc1PresRes.json();
  assert(
    doc1PresRes.status === 201 && doc1Pres.prescriptionId && doc1Pres.medicines?.length === 1,
    'Test 6b: Doctor 1 creates prescription with inline medicines for own encounter'
  );

  // 6c. Duplicate prescription for same encounter is rejected
  const dupPresRes = await fetch(`${BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: doc1Headers,
    body: JSON.stringify({
      encounterId: encounter1.encounterId,
      diagnosisText: 'Duplicate Attempt'
    })
  });
  assert(
    dupPresRes.status === 409,
    'Test 6c: Duplicate prescription creation for same encounter returns 409 Conflict'
  );

  // TEST 7: Patient prescription privacy remains enforced
  // 7a. Patient 1 can view their own prescription
  const pat1PresRes = await fetch(`${BASE_URL}/prescriptions/${doc1Pres.prescriptionId}`, {
    headers: pat1Headers
  });
  assert(
    pat1PresRes.status === 200,
    'Test 7a: Patient 1 can view their own prescription'
  );

  // 7b. Patient 2 cannot view Patient 1's prescription
  const pat2PresRes = await fetch(`${BASE_URL}/prescriptions/${doc1Pres.prescriptionId}`, {
    headers: pat2Headers
  });
  assert(
    pat2PresRes.status === 403,
    'Test 7b: Unrelated Patient 2 viewing Patient 1 prescription returns 403 Forbidden'
  );

  // 7c. Patient cannot call doctor-only clinical routes (e.g. creating prescriptions or clinical encounter updates)
  const patCreatePresRes = await fetch(`${BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: pat1Headers,
    body: JSON.stringify({
      encounterId: encounter2.encounterId,
      diagnosisText: 'Patient self-diagnosis'
    })
  });
  assert(
    patCreatePresRes.status === 403,
    'Test 7c: Patient attempting to create prescription returns 403 Forbidden'
  );

  // TEST 8: Existing patient appointment booking, cancellation, and rescheduling still work
  // 8a. Booking
  const patBookRes = await fetch(`${BASE_URL}/encounters`, {
    method: 'POST',
    headers: pat1Headers,
    body: JSON.stringify({
      patientId: patient1.patientId,
      doctorId: doctor1.doctorId,
      hospitalId: hospitalId,
      scheduledTime: new Date(Date.now() + 86400000 * 10).toISOString(),
      visitType: 'OPD',
      reason: 'Routine check-up'
    })
  });
  const patBookedEnc = await patBookRes.json();
  assert(
    patBookRes.status === 201 && patBookedEnc.encounterId,
    'Test 8a: Patient appointment booking continues to work'
  );

  // 8b. Rescheduling
  const newDate = new Date(Date.now() + 86400000 * 11).toISOString();
  const patRescheduleRes = await fetch(`${BASE_URL}/encounters/${patBookedEnc.encounterId}`, {
    method: 'PUT',
    headers: pat1Headers,
    body: JSON.stringify({
      scheduledTime: newDate
    })
  });
  const patRescheduledEnc = await patRescheduleRes.json();
  assert(
    patRescheduleRes.status === 200 && new Date(patRescheduledEnc.scheduledTime).toISOString() === newDate,
    'Test 8b: Patient appointment rescheduling continues to work'
  );

  // 8c. Cancellation
  const patCancelRes = await fetch(`${BASE_URL}/encounters/${patBookedEnc.encounterId}`, {
    method: 'PUT',
    headers: pat1Headers,
    body: JSON.stringify({
      status: 'CANCELLED',
      cancellationNote: 'Travel plans changed'
    })
  });
  const patCancelledEnc = await patCancelRes.json();
  assert(
    patCancelRes.status === 200 && patCancelledEnc.status === 'CANCELLED',
    'Test 8c: Patient appointment cancellation continues to work'
  );

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during testing:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
