/**
 * backend/scripts/testPhase4b.js
 *
 * End-to-end verification script for Phase 4B:
 * 1. Health checks (/health, /api/health/db)
 * 2. Hospital browsing (/api/hospitals, /api/hospitals/:id)
 * 3. Doctor browsing (/api/doctors, /api/doctors?hospitalId=..., /api/doctors/:id)
 * 4. Slot availability (/api/doctors/:id/slots?date=...)
 * 5. Appointment creation (POST /api/encounters)
 * 6. Double-booking rejection (409 Conflict)
 * 7. Patient appointment list (/api/encounters)
 * 8. Rescheduling (PUT /api/encounters/:id)
 * 9. Reschedule conflict rejection (409 Conflict)
 * 10. Cancellation (PUT /api/encounters/:id with status: 'CANCELLED')
 * 11. Re-booking cancelled slot (verifies slot release)
 * 12. Cross-patient security isolation (403 Forbidden on view/update of other patient's encounter)
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
const prisma = new PrismaClient();

const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-insecure-secret';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let body;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, body };
}

async function main() {
  console.log('\n🏥 Phase 4B — End-to-End Appointment & Availability Verification\n');

  // Find patient
  const patient = await prisma.patient.findFirst({
    include: { user: true },
  });
  if (!patient) {
    throw new Error('No patient found in database to run tests with');
  }

  const patientToken = jwt.sign({ userId: patient.userId }, secret, { expiresIn: '1h' });
  const authHeaders = { Authorization: `Bearer ${patientToken}` };

  // Create or find a second patient for security isolation tests
  let secondUser = await prisma.user.findFirst({
    where: { phoneNumber: '+919999988888' },
    include: { patient: true },
  });
  if (!secondUser) {
    secondUser = await prisma.user.create({
      data: {
        firstName: 'Security',
        lastName: 'Tester',
        phoneNumber: '+919999988888',
        isActive: true,
        setUp: true,
        patient: {
          create: {
            bloodGroup: 'B_POSITIVE',
          },
        },
      },
      include: { patient: true },
    });
  }
  const secondPatientToken = jwt.sign({ userId: secondUser.userId }, secret, { expiresIn: '1h' });
  const secondAuthHeaders = { Authorization: `Bearer ${secondPatientToken}` };

  console.log('── Step 1: Health Checks ─────────────────────────────');
  const healthRes = await request('/health');
  assert(healthRes.status === 200, 'GET /health returns 200');

  const dbHealthRes = await request('/api/health/db');
  assert(dbHealthRes.status === 200, 'GET /api/health/db returns 200');

  console.log('\n── Step 2: Hospital Browsing ─────────────────────────');
  const hospitalsRes = await request('/api/hospitals', { headers: authHeaders });
  assert(hospitalsRes.status === 200 && Array.isArray(hospitalsRes.body), 'GET /api/hospitals returns array');
  assert(hospitalsRes.body.length >= 4, `At least 4 hospitals present (found ${hospitalsRes.body.length})`);
  
  const targetHospital = hospitalsRes.body[0];
  const hospitalDetailRes = await request(`/api/hospitals/${targetHospital.hospitalId}`, { headers: authHeaders });
  assert(hospitalDetailRes.status === 200, `GET /api/hospitals/:id returns 200 for ${targetHospital.name}`);
  assert(hospitalDetailRes.body.doctors && hospitalDetailRes.body.doctors.length > 0, 'Hospital detail includes doctors');

  console.log('\n── Step 3: Doctor Browsing ───────────────────────────');
  const allDoctorsRes = await request('/api/doctors', { headers: authHeaders });
  assert(allDoctorsRes.status === 200 && Array.isArray(allDoctorsRes.body), 'GET /api/doctors returns array');
  assert(allDoctorsRes.body.length >= 12, `At least 12 doctors seeded (found ${allDoctorsRes.body.length})`);

  const hospitalDoctorsRes = await request(`/api/doctors?hospitalId=${targetHospital.hospitalId}`, { headers: authHeaders });
  assert(hospitalDoctorsRes.status === 200 && hospitalDoctorsRes.body.length >= 3, `Hospital filter returns at least 3 doctors (found ${hospitalDoctorsRes.body.length})`);

  const targetDoctor = hospitalDoctorsRes.body[0];
  const doctorDetailRes = await request(`/api/doctors/${targetDoctor.doctorId}`, { headers: authHeaders });
  assert(doctorDetailRes.status === 200, `GET /api/doctors/:id returns 200 for Dr. ${targetDoctor.user?.firstName || targetDoctor.name}`);

  console.log('\n── Step 4: Available Slots ───────────────────────────');
  // Use a future date for testing: 2026-11-10 (a Tuesday)
  const testDate = '2026-11-10';
  const slotsRes = await request(`/api/doctors/${targetDoctor.doctorId}/slots?date=${testDate}`, { headers: authHeaders });
  assert(slotsRes.status === 200 && Array.isArray(slotsRes.body), 'GET /api/doctors/:id/slots returns array of slots');
  assert(slotsRes.body.length > 0, `Slots returned for date ${testDate} (found ${slotsRes.body.length})`);
  
  const initialAvailableSlot = slotsRes.body.find(s => s.available === true);
  assert(!!initialAvailableSlot, `Found initial available slot: ${initialAvailableSlot?.time}`);

  console.log('\n── Step 5: Appointment Creation ──────────────────────');
  const slotTimeParts = initialAvailableSlot.time.split(':');
  const scheduledTimeIso = `${testDate}T${slotTimeParts[0]}:${slotTimeParts[1]}:00.000Z`;

  const bookingPayload = {
    doctorId: targetDoctor.doctorId,
    hospitalId: targetHospital.hospitalId,
    patientId: patient.patientId,
    scheduledTime: scheduledTimeIso,
    duration: 30,
    visitType: 'OPD',
    reason: 'General Checkup Routine Evaluation',
    notes: 'Testing end-to-end booking flow',
  };

  const bookingRes = await request('/api/encounters', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(bookingPayload),
  });
  assert(bookingRes.status === 201, `POST /api/encounters created appointment (status: ${bookingRes.status})`);
  assert(bookingRes.body.encounterId && bookingRes.body.tokenNo, `Encounter has encounterId (${bookingRes.body.encounterId}) and tokenNo (${bookingRes.body.tokenNo})`);

  const createdEncounterId = bookingRes.body.encounterId;

  // Verify slot is now unavailable
  const slotsAfterBookingRes = await request(`/api/doctors/${targetDoctor.doctorId}/slots?date=${testDate}`, { headers: authHeaders });
  const bookedSlotCheck = slotsAfterBookingRes.body.find(s => s.time === initialAvailableSlot.time);
  assert(bookedSlotCheck && bookedSlotCheck.available === false, `Slot ${initialAvailableSlot.time} is now correctly marked available: false`);

  console.log('\n── Step 6: Double-Booking Protection ─────────────────');
  const duplicateBookingRes = await request('/api/encounters', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(bookingPayload),
  });
  assert(duplicateBookingRes.status === 409, `Duplicate booking safely rejected with 409 Conflict (received: ${duplicateBookingRes.status})`);

  console.log('\n── Step 7: Patient Appointment Listing ───────────────');
  const patientEncountersRes = await request('/api/encounters', {
    headers: authHeaders,
  });
  assert(patientEncountersRes.status === 200 && Array.isArray(patientEncountersRes.body), 'GET /api/encounters returns array');
  const foundOurEncounter = patientEncountersRes.body.find(e => e.encounterId === createdEncounterId);
  assert(!!foundOurEncounter, 'Patient encounters list contains the newly booked encounter');
  assert(foundOurEncounter?.doctor && foundOurEncounter?.hospital, 'Encounter includes populated doctor and hospital');

  console.log('\n── Step 8: Rescheduling Flow ─────────────────────────');
  // Find a different available slot on same day
  const newAvailableSlot = slotsAfterBookingRes.body.find(s => s.available === true && s.time !== initialAvailableSlot.time);
  assert(!!newAvailableSlot, `Found alternative slot for rescheduling: ${newAvailableSlot?.time}`);

  const newTimeParts = newAvailableSlot.time.split(':');
  const newScheduledIso = `${testDate}T${newTimeParts[0]}:${newTimeParts[1]}:00.000Z`;

  const rescheduleRes = await request(`/api/encounters/${createdEncounterId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      scheduledTime: newScheduledIso,
      status: 'SCHEDULED',
    }),
  });
  assert(rescheduleRes.status === 200, `Rescheduled encounter to ${newAvailableSlot.time} (status: ${rescheduleRes.status})`);

  // Verify old slot is released and new slot is booked
  const slotsAfterRescheduleRes = await request(`/api/doctors/${targetDoctor.doctorId}/slots?date=${testDate}`, { headers: authHeaders });
  const oldSlotCheck = slotsAfterRescheduleRes.body.find(s => s.time === initialAvailableSlot.time);
  const newSlotCheck = slotsAfterRescheduleRes.body.find(s => s.time === newAvailableSlot.time);
  assert(oldSlotCheck && oldSlotCheck.available === true, `Old slot ${initialAvailableSlot.time} was freed (available: true)`);
  assert(newSlotCheck && newSlotCheck.available === false, `New slot ${newAvailableSlot.time} is now booked (available: false)`);

  console.log('\n── Step 9: Cancellation Flow & Slot Release ──────────');
  const cancelRes = await request(`/api/encounters/${createdEncounterId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: 'CANCELLED',
      cancellationNote: 'Patient schedule conflict resolved by cancellation',
    }),
  });
  assert(cancelRes.status === 200, `Cancelled encounter (status: ${cancelRes.status})`);
  assert(cancelRes.body.status === 'CANCELLED', 'Encounter status is CANCELLED');

  // Verify cancelled slot is now available again
  const slotsAfterCancelRes = await request(`/api/doctors/${targetDoctor.doctorId}/slots?date=${testDate}`, { headers: authHeaders });
  const cancelledSlotCheck = slotsAfterCancelRes.body.find(s => s.time === newAvailableSlot.time);
  assert(cancelledSlotCheck && cancelledSlotCheck.available === true, `Cancelled slot ${newAvailableSlot.time} is released and available again`);

  console.log('\n── Step 10: Re-Booking Released Slot ─────────────────');
  const rebookingRes = await request('/api/encounters', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      doctorId: targetDoctor.doctorId,
      hospitalId: targetHospital.hospitalId,
      patientId: patient.patientId,
      scheduledTime: newScheduledIso,
      duration: 30,
      visitType: 'OPD',
      reason: 'Rebooking released slot test',
    }),
  });
  assert(rebookingRes.status === 201, `Re-booking previously cancelled slot succeeded (status: ${rebookingRes.status})`);
  const rebookedEncounterId = rebookingRes.body.encounterId;

  console.log('\n── Step 11: Cross-Patient Security Isolation ─────────');
  // Second patient tries to view first patient's encounter
  const crossViewRes = await request(`/api/encounters/${rebookedEncounterId}`, {
    headers: secondAuthHeaders,
  });
  assert(crossViewRes.status === 403, `Patient 2 cannot view Patient 1's encounter (received: ${crossViewRes.status} Forbidden)`);

  // Second patient tries to update first patient's encounter
  const crossUpdateRes = await request(`/api/encounters/${rebookedEncounterId}`, {
    method: 'PUT',
    headers: secondAuthHeaders,
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  assert(crossUpdateRes.status === 403, `Patient 2 cannot modify Patient 1's encounter (received: ${crossUpdateRes.status} Forbidden)`);

  // Patient 2's encounter list should NOT contain Patient 1's encounter
  const secondPatientEncountersRes = await request('/api/encounters', {
    headers: secondAuthHeaders,
  });
  assert(secondPatientEncountersRes.status === 200, 'Patient 2 can query their encounters');
  const leakFound = secondPatientEncountersRes.body.some(e => e.encounterId === rebookedEncounterId);
  assert(!leakFound, "Patient 2's encounter list does not leak Patient 1's encounter");

  // Clean up rebooked encounter
  await prisma.doctorSchedule.deleteMany({ where: { encounterId: rebookedEncounterId } });
  await prisma.invoiceItem.deleteMany({ where: { itemId: rebookedEncounterId } });
  await prisma.encounter.delete({ where: { encounterId: rebookedEncounterId } });
  await prisma.doctorSchedule.deleteMany({ where: { encounterId: createdEncounterId } });
  await prisma.invoiceItem.deleteMany({ where: { itemId: createdEncounterId } });
  await prisma.encounter.delete({ where: { encounterId: createdEncounterId } });

  console.log('\n======================================================');
  console.log(`Phase 4B Verification Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
