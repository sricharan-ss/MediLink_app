import { prisma } from '../../config/db.js';

export const createHospital = async ({ name, address, city }) => {
  const newHospital = await prisma.hospital.create({
    data: {
      name,
      address,
      city,
    },
  });
  return newHospital;
};

export const linkAdmin = async ({ adminId, hospitalId }) => {
  await prisma.hospitalAdmin.update({
    where: { adminId },
    data: { hospitalId },
  });
};

export const adminSubscribed = async ({ adminId }) => {
  const admin = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      subscribed: true,
      hospital: {
        select: {
          hospitalId: true,
        },
      },
    },
  });
  return admin;
};

export const getHospitals = async (filters = {}) => {
  const where = {};

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }

  if (filters.q || filters.search) {
    const term = (filters.q || filters.search).trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { city: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } }
    ];
  }

  return await prisma.hospital.findMany({
    where,
    include: {
      doctorHospitals: {
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profile: true
                }
              }
            }
          }
        }
      },
      labs: {
        select: {
          labId: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
};

export const getHospitalById = async (hospitalId) => {
  return await prisma.hospital.findUnique({
    where: { hospitalId },
    include: {
      doctorHospitals: {
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profile: true
                }
              }
            }
          }
        }
      },
      labs: {
        select: {
          labId: true,
          name: true
        }
      }
    }
  });
};

export const updateHospital = async (hospitalId, data) => {
  return await prisma.hospital.update({
    where: { hospitalId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.address && { address: data.address }),
      ...(data.city && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.rating !== undefined && { rating: data.rating }),
      ...(data.ranking !== undefined && { ranking: data.ranking }),
      updatedAt: new Date(),
    },
  });
};

