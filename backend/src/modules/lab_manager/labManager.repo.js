import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getLabManagerId = async ({ userId }) => {
  const labManager = await prisma.labManager.findUnique({
    where: {
      userId,
    },
    select: {
      managerId: true,
    },
  });
  return labManager;
};

export const createLabManager = async ({ userId }) => {
  await prisma.labManager.create({
    data: {
      userId,
    },
  });
};
