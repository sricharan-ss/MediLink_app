// backend/scripts/checkDb.js
// Quick DB inspection for Phase 4 planning
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const [hospitals, doctors, doctorHospitals, doctorSchedules, patients] =
    await Promise.all([
      prisma.hospital.count(),
      prisma.doctor.count(),
      prisma.doctorHospital.count(),
      prisma.doctorSchedule.count(),
      prisma.patient.count(),
    ]);

  console.log('=== MediLink DB State ===');
  console.log(JSON.stringify({ hospitals, doctors, doctorHospitals, doctorSchedules, patients }, null, 2));

  if (hospitals > 0) {
    const hList = await prisma.hospital.findMany({ select: { hospitalId: true, name: true, city: true } });
    console.log('\nExisting hospitals:');
    hList.forEach(h => console.log(' -', h.hospitalId, h.name, '-', h.city));
  }

  if (doctors > 0) {
    const dList = await prisma.doctor.findMany({
      select: {
        doctorId: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } }
      }
    });
    console.log('\nExisting doctors:');
    dList.forEach(d => console.log(' -', d.doctorId, d.user?.firstName, d.user?.lastName, '-', d.specialization));
  }

  if (patients > 0) {
    const pList = await prisma.patient.findMany({
      take: 3,
      select: {
        patientId: true,
        user: { select: { firstName: true, lastName: true, phoneNumber: true } }
      }
    });
    console.log('\nSample patients:');
    pList.forEach(p => console.log(' -', p.patientId, p.user?.firstName, p.user?.lastName));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
