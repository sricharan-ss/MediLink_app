import { prisma } from '../../config/db.js';

export async function createDoctorHospital(data) {
    return await prisma.doctorHospital.create({
        data: {
            doctorId: data.doctorId,
            hospitalId: data.hospitalId,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateDoctorHospital(doctorHospitalId, data) {
    return await prisma.doctorHospital.update({
        where: { doctorHospitalId: doctorHospitalId },
        data: {
            doctorId: data.doctorId,
            hospitalId: data.hospitalId,
            updatedAt: new Date()
        }
    })
}

export async function deleteDoctorHospital(doctorHospitalId) {
    return await prisma.doctorHospital.delete({
        where: { doctorHospitalId: doctorHospitalId }
    })
}

export async function getDoctorHospitalById(doctorHospitalId) {
    return await prisma.doctorHospital.findUnique({
        where: { doctorHospitalId: doctorHospitalId }
    })
}

export async function getDoctorHospitals(filters = {}) {
    const where = {};
    
    if (filters.doctorId) {
        where.doctorId = filters.doctorId;
    }

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    return await prisma.doctorHospital.findMany({ where });
}