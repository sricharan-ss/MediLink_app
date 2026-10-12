import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('--- Provisioning MediLink Administrators ---');

  try {
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // 1. Provision SuperAdmin
    const superAdminEmail = 'admin@medilink.com';
    const superAdminPhone = '+919999900001';

    let superUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: superAdminEmail },
          { phoneNumber: superAdminPhone },
        ],
      },
    });

    if (!superUser) {
      superUser = await prisma.user.create({
        data: {
          firstName: 'MediLink',
          lastName: 'SuperAdmin',
          email: superAdminEmail,
          phoneNumber: superAdminPhone,
          password: hashedPassword,
          isActive: true,
          setUp: true,
        },
      });
      console.log(`✓ Created User record for SuperAdmin: ${superAdminEmail}`);
    } else {
      superUser = await prisma.user.update({
        where: { userId: superUser.userId },
        data: {
          email: superAdminEmail,
          password: hashedPassword,
          isActive: true,
          setUp: true,
        },
      });
      console.log(`✓ Updated User credentials for SuperAdmin: ${superAdminEmail}`);
    }

    const superAdminRecord = await prisma.superAdmin.upsert({
      where: { userId: superUser.userId },
      create: { userId: superUser.userId },
      update: {},
    });
    console.log(`✓ SuperAdmin role confirmed (superAdminId: ${superAdminRecord.superAdminId})`);

    // 2. Provision HospitalAdmin linked to first hospital
    const hospital = await prisma.hospital.findFirst({
      orderBy: { name: 'asc' },
    });

    const hospAdminEmail = 'hospitaladmin@medilink.com';
    const hospAdminPhone = '+919999900002';

    let hospUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: hospAdminEmail },
          { phoneNumber: hospAdminPhone },
        ],
      },
    });

    if (!hospUser) {
      hospUser = await prisma.user.create({
        data: {
          firstName: 'City',
          lastName: 'HospitalAdmin',
          email: hospAdminEmail,
          phoneNumber: hospAdminPhone,
          password: hashedPassword,
          isActive: true,
          setUp: true,
        },
      });
      console.log(`✓ Created User record for HospitalAdmin: ${hospAdminEmail}`);
    } else {
      hospUser = await prisma.user.update({
        where: { userId: hospUser.userId },
        data: {
          email: hospAdminEmail,
          password: hashedPassword,
          isActive: true,
          setUp: true,
        },
      });
      console.log(`✓ Updated User credentials for HospitalAdmin: ${hospAdminEmail}`);
    }

    const hospitalAdminRecord = await prisma.hospitalAdmin.upsert({
      where: { userId: hospUser.userId },
      create: {
        userId: hospUser.userId,
        hospitalId: hospital ? hospital.hospitalId : null,
      },
      update: {
        hospitalId: hospital ? hospital.hospitalId : null,
      },
    });
    console.log(
      `✓ HospitalAdmin role confirmed (adminId: ${hospitalAdminRecord.adminId}, hospital: ${hospital?.name || 'None'})`
    );

    console.log('\n======================================================');
    console.log('       ADMINISTRATOR PROVISIONING COMPLETED           ');
    console.log('======================================================');
    console.log(`SuperAdmin:     ${superAdminEmail} / ${defaultPassword}`);
    console.log(`HospitalAdmin:  ${hospAdminEmail} / ${defaultPassword}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Failed to provision administrator:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
