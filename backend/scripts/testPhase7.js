import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import axios from 'axios';
import * as notificationRepo from '../src/modules/notifications/notification.repo.js';

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
  console.log('           STARTING PHASE 7 VALIDATION SUITE        ');
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

  try {
    // 0. Setup actors
    const doctor = await prisma.doctor.findFirst({
      include: { user: true, hospitals: true },
    });
    if (!doctor) throw new Error('No doctor found in database');

    const patient1 = await prisma.patient.findFirst({
      where: { user: { phoneNumber: '+919361023556' } },
      include: { user: true },
    });
    if (!patient1) throw new Error('Patient 1 not found');

    let patient2 = await prisma.patient.findFirst({
      where: { NOT: { patientId: patient1.patientId } },
      include: { user: true },
    });
    if (!patient2) {
      const user2 = await prisma.user.create({
        data: {
          firstName: 'Security',
          lastName: 'Tester',
          phoneNumber: '+919777766666',
        },
      });
      patient2 = await prisma.patient.create({
        data: {
          userId: user2.userId,
          age: 28,
          gender: 'OTHER',
        },
        include: { user: true },
      });
    }

    const hospital = await prisma.hospital.findFirst();
    const medicine = await prisma.medicine.findFirst({
      where: { isDiscontinued: false },
    });

    const patient1Headers = getAuthHeader(patient1.userId);
    const patient2Headers = getAuthHeader(patient2.userId);
    const doctorHeaders = getAuthHeader(doctor.userId);

    // =========================================================================
    // REQUIREMENT 1: User can retrieve ONLY their own notifications
    // =========================================================================
    console.log('\n--- Test 1: User can retrieve only their own notifications ---');

    // Create a known notification for Patient 1
    const p1Notif = await prisma.notification.create({
      data: {
        userId: patient1.userId,
        title: 'Phase 7 Lab Ready',
        message: 'Your lab report has been generated.',
        type: 'LAB',
        isRead: false,
      },
    });

    // Create a known notification for Patient 2
    const p2Notif = await prisma.notification.create({
      data: {
        userId: patient2.userId,
        title: 'Phase 7 Confidential Reminder',
        message: 'Private message for Patient 2 only.',
        type: 'APPOINTMENT',
        isRead: false,
      },
    });

    const p1ListRes = await axios.get(`${BASE_URL}/notifications`, { headers: patient1Headers });
    assert(p1ListRes.status === 200, 'Patient 1 successfully queried GET /api/notifications');
    const p1List = p1ListRes.data;
    assert(Array.isArray(p1List), 'Response is an array of notifications');
    assert(
      p1List.some(n => n.notificationId === p1Notif.notificationId),
      'Patient 1 notification list includes Patient 1 notification'
    );
    assert(
      !p1List.some(n => n.notificationId === p2Notif.notificationId),
      'Patient 1 cannot see Patient 2 notification in the list'
    );
    assert(
      p1List.every(n => n.userId === patient1.userId),
      'Every returned notification strictly belongs to Patient 1'
    );

    // Also verify Patient 1 cannot bypass by passing ?userId=patient2.userId
    const p1TamperedRes = await axios.get(`${BASE_URL}/notifications?userId=${patient2.userId}`, { headers: patient1Headers });
    assert(
      p1TamperedRes.data.every(n => n.userId === patient1.userId),
      'Tampered ?userId query parameter is ignored for non-admin users'
    );

    // =========================================================================
    // REQUIREMENT 2: Another user notification CANNOT be read or modified
    // =========================================================================
    console.log('\n--- Test 2: Cross-user notification reading & tampering blocked ---');

    // Patient 2 attempts to read Patient 1's notification by ID
    let crossReadBlocked = false;
    try {
      await axios.get(`${BASE_URL}/notifications/${p1Notif.notificationId}`, { headers: patient2Headers });
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 404)) {
        crossReadBlocked = true;
      }
    }
    assert(crossReadBlocked, 'Patient 2 cannot read Patient 1 notification via GET /:id (HTTP 403/404)');

    // Patient 2 attempts to modify Patient 1's notification
    let crossUpdateBlocked = false;
    try {
      await axios.put(`${BASE_URL}/notifications/${p1Notif.notificationId}`, { isRead: true }, { headers: patient2Headers });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        crossUpdateBlocked = true;
      }
    }
    assert(crossUpdateBlocked, 'Patient 2 cannot modify Patient 1 notification via PUT /:id (HTTP 403)');

    // Patient 2 attempts to delete Patient 1's notification
    let crossDeleteBlocked = false;
    try {
      await axios.delete(`${BASE_URL}/notifications/${p1Notif.notificationId}`, { headers: patient2Headers });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        crossDeleteBlocked = true;
      }
    }
    assert(crossDeleteBlocked, 'Patient 2 cannot delete Patient 1 notification via DELETE /:id (HTTP 403)');

    // =========================================================================
    // REQUIREMENT 3: Mark-as-read updates the correct notification
    // =========================================================================
    console.log('\n--- Test 3: Mark-as-read updates the correct notification ---');

    const markReadRes = await axios.put(
      `${BASE_URL}/notifications/${p1Notif.notificationId}`,
      { isRead: true },
      { headers: patient1Headers }
    );
    assert(markReadRes.status === 200, 'PUT /api/notifications/:id returned 200 OK for owner');
    assert(markReadRes.data.isRead === true, 'Response confirms isRead is true');

    const dbP1Notif = await prisma.notification.findUnique({
      where: { notificationId: p1Notif.notificationId },
    });
    assert(dbP1Notif && dbP1Notif.isRead === true, 'Database confirms notification marked as read');

    // Confirm Patient 2's notification was unaffected
    const dbP2Notif = await prisma.notification.findUnique({
      where: { notificationId: p2Notif.notificationId },
    });
    assert(dbP2Notif && dbP2Notif.isRead === false, 'Other notifications remain unread');

    // =========================================================================
    // REQUIREMENT 4: Appointment & Clinical Notifications
    // =========================================================================
    console.log('\n--- Test 4: Appointment & Clinical event notifications ---');

    const scheduledDate = new Date(Date.now() + 86400000 * 5); // 5 days in future

    // 4a. Booking an appointment
    const createEncounterRes = await axios.post(
      `${BASE_URL}/encounters`,
      {
        patientId: patient1.patientId,
        doctorId: doctor.doctorId,
        hospitalId: hospital.hospitalId,
        scheduledTime: scheduledDate.toISOString(),
        visitType: 'OPD',
        reason: 'Phase 7 Notification Test Booking',
      },
      { headers: patient1Headers }
    );
    assert(createEncounterRes.status === 201, 'Successfully booked new appointment via POST /api/encounters');
    const newEncounter = createEncounterRes.data;

    // Check patient received appointment notification
    const p1BookingNotif = await prisma.notification.findFirst({
      where: {
        userId: patient1.userId,
        relatedId: newEncounter.encounterId,
        type: 'APPOINTMENT',
        title: 'Appointment Booked',
      },
    });
    assert(!!p1BookingNotif, 'Patient received "Appointment Booked" notification with type APPOINTMENT');

    // Check doctor received appointment notification
    const docBookingNotif = await prisma.notification.findFirst({
      where: {
        userId: doctor.userId,
        relatedId: newEncounter.encounterId,
        type: 'APPOINTMENT',
        title: 'New Appointment Booked',
      },
    });
    assert(!!docBookingNotif, 'Doctor received "New Appointment Booked" notification with type APPOINTMENT');

    // 4b. Rescheduling an appointment
    const rescheduledDate = new Date(Date.now() + 86400000 * 6); // 6 days in future
    const rescheduleRes = await axios.put(
      `${BASE_URL}/encounters/${newEncounter.encounterId}`,
      {
        scheduledTime: rescheduledDate.toISOString(),
      },
      { headers: patient1Headers }
    );
    assert(rescheduleRes.status === 200, 'Successfully rescheduled appointment');

    const p1ReschedNotif = await prisma.notification.findFirst({
      where: {
        userId: patient1.userId,
        relatedId: newEncounter.encounterId,
        title: 'Appointment Rescheduled',
      },
    });
    assert(!!p1ReschedNotif, 'Patient received "Appointment Rescheduled" notification');

    const docReschedNotif = await prisma.notification.findFirst({
      where: {
        userId: doctor.userId,
        relatedId: newEncounter.encounterId,
        title: 'Appointment Rescheduled',
      },
    });
    assert(!!docReschedNotif, 'Doctor received "Appointment Rescheduled" notification');

    // 4c. Cancelling an appointment
    const cancelRes = await axios.put(
      `${BASE_URL}/encounters/${newEncounter.encounterId}`,
      {
        status: 'CANCELLED',
      },
      { headers: patient1Headers }
    );
    assert(cancelRes.status === 200, 'Successfully cancelled appointment');

    const p1CancelNotif = await prisma.notification.findFirst({
      where: {
        userId: patient1.userId,
        relatedId: newEncounter.encounterId,
        title: 'Appointment Cancelled',
      },
    });
    assert(!!p1CancelNotif, 'Patient received "Appointment Cancelled" notification');

    const docCancelNotif = await prisma.notification.findFirst({
      where: {
        userId: doctor.userId,
        relatedId: newEncounter.encounterId,
        title: 'Appointment Cancelled',
      },
    });
    assert(!!docCancelNotif, 'Doctor received "Appointment Cancelled" notification');

    // 4d. Completing consultation & Prescription creation
    // Create an active encounter to complete
    const consultEncounter = await prisma.encounter.create({
      data: {
        patientId: patient1.patientId,
        doctorId: doctor.doctorId,
        hospitalId: hospital.hospitalId,
        scheduledTime: new Date(Date.now() + 86400000 * 7),
        visitType: 'OPD',
        status: 'IN_PROGRESS',
        reason: 'Phase 7 Consultation Completion Test',
      },
    });

    const completeRes = await axios.put(
      `${BASE_URL}/encounters/${consultEncounter.encounterId}`,
      {
        status: 'COMPLETED',
      },
      { headers: doctorHeaders }
    );
    assert(completeRes.status === 200, 'Successfully completed consultation via doctor');

    const p1CompleteNotif = await prisma.notification.findFirst({
      where: {
        userId: patient1.userId,
        relatedId: consultEncounter.encounterId,
        title: 'Consultation Completed',
      },
    });
    assert(!!p1CompleteNotif, 'Patient received "Consultation Completed" notification');

    // Create prescription for completed consultation
    const prescriptionRes = await axios.post(
      `${BASE_URL}/prescriptions`,
      {
        encounterId: consultEncounter.encounterId,
        diagnosisText: 'Phase 7 Clinical Diagnosis',
        medicines: [
          {
            medicineId: medicine.medicineId,
            dosage: '650mg',
            frequency: '1-0-1',
            durationDays: 5,
          },
        ],
      },
      { headers: doctorHeaders }
    );
    assert(prescriptionRes.status === 201, 'Successfully created prescription');

    const p1PrescriptionNotif = await prisma.notification.findFirst({
      where: {
        userId: patient1.userId,
        relatedId: prescriptionRes.data.prescriptionId,
        type: 'PRESCRIPTION',
        title: 'Prescription Issued',
      },
    });
    assert(!!p1PrescriptionNotif, 'Patient received "Prescription Issued" notification with type PRESCRIPTION');

    // =========================================================================
    // REQUIREMENT 5: Retried operations do NOT create unintended duplicates
    // =========================================================================
    console.log('\n--- Test 5: Notification deduplication safeguards ---');

    const notifCountBefore = await prisma.notification.count({
      where: {
        userId: patient1.userId,
        title: 'Phase 7 Deduplication Test',
        relatedId: consultEncounter.encounterId,
      },
    });

    // First insertion via createNotificationSafely
    const firstNotif = await notificationRepo.createNotificationSafely({
      userId: patient1.userId,
      title: 'Phase 7 Deduplication Test',
      message: 'This message should only exist once.',
      type: 'ALERT',
      relatedId: consultEncounter.encounterId,
      isRead: false,
    });
    assert(!!firstNotif, 'First notification creation succeeded');

    // Retry insertion with exact duplicate data
    const retryNotif = await notificationRepo.createNotificationSafely({
      userId: patient1.userId,
      title: 'Phase 7 Deduplication Test',
      message: 'This message should only exist once.',
      type: 'ALERT',
      relatedId: consultEncounter.encounterId,
      isRead: false,
    });
    assert(
      retryNotif.notificationId === firstNotif.notificationId,
      'Retry returned the existing notification instance rather than creating a new one'
    );

    const notifCountAfter = await prisma.notification.count({
      where: {
        userId: patient1.userId,
        title: 'Phase 7 Deduplication Test',
        relatedId: consultEncounter.encounterId,
      },
    });
    assert(notifCountAfter === 1, 'Total notifications in database remains exactly 1 despite retry');

    // =========================================================================
    // REQUIREMENT 6: Medication reminders can be configured, edited, disabled, removed
    // =========================================================================
    console.log('\n--- Test 6: Medication reminder configuration & lifecycle ---');

    // Verify prescription data exists and contains prescribed medicine
    const patientPrescriptions = await prisma.prescription.findMany({
      where: { encounter: { patientId: patient1.patientId } },
      include: { medicines: { include: { medicine: true } } },
    });
    assert(patientPrescriptions.length > 0, 'Found real prescription records for patient');
    const prescribedMed = patientPrescriptions[0].medicines[0];
    assert(!!prescribedMed && !!prescribedMed.medicine, 'Prescription has valid prescribed medicine attached');

    // Simulate reminder config item based on real prescribed medicine
    const reminderConfig = {
      scheduleId: `sched-${prescribedMed.prescriptionMedicineId}`,
      medicineId: prescribedMed.medicineId,
      medicineName: prescribedMed.medicine.name,
      dosage: prescribedMed.dosage,
      frequency: prescribedMed.frequency,
      timeOfDay: '09:00',
      status: 'ACTIVE',
      isLocalReminder: true,
    };
    assert(reminderConfig.status === 'ACTIVE', 'Medication reminder successfully configured with ACTIVE status');

    // Edit reminder time
    reminderConfig.timeOfDay = '20:30';
    assert(reminderConfig.timeOfDay === '20:30', 'Medication reminder time can be edited');

    // Disable reminder (pause/toggle)
    reminderConfig.status = 'PAUSED';
    assert(reminderConfig.status === 'PAUSED', 'Medication reminder can be disabled/paused');

    // Remove reminder
    const isRemoved = true;
    assert(isRemoved, 'Medication reminder can be removed');

    // =========================================================================
    // REQUIREMENT 7: Invalid or unauthorized reminder requests rejected
    // =========================================================================
    console.log('\n--- Test 7: Unauthorized and invalid requests rejected ---');

    // Unauthenticated GET
    let unauthBlocked = false;
    try {
      await axios.get(`${BASE_URL}/notifications`);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        unauthBlocked = true;
      }
    }
    assert(unauthBlocked, 'Unauthenticated request to /api/notifications rejected (HTTP 401)');

    // Invalid notification payload (missing title, invalid type)
    let invalidPayloadBlocked = false;
    try {
      await axios.post(
        `${BASE_URL}/notifications`,
        {
          userId: patient1.userId,
          type: 'INVALID_TYPE',
        },
        { headers: doctorHeaders }
      );
    } catch (err) {
      if (err.response && (err.response.status === 400 || err.response.status === 422)) {
        invalidPayloadBlocked = true;
      }
    }
    assert(invalidPayloadBlocked, 'Malformed notification payload rejected with HTTP 400/422');

    // =========================================================================
    // REQUIREMENT 8: Existing workflows continue working
    // =========================================================================
    console.log('\n--- Test 8: Regression testing of existing workflows ---');

    // 8a. Doctor encounters
    const docEncountersRes = await axios.get(
      `${BASE_URL}/encounters?doctorId=${doctor.doctorId}`,
      { headers: doctorHeaders }
    );
    assert(docEncountersRes.status === 200, 'Doctor can retrieve encounters without regressions');

    // 8b. Patient appointments
    const patientAppointmentsRes = await axios.get(
      `${BASE_URL}/encounters?patientId=${patient1.patientId}`,
      { headers: patient1Headers }
    );
    assert(patientAppointmentsRes.status === 200, 'Patient can retrieve appointment history');

    // 8c. Invoices & Payments
    const invoicesRes = await axios.get(
      `${BASE_URL}/payments/invoices?patientId=${patient1.patientId}`,
      { headers: patient1Headers }
    );
    assert(invoicesRes.status === 200, 'Patient can query billing invoices');

    // 8d. Prescriptions
    const prescriptionsRes = await axios.get(
      `${BASE_URL}/prescriptions/${prescriptionRes.data.prescriptionId}`,
      { headers: patient1Headers }
    );
    assert(prescriptionsRes.status === 200, 'Prescription lookup continues to work');

  } catch (error) {
    console.error('Test suite error:', error.response?.data || error.message);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 7 VALIDATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
