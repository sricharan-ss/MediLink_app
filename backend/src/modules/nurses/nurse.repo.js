import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getNurseId = async ({ userId }) => {
  const nurse = await prisma.nurse.findUnique({
    where: {
      userId,
    },
    select: {
      nurseId: true,
    },
  });
  return nurse;
};

export const createNurse = async ({ userId, department, licenseNo }) => {
  await prisma.nurse.create({
    data: {
      userId,
      department,
      licenseNo,
    },
  });
};
