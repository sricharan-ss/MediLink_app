/**
 * backend/scripts/seedDemoData.js
 *
 * MediLink Phase 4 — Development Data Seed
 *
 * Creates:
 *   - 4 fictional hospitals
 *   - 12 doctors (3 per hospital) with User records
 *   - DoctorHospital relationships
 *
 * DoctorSchedule note:
 *   Per the existing architecture, DoctorSchedule records are created
 *   atomically by encounter.service.js at the time of booking.
 *   They are NOT pre-populated here because each DoctorSchedule
 *   requires a valid encounterId (unique FK). The Flutter app
 *   generates available slots client-side (patient_api_service.dart
 *   getDoctorSlots) and POSTs to /api/encounters to book.
 *
 * Safe to re-run: skips hospitals/doctors that already exist by name/licenseNo.
 *
 * Usage:
 *   node scripts/seedDemoData.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// 1. Hospital definitions
// ─────────────────────────────────────────────
const HOSPITALS = [
  {
    name: 'MediCare Multispeciality Hospital',
    address: 'No. 12, Rajaji Salai, Perambur, Chennai - 600011',
    city: 'Chennai',
    state: 'Tamil Nadu',
    rating: 4.8,
    ranking: 1,
  },
  {
    name: 'GreenLife Medical Center',
    address: '78, MG Road, Indiranagar, Bengaluru - 560038',
    city: 'Bengaluru',
    state: 'Karnataka',
    rating: 4.6,
    ranking: 2,
  },
  {
    name: 'CityCare Medical Institute',
    address: '34-B, Banjara Hills Road No. 10, Hyderabad - 500034',
    city: 'Hyderabad',
    state: 'Telangana',
    rating: 4.5,
    ranking: 3,
  },
  {
    name: 'HealthFirst Specialty Hospital',
    address: 'Plot 5, Viman Nagar, Pune - 411014',
    city: 'Pune',
    state: 'Maharashtra',
    rating: 4.4,
    ranking: 4,
  },
];

// ─────────────────────────────────────────────
// 2. Doctor definitions (3 per hospital, indexed 0–3)
// ─────────────────────────────────────────────
// hospitalIndex is 0-based, matching HOSPITALS array
const DOCTORS = [
  // MediCare Multispeciality Hospital (index 0)
  {
    hospitalIndex: 0,
    firstName: 'Aravind',
    lastName: 'Krishnamurthy',
    phone: '+919000000101',
    licenseNo: 'TN-MED-2019-001',
    specialization: 'CARDIOLOGY',
    consultationFee: 700,
    avgRating: 4.9,
    joiningDate: new Date('2019-06-15'),
  },
  {
    hospitalIndex: 0,
    firstName: 'Priya',
    lastName: 'Subramaniam',
    phone: '+919000000102',
    licenseNo: 'TN-MED-2020-002',
    specialization: 'NEUROLOGY',
    consultationFee: 650,
    avgRating: 4.7,
    joiningDate: new Date('2020-03-01'),
  },
  {
    hospitalIndex: 0,
    firstName: 'Ramesh',
    lastName: 'Balakrishnan',
    phone: '+919000000103',
    licenseNo: 'TN-MED-2018-003',
    specialization: 'ORTHOPEDICS',
    consultationFee: 600,
    avgRating: 4.8,
    joiningDate: new Date('2018-08-20'),
  },

  // GreenLife Medical Center (index 1)
  {
    hospitalIndex: 1,
    firstName: 'Meera',
    lastName: 'Nair',
    phone: '+919000000201',
    licenseNo: 'KA-MED-2021-001',
    specialization: 'DERMATOLOGY',
    consultationFee: 550,
    avgRating: 4.6,
    joiningDate: new Date('2021-01-10'),
  },
  {
    hospitalIndex: 1,
    firstName: 'Suresh',
    lastName: 'Venkataraman',
    phone: '+919000000202',
    licenseNo: 'KA-MED-2017-002',
    specialization: 'PEDIATRICS',
    consultationFee: 500,
    avgRating: 4.9,
    joiningDate: new Date('2017-05-22'),
  },
  {
    hospitalIndex: 1,
    firstName: 'Lakshmi',
    lastName: 'Rajendran',
    phone: '+919000000203',
    licenseNo: 'KA-MED-2022-003',
    specialization: 'GYNECOLOGY',
    consultationFee: 600,
    avgRating: 4.5,
    joiningDate: new Date('2022-07-01'),
  },

  // CityCare Medical Institute (index 2)
  {
    hospitalIndex: 2,
    firstName: 'Venkat',
    lastName: 'Reddy',
    phone: '+919000000301',
    licenseNo: 'TS-MED-2016-001',
    specialization: 'GENERAL_SURGERY',
    consultationFee: 800,
    avgRating: 4.8,
    joiningDate: new Date('2016-11-30'),
  },
  {
    hospitalIndex: 2,
    firstName: 'Asha',
    lastName: 'Murthy',
    phone: '+919000000302',
    licenseNo: 'TS-MED-2020-002',
    specialization: 'OPHTHALMOLOGY',
    consultationFee: 500,
    avgRating: 4.7,
    joiningDate: new Date('2020-09-15'),
  },
  {
    hospitalIndex: 2,
    firstName: 'Kiran',
    lastName: 'Sharma',
    phone: '+919000000303',
    licenseNo: 'TS-MED-2019-003',
    specialization: 'ENT',
    consultationFee: 450,
    avgRating: 4.6,
    joiningDate: new Date('2019-02-28'),
  },

  // HealthFirst Specialty Hospital (index 3)
  {
    hospitalIndex: 3,
    firstName: 'Neha',
    lastName: 'Kulkarni',
    phone: '+919000000401',
    licenseNo: 'MH-MED-2018-001',
    specialization: 'PSYCHIATRY',
    consultationFee: 750,
    avgRating: 4.9,
    joiningDate: new Date('2018-04-01'),
  },
  {
    hospitalIndex: 3,
    firstName: 'Rajiv',
    lastName: 'Deshmukh',
    phone: '+919000000402',
    licenseNo: 'MH-MED-2015-002',
    specialization: 'GENERAL_PRACTICE',
    consultationFee: 400,
    avgRating: 4.5,
    joiningDate: new Date('2015-12-10'),
  },
  {
    hospitalIndex: 3,
    firstName: 'Anjali',
    lastName: 'Patil',
    phone: '+919000000403',
    licenseNo: 'MH-MED-2023-003',
    specialization: 'CARDIOLOGY',
    consultationFee: 700,
    avgRating: 4.7,
    joiningDate: new Date('2023-03-15'),
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function upsertHospital(def) {
  const existing = await prisma.hospital.findFirst({
    where: { name: def.name },
  });
  if (existing) {
    console.log(`  ⏭  Hospital exists: ${def.name} (${existing.hospitalId})`);
    return existing;
  }
  const created = await prisma.hospital.create({
    data: {
      name: def.name,
      address: def.address,
      city: def.city,
      state: def.state,
      rating: def.rating,
      ranking: def.ranking,
      allowedRoles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_MANAGER', 'INVENTORY_MANAGER', 'PATIENT'],
    },
  });
  console.log(`  ✅ Created hospital: ${def.name} (${created.hospitalId})`);
  return created;
}

async function upsertDoctor(def, hospitalId) {
  // Check if doctor with this licenseNo already exists
  const existingDoctor = await prisma.doctor.findFirst({
    where: { licenseNo: def.licenseNo },
    include: { user: true },
  });

  if (existingDoctor) {
    console.log(`  ⏭  Doctor exists: Dr. ${def.firstName} ${def.lastName} (${existingDoctor.doctorId})`);
    // Ensure DoctorHospital link exists
    await upsertDoctorHospital(existingDoctor.doctorId, hospitalId);
    return existingDoctor;
  }

  // Check if phone already in use
  const existingUser = await prisma.user.findFirst({
    where: { phoneNumber: def.phone },
  });

  let userId;
  if (existingUser) {
    console.log(`  ⚠️  Phone ${def.phone} already used by ${existingUser.firstName} ${existingUser.lastName}`);
    userId = existingUser.userId;
  } else {
    const hashedPassword = await bcrypt.hash('DemoDoctor@123', 10);
    const newUser = await prisma.user.create({
      data: {
        firstName: def.firstName,
        lastName: def.lastName,
        phoneNumber: def.phone,
        password: hashedPassword,
        isActive: true,
        setUp: true,
      },
    });
    userId = newUser.userId;
  }

  const doctor = await prisma.doctor.create({
    data: {
      userId,
      specialization: def.specialization,
      licenseNo: def.licenseNo,
      isAvailable: true,
      avgRating: def.avgRating,
      consultationFee: def.consultationFee,
      joiningDate: def.joiningDate,
    },
    include: { user: true },
  });

  console.log(`  ✅ Created doctor: Dr. ${def.firstName} ${def.lastName} — ${def.specialization} (${doctor.doctorId})`);

  await upsertDoctorHospital(doctor.doctorId, hospitalId);
  return doctor;
}

async function upsertDoctorHospital(doctorId, hospitalId) {
  const existing = await prisma.doctorHospital.findUnique({
    where: { doctorId_hospitalId: { doctorId, hospitalId } },
  });
  if (existing) {
    return existing;
  }
  const link = await prisma.doctorHospital.create({
    data: { doctorId, hospitalId },
  });
  console.log(`    🔗 Linked doctor ${doctorId} → hospital ${hospitalId}`);
  return link;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('\n🚀 MediLink Phase 4 — Development Data Seed\n');

  // 1. Seed hospitals
  console.log('── Hospitals ──────────────────────────────');
  const hospitalRecords = [];
  for (const def of HOSPITALS) {
    const hospital = await upsertHospital(def);
    hospitalRecords.push(hospital);
  }

  // 2. Seed doctors
  console.log('\n── Doctors ────────────────────────────────');
  const doctorRecords = [];
  for (const def of DOCTORS) {
    const hospital = hospitalRecords[def.hospitalIndex];
    const doctor = await upsertDoctor(def, hospital.hospitalId);
    doctorRecords.push(doctor);
  }

  // 3. Summary
  const [hCount, dCount, dhCount] = await Promise.all([
    prisma.hospital.count(),
    prisma.doctor.count(),
    prisma.doctorHospital.count(),
  ]);

  console.log('\n── Summary ────────────────────────────────');
  console.log(`  Hospitals      : ${hCount}`);
  console.log(`  Doctors        : ${dCount}`);
  console.log(`  Doctor↔Hospital: ${dhCount}`);
  console.log('\n✅ Seed complete.\n');

  console.log('── Hospital IDs (for Flutter _fallbackHospitals update) ──');
  for (const h of hospitalRecords) {
    console.log(`  ${h.name}: ${h.hospitalId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
