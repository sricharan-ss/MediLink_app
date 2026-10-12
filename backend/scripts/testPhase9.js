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
    'Content-Type': 'application/json',
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('           STARTING PHASE 9 VALIDATION SUITE        ');
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
    // 1. Fetch Actors from DB
    const superAdminUser = await prisma.user.findFirst({
      where: { email: 'admin@medilink.com' },
      include: { superAdmin: true },
    });
    const hospitalAdminUser = await prisma.user.findFirst({
      where: { email: 'hospitaladmin@medilink.com' },
      include: { hospitalAdmin: true },
    });
    const patientUser = await prisma.patient.findFirst({
      include: { user: true },
    });
    const doctorUser = await prisma.doctor.findFirst({
      include: { user: true },
    });
    const hospital = await prisma.hospital.findFirst();

    assert(Boolean(superAdminUser), 'SuperAdmin user exists in database');
    assert(Boolean(hospitalAdminUser), 'HospitalAdmin user exists in database');
    assert(Boolean(patientUser), 'Test patient exists in database');
    assert(Boolean(doctorUser), 'Test doctor exists in database');
    assert(Boolean(hospital), 'Test hospital exists in database');

    console.log('\n--- 1. Testing Unauthenticated Access Rejections ---');
    try {
      await axios.get(`${BASE_URL}/analytics/dashboard`);
      assert(false, 'Unauthenticated request to /analytics/dashboard should fail');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated request to /analytics/dashboard rejected with 401');
    }

    try {
      await axios.put(`${BASE_URL}/hospitals/${hospital.hospitalId}`, { name: 'Unauthorized Name' });
      assert(false, 'Unauthenticated PUT /hospitals/:id should fail');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated PUT /hospitals/:id rejected with 401');
    }

    console.log('\n--- 2. Testing Role Rejections for Patient and Doctor ---');
    if (patientUser) {
      try {
        await axios.get(`${BASE_URL}/analytics/dashboard`, {
          headers: getAuthHeader(patientUser.userId),
        });
        assert(false, 'Patient accessing /analytics/dashboard should fail');
      } catch (err) {
        assert(err.response?.status === 403, 'Patient accessing /analytics/dashboard rejected with 403 Forbidden');
      }

      try {
        await axios.put(
          `${BASE_URL}/hospitals/${hospital.hospitalId}`,
          { name: 'Patient Update' },
          { headers: getAuthHeader(patientUser.userId) }
        );
        assert(false, 'Patient PUT /hospitals/:id should fail');
      } catch (err) {
        assert(err.response?.status === 403, 'Patient updating hospital rejected with 403 Forbidden');
      }
    }

    if (doctorUser) {
      try {
        await axios.get(`${BASE_URL}/analytics/dashboard`, {
          headers: getAuthHeader(doctorUser.userId),
        });
        assert(false, 'Doctor accessing /analytics/dashboard should fail');
      } catch (err) {
        assert(err.response?.status === 403, 'Doctor accessing /analytics/dashboard rejected with 403 Forbidden');
      }
    }

    console.log('\n--- 3. Testing Administrator Authentication (Email & Password) ---');
    // Test SuperAdmin Login
    const superAdminLoginRes = await axios.post(`${BASE_URL}/auth/login/email`, {
      email: 'admin@medilink.com',
      password: 'Admin@12345',
    });
    assert(superAdminLoginRes.status === 200, 'POST /auth/login/email succeeded for SuperAdmin');
    const superAdminToken = superAdminLoginRes.data.accessToken || superAdminLoginRes.data.token;
    assert(Boolean(superAdminToken), 'Access token returned in SuperAdmin login');

    // Test HospitalAdmin Login
    const hospAdminLoginRes = await axios.post(`${BASE_URL}/auth/login/email`, {
      email: 'hospitaladmin@medilink.com',
      password: 'Admin@12345',
    });
    assert(hospAdminLoginRes.status === 200, 'POST /auth/login/email succeeded for HospitalAdmin');
    const hospAdminToken = hospAdminLoginRes.data.accessToken || hospAdminLoginRes.data.token;
    assert(Boolean(hospAdminToken), 'Access token returned in HospitalAdmin login');

    // Test Invalid Login
    try {
      await axios.post(`${BASE_URL}/auth/login/email`, {
        email: 'admin@medilink.com',
        password: 'WrongPassword!',
      });
      assert(false, 'Login with incorrect password should fail');
    } catch (err) {
      assert(err.response?.status === 401 || err.response?.status === 400, 'Login with invalid password rejected');
    }

    console.log('\n--- 4. Testing Profile and Roles Endpoint (/users/me) ---');
    const meRes = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(meRes.status === 200, 'GET /users/me succeeded');
    assert(
      Array.isArray(meRes.data.data?.roles) && meRes.data.data.roles.includes('SUPER_ADMIN'),
      'GET /users/me returns SUPER_ADMIN role for SuperAdmin'
    );

    const hospMeRes = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` },
    });
    assert(
      Array.isArray(hospMeRes.data.data?.roles) && hospMeRes.data.data.roles.includes('HOSPITAL_ADMIN'),
      'GET /users/me returns HOSPITAL_ADMIN role for HospitalAdmin'
    );

    console.log('\n--- 5. Testing Dashboard Analytics API (/analytics/dashboard) ---');
    const dashboardRes = await axios.get(`${BASE_URL}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(dashboardRes.status === 200, 'GET /analytics/dashboard returns 200 OK for SuperAdmin');
    const dData = dashboardRes.data.data;
    assert(typeof dData.summary?.totalPatients === 'number', 'Summary contains totalPatients count');
    assert(typeof dData.summary?.totalDoctors === 'number', 'Summary contains totalDoctors count');
    assert(typeof dData.summary?.totalHospitals === 'number', 'Summary contains totalHospitals count');
    assert(typeof dData.summary?.totalAppointments === 'number', 'Summary contains totalAppointments count');
    assert(typeof dData.summary?.totalInvoices === 'number', 'Summary contains totalInvoices count');
    assert(typeof dData.summary?.totalRevenue === 'number', 'Summary contains totalRevenue aggregate');
    assert(Array.isArray(dData.appointmentDistribution), 'Contains appointmentDistribution array');
    assert(Array.isArray(dData.invoiceDistribution), 'Contains invoiceDistribution array');
    assert(Array.isArray(dData.recentAppointments), 'Contains recentAppointments array');
    assert(Array.isArray(dData.recentPayments), 'Contains recentPayments array');

    console.log('\n--- 6. Testing Hospital Management (PUT /hospitals/:id) ---');
    const originalName = hospital.name;
    const updateRes = await axios.put(
      `${BASE_URL}/hospitals/${hospital.hospitalId}`,
      { name: `${originalName} (Updated)` },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    assert(updateRes.status === 200, 'PUT /hospitals/:id succeeded for SuperAdmin');
    assert(updateRes.data.name.includes('(Updated)'), 'Hospital name verified in update response');

    // Revert name back
    await axios.put(
      `${BASE_URL}/hospitals/${hospital.hospitalId}`,
      { name: originalName },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    console.log('[INFO] Reverted hospital name back to original');

    console.log('\n--- 7. Testing Admin Data Fetch Endpoints ---');
    // Patients
    const patientsRes = await axios.get(`${BASE_URL}/patients`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(patientsRes.status === 200 && Array.isArray(patientsRes.data), 'GET /patients returns patient list');
    if (patientsRes.data.length > 0) {
      assert(Boolean(patientsRes.data[0].user?.firstName), 'Patient records include associated user details');
    }

    // Encounters
    const encountersRes = await axios.get(`${BASE_URL}/encounters`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(encountersRes.status === 200 && Array.isArray(encountersRes.data), 'GET /encounters returns encounters list');

    // Invoices
    const invoicesRes = await axios.get(`${BASE_URL}/payments/invoices`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(invoicesRes.status === 200 && Array.isArray(invoicesRes.data), 'GET /payments/invoices returns invoices list');

    // Payments
    const paymentsRes = await axios.get(`${BASE_URL}/payments`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(paymentsRes.status === 200 && Array.isArray(paymentsRes.data), 'GET /payments returns payments list');

    console.log('\n--- 8. Testing Safe Handling of Invalid IDs ---');
    try {
      await axios.put(
        `${BASE_URL}/hospitals/00000000-0000-0000-0000-000000000000`,
        { name: 'Invalid Hospital' },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      assert(false, 'Updating non-existent hospital should return error');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 500, 'Handled non-existent hospital ID safely');
    }

    console.log('\n--- 9. Testing Session Logout Endpoint ---');
    const logoutRes = await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    assert(logoutRes.status === 200, 'POST /auth/logout succeeded');

  } catch (err) {
    console.error('Unexpected error during testing:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
