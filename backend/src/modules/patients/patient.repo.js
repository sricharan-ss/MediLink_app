import { prisma } from  '../../config/db.js';

export async function createPatient(data) {
    return await prisma.patient.create({
        data:
        {
            userId: data.userId,
            gender: data.gender,
            dob: data.dob,
            bloodGroup: data.bloodGroup,
            chronicConditions: data.chronicConditions || [],
            favoriteDoctorIds: data.favoriteDoctorIds || [],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updatePatient(patientId, data) {
    return await prisma.patient.update({
        where: { patientId: patientId },
        data: {
            gender: data.gender,
            dob: data.dob,
            bloodGroup: data.bloodGroup,
            chronicConditions: data.chronicConditions,
            favoriteDoctorIds: data.favoriteDoctorIds,
            updatedAt: new Date()
        }
    })
}

export async function getPatientByUserId(userId) {
    return await prisma.patient.findUnique({
        where: { userId }
    });
}

export async function upsertPatientByUserId(userId, data) {
    return await prisma.patient.upsert({
        where: { userId },
        create: {
            userId,
            gender: data.gender,
            dob: data.dob,
            bloodGroup: data.bloodGroup,
            chronicConditions: data.chronicConditions || [],
            favoriteDoctorIds: data.favoriteDoctorIds || [],
        },
        update: {
            gender: data.gender,
            dob: data.dob,
            bloodGroup: data.bloodGroup,
            chronicConditions: data.chronicConditions,
            updatedAt: new Date(),
        }
    });
}

export async function deletePatient(patientId){
    return await prisma.patient.delete({
        where: { patientId: patientId }
    })
}


export async function getPatientById(patientId) {
    return await prisma.patient.findUnique({
        where: { patientId: patientId }
    })
}

export async function getPatients(filters = {}) {
    const where = {};

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.doctorId) {
        where.favoriteDoctorIds = {
            has: filters.doctorId
        };
    }

    if (filters.encounterId) {
        where.encounters = {
            some: {
                encounterId: filters.encounterId
            }
        };
    }

    return await prisma.patient.findMany({ where });
}
