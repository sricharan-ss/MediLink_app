import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getadminId = async ({ email }) => {
  const admin = await prisma.hospitalAdmin.findUnique({
    where: { email },
    select: {
      adminId: true,
    },
  });
  return admin;
};

export const createTempAdmin = async ({ email, hashedPassword, hashedOtp }) => {
  await prisma.tempAdmin.create({
    data: {
      email,
      password: hashedPassword,
      otp: hashedOtp,
    },
  });
};

export const getOtpTempAdmin = async ({ email }) => {
  const tempAdmin = await prisma.tempAdmin.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
  return tempAdmin;
};

export const createAdmin = async ({ email, password }) => {
  const admin = await prisma.hospitalAdmin.create({
    data: {
      email,
      password,
    },
  });
  return admin;
};

export const deleteTempAdmin = async ({ email }) => {
  await prisma.tempAdmin.deleteMany({
    where: { email },
  });
};

export const getAdminDetails = async ({ email }) => {
  const admin = await prisma.hospitalAdmin.findUnique({
    where: { email },
  });
  return admin;
};
