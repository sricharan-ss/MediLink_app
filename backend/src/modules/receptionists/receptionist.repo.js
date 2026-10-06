import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getReceptionistId = async ({ userId }) => {
  const reception = await prisma.receptionist.findUnique({
    where: {
      userId,
    },
    select: {
      receptionistId: true,
    },
  });
  return reception;
};

export const createReceptionist = async ({ userId }) => {
  await prisma.receptionist.create({
    data: {
      userId,
    },
  });
};
