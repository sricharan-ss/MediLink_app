import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const findUserByNumber = async ({ phoneNumber }) => {
  const user = await prisma.user.findFirst({
    where: {
      phoneNumber,
    },
    select: {
      userId: true,
      setUp: true,
    },
  });
  return user;
};

export const createNewUser = async ({
  firstName,
  lastName,
  phoneNumber,
  hashedOtp,
}) => {
  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      phoneNumber,
      otp: hashedOtp,
    },
  });
  return newUser;
};

export const updateOtp = async ({ userId, phoneNumber, hashedOtp }) => {
  const where = userId ? { userId } : { phoneNumber };
  await prisma.user.update({
    where,
    data: {
      otp: hashedOtp,
    },
  });
};

export const getUserOtp = async ({ userId }) => {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      otp: true,
      userId: true,
    },
  });
  return user;
};

export const deleteUserOtp = async ({ userId }) => {
  // delete otp from database
  await prisma.user.update({
    where: {
      userId: userId,
    },
    data: {
      otp: null,
    },
  });
};

export const getUserById = async ({ userId }) => {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      // userId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  return user;
};

export const getUserIdByPatientId = async (patientId) => {
  const patient = await prisma.patient.findUnique({
    where: {
      patientId,
    },
    select: {
      userId: true,
    },
  });
  return patient?.userId || null;
};

export const getUserIdByDoctorId = async (doctorId) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      doctorId,
    },
    select: {
      userId: true,
    },
  });
  return doctor?.userId || null;
};

export const getUserByName = async ({ name }) => {
  const user = await prisma.user.findMany({
    where: {
      firstName: {
        contains: name,
      },
    },
    select: {
      // userId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  return user;
};

export const getMyInfo = async ({ userId }) => {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      password: false,
      mpin: false,
      otp: false,
      createdAt: true,
      doctor: true,
      nurse: true,
      receptionist: true,
      inventoryManager: true,
      labManager: true,
      patient: true,
      notifications: true,
      vaults: true,
      profile: true,
    },
  });
  return user;
};

export const setMpin = async ({ userId, hashedMpin }) => {
  await prisma.user.update({
    where: {
      userId,
    },
    data: {
      mpin: hashedMpin,
    },
  });
};

export const getMpin = async ({ phoneNumber }) => {
  const user = await prisma.user.findUnique({
    where: {
      phoneNumber,
    },
    select: {
      userId: true,
      mpin: true,
    },
  });
  return user;
};

export const setPassword = async ({ userId, hashedPassword }) => {
  await prisma.user.update({
    where: {
      userId,
    },
    data: {
      password: hashedPassword,
    },
  });
};

export const getPassword = async ({ phoneNumber }) => {
  const user = await prisma.user.findUnique({
    where: {
      phoneNumber,
    },
    select: {
      userId: true,
      password: true,
    },
  });
  return user;
};

export const addProfile = async ({ userId, profileUrl }) => {
  await prisma.user.update({
    where: {
      userId,
    },
    data: {
      profile: profileUrl,
    },
  });
};

export const addFileToVault = async ({ userId, fileUrl, fileName }) => {
  await prisma.vault.create({
    data: {
      userId,
      fileName,
      fileUrl,
    },
  });
};

export const getProfile = async ({ userId }) => {
  const profile = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      profile: true,
    },
  });
  return profile;
};

export const getVault = async ({ userId }) => {
  const vault = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      vaults: {
        select: {
          fileName: true,
          fileUrl: true,
        },
      },
    },
  });
  return vault;
};

export const getUserByEmail = async ({ email }) => {
  const user = await prisma.user.findFirst({
    where: {
      email,
    },
    select: {
      userId: true,
      setUp: true,
    },
  });
  return user;
};

export const createTempUserEmail = async ({
  firstName,
  lastName,
  email,
  password,
  otp,
}) => {
  const tempUser = await prisma.tempUser.create({
    data: {
      firstName,
      lastName,
      email,
      password,
      otp,
    },
    select: {
      tempUserId: true,
    },
  });
  return tempUser;
};

export const createTempUserPhone = async ({
  firstName,
  lastName,
  phoneNumber,
  mpin,
  otp,
}) => {
  const tempUser = await prisma.tempUser.create({
    data: {
      firstName,
      lastName,
      phoneNumber,
      mpin,
      otp,
    },
    select: {
      tempUserId: true,
    },
  });
  return tempUser;
};

export const getTempUser = async ({ tempUserId }) => {
  const tempUser = await prisma.tempUser.findUnique({
    where: {
      tempUserId,
    },
  });
  return tempUser;
};

export const createUser = async ({
  firstName,
  lastName,
  phoneNumber,
  email,
  mpin,
  password,
}) => {
  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      phoneNumber,
      email,
      mpin,
      password,
    },
    select: {
      userId: true,
    },
  });
  return newUser;
};

export const userPassEmail = async ({ email }) => {
  const user = await prisma.user.findFirst({
    where: {
      email,
    },
    select: {
      userId: true,
      email: true,
      password: true,
      setUp: true,
    },
  });
  return user;
};

export const userPassPhone = async ({ userId }) => {
  const user = prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      setUp: true,
      otp: true,
      userId: true,
    },
  });
  return user;
};

export const userSetUp = async ({ userId }) => {
  await prisma.user.update({
    where: {
      userId,
    },
    data: {
      setUp: true,
    },
  });
};
