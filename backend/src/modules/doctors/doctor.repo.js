import { prisma } from '../../config/db.js';

export async function createDoctor(data) {
    return await prisma.doctor.create({
        data: {
            userId: data.userId,
            specialization: data.specialization,
            licenseNo: data.licenseNo,
            signatureUrl: data.signatureUrl,
            isAvailable: data.isAvailable,
            avgRating: data.avgRating,
            joiningDate: data.joiningDate,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateDoctor(doctorId, data) {
    return await prisma.doctor.update({
        where: { doctorId: doctorId },
        data: {
            specialization: data.specialization,
            licenseNo: data.licenseNo,
            signatureUrl: data.signatureUrl,
            isAvailable: data.isAvailable,
            avgRating: data.avgRating,
            joiningDate: data.joiningDate,
            updatedAt: new Date()
        }
    })
}

export async function deleteDoctor(doctorId) {
    return await prisma.doctor.delete({
        where: { doctorId: doctorId }
    })
}

export async function getDoctorById(doctorId) {
    return await prisma.doctor.findUnique({
        where: { doctorId: doctorId },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    profile: true
                }
            },
            hospitals: {
                include: {
                    hospital: {
                        select: {
                            hospitalId: true,
                            name: true,
                            city: true,
                            address: true
                        }
                    }
                }
            }
        }
    })
}

export async function getDoctors(filters = {}) {
    const where = {};

    if (filters.specialization) {
        where.specialization = filters.specialization;
    }

    if (filters.isAvailable !== undefined) {
        where.isAvailable = filters.isAvailable;
    }

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    if (filters.encounterId) {
        where.encounters = {
            some: {
                encounterId: filters.encounterId
            }
        };
    }

    return await prisma.doctor.findMany({
        where,
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    profile: true
                }
            },
            hospitals: {
                include: {
                    hospital: {
                        select: {
                            hospitalId: true,
                            name: true,
                            city: true,
                            address: true
                        }
                    }
                }
            }
        }
    });
}
