import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import axios from 'axios';

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
  console.log('           STARTING PHASE 8 VALIDATION SUITE        ');
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
    // 1. Setup test actors: Patient 1 and Patient 2
    let patient1 = await prisma.patient.findFirst({
      where: { user: { phoneNumber: '+919361023556' } },
      include: { user: true }
    });

    if (!patient1) {
      const user1 = await prisma.user.create({
        data: {
          firstName: 'Sricharan',
          lastName: 'Patient',
          phoneNumber: '+919361023556',
          role: 'PATIENT'
        }
      });
      patient1 = await prisma.patient.create({
        data: {
          userId: user1.userId,
          age: 26,
          gender: 'MALE',
          bloodGroup: 'O_POSITIVE'
        },
        include: { user: true }
      });
    }

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
          role: 'PATIENT'
        }
      });
      patient2 = await prisma.patient.create({
        data: {
          userId: user2.userId,
          age: 32,
          gender: 'FEMALE',
          bloodGroup: 'B_POSITIVE'
        },
        include: { user: true }
      });
    }

    const hospital = await prisma.hospital.findFirst();

    console.log(`Test Actors: Patient 1 (${patient1.patientId}), Patient 2 (${patient2.patientId})`);

    // -------------------------------------------------------------
    // Test 1: Profile Read, Update & Chronic Conditions Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Profile Read, Update & Chronic Condition Removal ---');

    // Update with two conditions
    const updateRes1 = await axios.put(`${BASE_URL}/patients/me/profile`, {
      age: 27,
      gender: 'male',
      bloodGroup: 'O_POSITIVE',
      chronicConditions: ['Asthma', 'Hypertension'],
    }, { headers: getAuthHeader(patient1.userId) });

    assert(updateRes1.status === 200, 'PUT /api/patients/me/profile returned 200 OK');
    const c1 = updateRes1.data.data?.chronicConditions || [];
    assert(c1.includes('Asthma') && c1.includes('Hypertension'),
           'Profile saved both initial chronic conditions: Asthma & Hypertension');

    // Update removing Asthma (keeping only Hypertension)
    const updateRes2 = await axios.put(`${BASE_URL}/patients/me/profile`, {
      age: 27,
      gender: 'male',
      bloodGroup: 'O_POSITIVE',
      chronicConditions: ['Hypertension']
    }, { headers: getAuthHeader(patient1.userId) });

    assert(updateRes2.status === 200, 'PUT /api/patients/me/profile updated chronic conditions');
    const updatedConditions = updateRes2.data.data?.chronicConditions || [];
    assert(!updatedConditions.includes('Asthma'), 'Asthma was successfully removed from conditions');
    assert(updatedConditions.includes('Hypertension'), 'Hypertension remains saved');

    // Verify database state matches
    const dbPatient = await prisma.patient.findUnique({
      where: { patientId: patient1.patientId }
    });
    assert(!dbPatient.chronicConditions.includes('Asthma'), 'Database confirms Asthma is removed');
    assert(dbPatient.chronicConditions.includes('Hypertension'), 'Database confirms Hypertension is persisted');

    // -------------------------------------------------------------
    // Test 2: Invoice Ownership & Invoice.notes Field Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Invoice Ownership & Invoice.notes Field ---');

    // Create a test invoice for Patient 1 with notes
    const invoice1 = await prisma.invoice.create({
      data: {
        patientId: patient1.patientId,
        hospitalId: hospital ? hospital.hospitalId : 'hosp-default',
        totalAmount: 450.00,
        finalAmount: 450.00,
        status: 'PAID',
        notes: 'Cardiology Consultation & ECG Report Fee'
      }
    });

    // Create a test invoice for Patient 2
    const invoice2 = await prisma.invoice.create({
      data: {
        patientId: patient2.patientId,
        hospitalId: hospital ? hospital.hospitalId : 'hosp-default',
        totalAmount: 990.00,
        finalAmount: 990.00,
        status: 'PENDING',
        notes: 'Orthopedic Diagnostics'
      }
    });

    // Patient 1 queries own invoices
    const p1Invoices = await axios.get(`${BASE_URL}/payments/invoices`, {
      headers: getAuthHeader(patient1.userId)
    });
    assert(p1Invoices.status === 200, 'Patient 1 successfully fetched invoices via GET /api/payments/invoices');
    assert(p1Invoices.data.some(inv => inv.invoiceId === invoice1.invoiceId), 'Patient 1 invoice list contains invoice1');
    assert(!p1Invoices.data.some(inv => inv.invoiceId === invoice2.invoiceId), 'Patient 1 cannot see Patient 2 invoice in list');

    // Verify Invoice.notes field is retrieved correctly
    const fetchedInv1 = p1Invoices.data.find(inv => inv.invoiceId === invoice1.invoiceId);
    assert(fetchedInv1.notes === 'Cardiology Consultation & ECG Report Fee', 'Invoice.notes field is present and accurate');

    // Patient 2 attempts to fetch Patient 1 invoice directly by ID
    let crossInvoiceBlocked = false;
    try {
      await axios.get(`${BASE_URL}/payments/invoices/${invoice1.invoiceId}`, {
        headers: getAuthHeader(patient2.userId)
      });
    } catch (err) {
      crossInvoiceBlocked = (err.response && err.response.status === 403);
    }
    assert(crossInvoiceBlocked, 'Patient 2 blocked from viewing Patient 1 invoice by ID (HTTP 403 Forbidden)');

    // Patient 2 attempts query tampering (?patientId=patient1.patientId)
    const tamperedInvoiceQuery = await axios.get(`${BASE_URL}/payments/invoices?patientId=${patient1.patientId}`, {
      headers: getAuthHeader(patient2.userId)
    });
    assert(!tamperedInvoiceQuery.data.some(inv => inv.invoiceId === invoice1.invoiceId),
           'Tampered ?patientId query from Patient 2 is safely overridden and returns only Patient 2 invoices');

    // -------------------------------------------------------------
    // Test 3: Payment Ownership & Unscoped Fallback Prevention
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Payment Ownership & Unsafe Fallback Prevention ---');

    // Create payment for Patient 1's invoice
    const payment1 = await prisma.payment.create({
      data: {
        invoiceId: invoice1.invoiceId,
        amount: 450.00,
        mode: 'ONLINE',
        status: 'SUCCESS'
      }
    });

    // Create payment for Patient 2's invoice
    const payment2 = await prisma.payment.create({
      data: {
        invoiceId: invoice2.invoiceId,
        amount: 990.00,
        mode: 'CASH',
        status: 'PENDING'
      }
    });

    // Patient 1 queries payments
    const p1Payments = await axios.get(`${BASE_URL}/payments`, {
      headers: getAuthHeader(patient1.userId)
    });
    assert(p1Payments.status === 200, 'Patient 1 successfully fetched payments via GET /api/payments');
    assert(p1Payments.data.some(p => p.paymentId === payment1.paymentId), 'Patient 1 sees own payment');
    assert(!p1Payments.data.some(p => p.paymentId === payment2.paymentId), 'Patient 1 cannot see Patient 2 payment');

    // Patient 2 attempts to query Patient 1's payment directly
    let crossPaymentBlocked = false;
    try {
      await axios.get(`${BASE_URL}/payments/${payment1.paymentId}`, {
        headers: getAuthHeader(patient2.userId)
      });
    } catch (err) {
      crossPaymentBlocked = (err.response && err.response.status === 403);
    }
    assert(crossPaymentBlocked, 'Patient 2 blocked from viewing Patient 1 payment by ID (HTTP 403 Forbidden)');

    // Tampered ?patientId query from Patient 2
    const tamperedPaymentQuery = await axios.get(`${BASE_URL}/payments?patientId=${patient1.patientId}`, {
      headers: getAuthHeader(patient2.userId)
    });
    assert(!tamperedPaymentQuery.data.some(p => p.paymentId === payment1.paymentId),
           'Tampered ?patientId query from Patient 2 is safely overridden and returns only Patient 2 payments');

    // -------------------------------------------------------------
    // Test 4: Document Vault Access & Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Vault Access & Deletion Authorization ---');

    // Add a vault entry for User 1
    const vault1 = await prisma.vault.create({
      data: {
        userId: patient1.userId,
        fileName: 'Blood_Report_2026.pdf',
        fileUrl: 'https://example.com/vault/blood_report.pdf'
      }
    });

    // Add a vault entry for User 2
    const vault2 = await prisma.vault.create({
      data: {
        userId: patient2.userId,
        fileName: 'XRay_Chest_2026.pdf',
        fileUrl: 'https://example.com/vault/xray.pdf'
      }
    });

    // User 1 lists vault
    const user1Vault = await axios.get(`${BASE_URL}/users/vault`, {
      headers: getAuthHeader(patient1.userId)
    });
    assert(user1Vault.status === 200, 'User 1 successfully queried GET /api/users/vault');
    assert(user1Vault.data.vaults.some(v => v.id === vault1.id || v.fileName === 'Blood_Report_2026.pdf'),
           'User 1 sees own vault document');
    assert(!user1Vault.data.vaults.some(v => v.id === vault2.id || v.fileName === 'XRay_Chest_2026.pdf'),
           'User 1 cannot see User 2 vault document');

    // User 2 attempts to delete User 1's vault document
    let unauthorizedVaultDeleteBlocked = false;
    try {
      await axios.delete(`${BASE_URL}/users/vault/${vault1.id}`, {
        headers: getAuthHeader(patient2.userId)
      });
    } catch (err) {
      unauthorizedVaultDeleteBlocked = (err.response && [403, 404].includes(err.response.status));
    }
    assert(unauthorizedVaultDeleteBlocked, 'User 2 blocked from deleting User 1 vault file (HTTP 404/403)');

    // Verify vault1 still exists in database
    const vault1StillExists = await prisma.vault.findUnique({ where: { id: vault1.id } });
    assert(vault1StillExists !== null, 'User 1 document remains safe in database');

    // User 1 deletes their own vault document
    const user1Delete = await axios.delete(`${BASE_URL}/users/vault/${vault1.id}`, {
      headers: getAuthHeader(patient1.userId)
    });
    assert(user1Delete.status === 200, 'User 1 can delete their own vault document (HTTP 200 OK)');

    // Clean up vault2
    await prisma.vault.delete({ where: { id: vault2.id } }).catch(() => {});

    // -------------------------------------------------------------
    // Test 5: Logout & Session Security (Unauthorized Access Rejection)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Logout & Session Security ---');

    // Unauthenticated requests (no token)
    let noTokenProfile = false;
    try {
      await axios.get(`${BASE_URL}/patients/me/profile`);
    } catch (err) {
      noTokenProfile = (err.response && err.response.status === 401);
    }
    assert(noTokenProfile, 'Unauthenticated request to profile rejected (HTTP 401)');

    let noTokenInvoices = false;
    try {
      await axios.get(`${BASE_URL}/payments/invoices`);
    } catch (err) {
      noTokenInvoices = (err.response && err.response.status === 401);
    }
    assert(noTokenInvoices, 'Unauthenticated request to invoices rejected (HTTP 401)');

    let noTokenPayments = false;
    try {
      await axios.get(`${BASE_URL}/payments`);
    } catch (err) {
      noTokenPayments = (err.response && err.response.status === 401);
    }
    assert(noTokenPayments, 'Unauthenticated request to payments rejected (HTTP 401)');

    let noTokenVault = false;
    try {
      await axios.get(`${BASE_URL}/users/vault`);
    } catch (err) {
      noTokenVault = (err.response && err.response.status === 401);
    }
    assert(noTokenVault, 'Unauthenticated request to vault rejected (HTTP 401)');

    // Invalid / Tampered token
    let invalidTokenRejected = false;
    try {
      await axios.get(`${BASE_URL}/users/vault`, {
        headers: { 'Authorization': 'Bearer invalid.or.tampered.token' }
      });
    } catch (err) {
      invalidTokenRejected = (err.response && err.response.status === 401);
    }
    assert(invalidTokenRejected, 'Invalid/expired token rejected (HTTP 401)');

    // Clean up test invoices & payments
    await prisma.payment.deleteMany({
      where: { paymentId: { in: [payment1.paymentId, payment2.paymentId] } }
    }).catch(() => {});
    await prisma.invoice.deleteMany({
      where: { invoiceId: { in: [invoice1.invoiceId, invoice2.invoiceId] } }
    }).catch(() => {});

  } catch (error) {
    console.error('Test execution error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 8 VALIDATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
