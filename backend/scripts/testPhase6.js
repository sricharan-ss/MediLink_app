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
  console.log('           STARTING PHASE 6 VALIDATION SUITE        ');
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
    // Setup test actors
    const doctor = await prisma.doctor.findFirst({
      include: { user: true, hospitals: true },
    });
    const patient1 = await prisma.patient.findFirst({
      where: { user: { phoneNumber: '+919361023556' } },
      include: { user: true },
    });

    let patient2 = await prisma.patient.findFirst({
      where: { NOT: { patientId: patient1.patientId } },
      include: { user: true },
    });
    if (!patient2) {
      const user2 = await prisma.user.create({
        data: {
          firstName: 'Privacy',
          lastName: 'Tester',
          phoneNumber: '+919888877777',
        },
      });
      patient2 = await prisma.patient.create({
        data: {
          userId: user2.userId,
          age: 30,
          gender: 'OTHER',
        },
        include: { user: true },
      });
    }

    const hospital = await prisma.hospital.findFirst();
    const medicine = await prisma.medicine.findFirst({
      where: { isDiscontinued: false },
    });

    // Ensure we have a lab test in the database
    let labTest = await prisma.labTest.findFirst();
    if (!labTest) {
      labTest = await prisma.labTest.create({
        data: {
          testName: 'Complete Blood Count (CBC)',
          unit: 'cells/mcL',
          normalRange: '4,500-11,000',
        },
      });
    }

    // 1. Create encounters for Patient 1 and Patient 2
    const encounter1 = await prisma.encounter.create({
      data: {
        patientId: patient1.patientId,
        doctorId: doctor.doctorId,
        hospitalId: hospital.hospitalId,
        scheduledTime: new Date(Date.now() + 86400000 * 2),
        visitType: 'OPD',
        status: 'SCHEDULED',
        reason: 'Phase 6 medical records test for Patient 1',
        diagnosis: 'Seasonal Rhinitis',
      },
    });

    const encounter2 = await prisma.encounter.create({
      data: {
        patientId: patient2.patientId,
        doctorId: doctor.doctorId,
        hospitalId: hospital.hospitalId,
        scheduledTime: new Date(Date.now() + 86400000 * 3),
        visitType: 'OPD',
        status: 'SCHEDULED',
        reason: 'Phase 6 private encounter for Patient 2',
        diagnosis: 'Acute Gastritis',
      },
    });

    // Create Prescriptions for Patient 1 and Patient 2
    const prescription1 = await prisma.prescription.create({
      data: {
        encounterId: encounter1.encounterId,
        nextVisit: new Date(Date.now() + 86400000 * 14),
        medicines: {
          create: [
            {
              medicineId: medicine.medicineId,
              dosage: '500mg',
              frequency: '1-0-1',
              durationDays: 5,
            },
          ],
        },
      },
    });

    const prescription2 = await prisma.prescription.create({
      data: {
        encounterId: encounter2.encounterId,
        nextVisit: new Date(Date.now() + 86400000 * 7),
        medicines: {
          create: [
            {
              medicineId: medicine.medicineId,
              dosage: '250mg',
              frequency: '1-0-0',
              durationDays: 3,
            },
          ],
        },
      },
    });

    // Create Lab Results for Patient 1 and Patient 2
    const labResult1 = await prisma.labResult.create({
      data: {
        encounterId: encounter1.encounterId,
        labTestId: labTest.labTestId,
        resultValue: '7200',
        isAbnormal: false,
        remarks: 'WBC within normal limits',
      },
    });

    const labResult2 = await prisma.labResult.create({
      data: {
        encounterId: encounter2.encounterId,
        labTestId: labTest.labTestId,
        resultValue: '14500',
        isAbnormal: true,
        remarks: 'Elevated WBC count',
      },
    });

    // Create Vault Documents for Patient 1 and Patient 2
    const vaultDoc1 = await prisma.vault.create({
      data: {
        userId: patient1.userId,
        fileName: 'discharge_summary_p1.pdf',
        fileUrl: 'https://res.cloudinary.com/medilink/p1_doc.pdf',
      },
    });

    const vaultDoc2 = await prisma.vault.create({
      data: {
        userId: patient2.userId,
        fileName: 'private_scan_p2.pdf',
        fileUrl: 'https://res.cloudinary.com/medilink/p2_doc.pdf',
      },
    });

    console.log('[SETUP] Seeded test actors, encounters, prescriptions, lab results, and vault items.\n');

    // TEST 1 — Patient can view their own medical history
    console.log('--- TEST 1: Patient can view their own medical history ---');
    const p1EncRes = await fetch(`${BASE_URL}/encounters`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(p1EncRes.status === 200, 'Patient 1 GET /api/encounters returns 200');
    const p1EncData = await p1EncRes.json();
    const hasP1Encounter = p1EncData.some((e) => e.encounterId === encounter1.encounterId);
    assert(hasP1Encounter, 'Patient 1 receives their own encounter in medical history');
    const allP1EncountersMatch = p1EncData.every((e) => e.patientId === patient1.patientId);
    assert(allP1EncountersMatch, 'All returned encounters strictly belong to Patient 1');

    // TEST 2 — Patient cannot view another patient\'s medical history
    console.log('\n--- TEST 2: Patient cannot view another patient medical history ---');
    const p1QueryP2Enc = await fetch(`${BASE_URL}/encounters?patientId=${patient2.patientId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    const p1QueryP2Data = await p1QueryP2Enc.json();
    const leakedP2EncounterInList = p1QueryP2Data.some((e) => e.encounterId === encounter2.encounterId);
    assert(!leakedP2EncounterInList, 'Patient 1 query filtered by Patient 2 ID does NOT return Patient 2 encounter');

    const p1GetP2SingleEnc = await fetch(`${BASE_URL}/encounters/${encounter2.encounterId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(
      p1GetP2SingleEnc.status === 403 || p1GetP2SingleEnc.status === 404,
      `Patient 1 directly fetching Patient 2 encounter rejected with 403/404 (status: ${p1GetP2SingleEnc.status})`
    );

    // TEST 3 — Patient can view their own prescriptions
    console.log('\n--- TEST 3: Patient can view their own prescriptions ---');
    const p1PrescRes = await fetch(`${BASE_URL}/prescriptions`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(p1PrescRes.status === 200, 'Patient 1 GET /api/prescriptions returns 200');
    const p1PrescList = await p1PrescRes.json();
    const hasP1Presc = p1PrescList.some((p) => p.prescriptionId === prescription1.prescriptionId);
    assert(hasP1Presc, 'Patient 1 can list their own prescription');

    const p1SinglePresc = await fetch(`${BASE_URL}/prescriptions/${prescription1.prescriptionId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(p1SinglePresc.status === 200, 'Patient 1 can open their own prescription by ID');
    const p1SinglePrescData = await p1SinglePresc.json();
    assert(
      p1SinglePrescData.medicines && p1SinglePrescData.medicines.length > 0,
      'Prescription includes prescribed medicines and dosage details'
    );

    // TEST 4 — Patient cannot view another patient\'s prescriptions
    console.log('\n--- TEST 4: Patient cannot view another patient prescriptions ---');
    const p1QueryP2Presc = await fetch(`${BASE_URL}/prescriptions?patientId=${patient2.patientId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    const p1QueryP2PrescList = await p1QueryP2Presc.json();
    const leakedP2Presc = p1QueryP2PrescList.some((p) => p.prescriptionId === prescription2.prescriptionId);
    assert(!leakedP2Presc, 'Patient 1 cannot list Patient 2 prescriptions by passing patientId query');

    const p1GetP2SinglePresc = await fetch(`${BASE_URL}/prescriptions/${prescription2.prescriptionId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(
      p1GetP2SinglePresc.status === 403,
      `Patient 1 opening Patient 2 prescription ID rejected with 403 Forbidden (status: ${p1GetP2SinglePresc.status})`
    );

    // TEST 5 — Unauthorized users cannot retrieve private lab reports or vault documents
    console.log('\n--- TEST 5: Unauthorized users cannot retrieve private lab reports or vault documents ---');
    const unauthLab = await fetch(`${BASE_URL}/labs/results`);
    assert(unauthLab.status === 401, 'Unauthenticated GET /api/labs/results rejected with 401');

    const unauthVault = await fetch(`${BASE_URL}/users/vault`);
    assert(unauthVault.status === 401, 'Unauthenticated GET /api/users/vault rejected with 401');

    const p1GetP2Lab = await fetch(`${BASE_URL}/labs/results/${labResult2.resultId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(
      p1GetP2Lab.status === 403,
      `Patient 1 attempting to read Patient 2 private lab result rejected with 403 (status: ${p1GetP2Lab.status})`
    );

    const p1DeleteP2Vault = await fetch(`${BASE_URL}/users/vault/${vaultDoc2.id}`, {
      method: 'DELETE',
      headers: getAuthHeader(patient1.userId),
    });
    assert(
      p1DeleteP2Vault.status === 404,
      `Patient 1 attempting to delete Patient 2 vault document rejected with 404/Forbidden (status: ${p1DeleteP2Vault.status})`
    );

    // TEST 6 — Summary access is restricted to the correct patient and authorized clinical users
    console.log('\n--- TEST 6: Summary access restricted to correct patient and authorized clinical staff ---');
    // Doctor creates summary for Patient 1
    const createSummaryRes = await fetch(`${BASE_URL}/summaries`, {
      method: 'POST',
      headers: getAuthHeader(doctor.userId),
      body: JSON.stringify({
        patientId: patient1.patientId,
        encounterId: encounter1.encounterId,
        keyFindings: 'Patient reported mild seasonal allergies. Chest clear.',
        recommendations: 'Continue antihistamines for 5 days. Increase hydration.',
        medicalHistory: 'No prior chronic conditions.',
        labHistory: 'CBC within normal range.',
        riskFactors: 'Seasonal pollen exposure.',
        generatedBy: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
      }),
    });
    assert(createSummaryRes.status === 201, `Doctor creating summary returned 201 (status: ${createSummaryRes.status})`);
    const summaryData = await createSummaryRes.json();

    // Patient 1 views own summary
    const p1GetSummary = await fetch(`${BASE_URL}/summaries/${summaryData.summaryId}`, {
      headers: getAuthHeader(patient1.userId),
    });
    assert(p1GetSummary.status === 200, 'Patient 1 can view their own summary');

    // Patient 2 attempts to view Patient 1's summary
    const p2GetSummary = await fetch(`${BASE_URL}/summaries/${summaryData.summaryId}`, {
      headers: getAuthHeader(patient2.userId),
    });
    assert(p2GetSummary.status === 403, 'Patient 2 access to Patient 1 summary rejected with 403 Forbidden');

    // Patient 2 querying summaries
    const p2QuerySummaries = await fetch(`${BASE_URL}/summaries?patientId=${patient1.patientId}`, {
      headers: getAuthHeader(patient2.userId),
    });
    const p2SummariesList = await p2QuerySummaries.json();
    const leakedSummary = p2SummariesList.some((s) => s.summaryId === summaryData.summaryId);
    assert(!leakedSummary, 'Patient 2 cannot view Patient 1 summaries via query manipulation');

    // TEST 7 — Unsupported uploads and invalid document IDs are rejected safely
    console.log('\n--- TEST 7: Unsupported uploads and invalid document IDs are rejected safely ---');
    const deleteInvalidVault = await fetch(`${BASE_URL}/users/vault/invalid-doc-uuid`, {
      method: 'DELETE',
      headers: getAuthHeader(patient1.userId),
    });
    assert(deleteInvalidVault.status === 404, 'Deleting non-existent vault document returns 404');

    const emptyUpload = await fetch(`${BASE_URL}/users/uploadVault`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt.sign({ userId: patient1.userId }, JWT_SECRET, { expiresIn: '2h' })}`
      },
    });
    assert(
      emptyUpload.status === 400 || emptyUpload.status === 500,
      `Uploading without file payload safely rejected (status: ${emptyUpload.status})`
    );

    // TEST 8 — Existing doctor consultation and prescription creation still work
    console.log('\n--- TEST 8: Existing doctor consultation and prescription creation still work ---');
    const consultEncounter = await prisma.encounter.create({
      data: {
        patientId: patient1.patientId,
        doctorId: doctor.doctorId,
        hospitalId: hospital.hospitalId,
        scheduledTime: new Date(Date.now() + 86400000 * 4),
        visitType: 'OPD',
        status: 'IN_PROGRESS',
        reason: 'Follow-up consultation for doctor prescription creation',
      },
    });

    const doctorNewPresc = await fetch(`${BASE_URL}/prescriptions`, {
      method: 'POST',
      headers: getAuthHeader(doctor.userId),
      body: JSON.stringify({
        encounterId: consultEncounter.encounterId,
        nextVisit: new Date(Date.now() + 86400000 * 21).toISOString(),
        medicines: [
          {
            medicineId: medicine.medicineId,
            dosage: '500mg',
            frequency: '0-0-1',
            durationDays: 7,
          },
        ],
      }),
    });
    assert(
      doctorNewPresc.status === 201,
      `Doctor creating new prescription returned 201 (status: ${doctorNewPresc.status})`
    );

    // TEST 9 — Existing appointment booking, cancellation, and rescheduling still work
    console.log('\n--- TEST 9: Existing appointment booking, cancellation, and rescheduling still work ---');
    const bookRes = await fetch(`${BASE_URL}/encounters`, {
      method: 'POST',
      headers: getAuthHeader(patient1.userId),
      body: JSON.stringify({
        patientId: patient1.patientId,
        doctorId: doctor.doctorId,
        hospitalId: hospital.hospitalId,
        scheduledTime: new Date(Date.now() + 86400000 * 5).toISOString(),
        duration: 30,
        visitType: 'OPD',
        reason: 'Phase 6 regression test appointment',
      }),
    });
    assert(bookRes.status === 201, `Patient booking appointment returns 201 (status: ${bookRes.status})`);
    const booked = await bookRes.json();

    const rescheduleRes = await fetch(`${BASE_URL}/encounters/${booked.encounterId}`, {
      method: 'PUT',
      headers: getAuthHeader(patient1.userId),
      body: JSON.stringify({
        scheduledTime: new Date(Date.now() + 86400000 * 6).toISOString(),
        status: 'SCHEDULED',
      }),
    });
    assert(rescheduleRes.status === 200, `Patient rescheduling appointment returns 200 (status: ${rescheduleRes.status})`);

    const cancelRes = await fetch(`${BASE_URL}/encounters/${booked.encounterId}`, {
      method: 'PUT',
      headers: getAuthHeader(patient1.userId),
      body: JSON.stringify({
        status: 'CANCELLED',
        cancellationNote: 'Phase 6 test cancellation',
      }),
    });
    assert(cancelRes.status === 200, `Patient cancelling appointment returns 200 (status: ${cancelRes.status})`);
    const cancelled = await cancelRes.json();
    assert(cancelled.status === 'CANCELLED', 'Encounter status successfully updated to CANCELLED');

    // Clean up test documents
    console.log('\n--- CLEANUP ---');
    await prisma.vault.deleteMany({
      where: { id: { in: [vaultDoc1.id, vaultDoc2.id] } },
    });
    console.log('[CLEANUP] Cleaned up temporary test vault entries.');

  } catch (err) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 6 VALIDATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
