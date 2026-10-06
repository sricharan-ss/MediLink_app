import { prisma } from '../../config/db.js'

export async function createPrescription(data) {
    return await prisma.prescription.create({
        data: {
            encounterId: data.encounterId,
            nextVisit: data.nextVisit,
            generatedAt: data.generatedAt,
        },
        include: {
            medicines: true,
            encounter: true
        }
    })
}

export async function updatePrescription(prescriptionId, data) {
    return await prisma.prescription.update({
        where: { prescriptionId: prescriptionId },
        data: {
            nextVisit: data.nextVisit,
            generatedAt: data.generatedAt,
        },
        include: {
            medicines: true,
            encounter: true
        }
    })
}

export async function updatePrescriptionWithDiagnosis(prescriptionId, encounterId, prescriptionData, diagnosisData) {
    return await prisma.$transaction(async (tx) => {
        const updatedPrescription = await tx.prescription.update({
            where: { prescriptionId: prescriptionId },
            data: prescriptionData,
            include: {
                medicines: true,
                encounter: true
            }
        });

        const existingDiagnosis = await tx.diagnosis.findFirst({
            where: { encounterId: encounterId }
        });

        if (existingDiagnosis) {
            await tx.diagnosis.update({
                where: { diagnosisId: existingDiagnosis.diagnosisId },
                data: {
                    ...diagnosisData,
                    updatedAt: new Date()
                }
            });
        } else if (diagnosisData.diagnosisText || diagnosisData.symptoms || diagnosisData.allergiesNoted || diagnosisData.severity) {
            await tx.diagnosis.create({
                data: {
                    encounterId: encounterId,
                    ...diagnosisData
                }
            });
        }

        return updatedPrescription;
    });
}

export async function deletePrescription(prescriptionId) {
    return await prisma.prescription.delete({
        where: { prescriptionId: prescriptionId }
    })
}

export async function getPrescriptionById(prescriptionId) {
    return await prisma.prescription.findUnique({
        where: { prescriptionId: prescriptionId },
        include: {
            medicines: true,
            encounter: true
        }
    })
}

export async function getPrescriptionByEncounterId(encounterId) {
    return await prisma.prescription.findFirst({
        where: { encounterId: encounterId },
        include: {
            medicines: true,
            encounter: true
        }
    })
}

export async function getPrescriptions(filters = {}) {
    const where = {};

    if (filters.encounterId) {
        where.encounterId = filters.encounterId;
    }

    if (filters.patientId) {
        where.encounter = {
            patientId: filters.patientId
        };
    }

    return await prisma.prescription.findMany({ 
        where,
        include: {
            medicines: {
                include: {
                    medicine: true
                }
            },
            encounter: {
                include: {
                    doctor: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    },
                    hospital: {
                        select: {
                            hospitalId: true,
                            name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            generatedAt: 'desc'
        }
    });
}

export async function createPrescriptionWithDiagnosis(prescriptionData, diagnosisData) {
    return await prisma.$transaction(async (tx) => {
        // Create prescription
        const prescription = await tx.prescription.create({
            data: {
                encounterId: prescriptionData.encounterId,
                nextVisit: prescriptionData.nextVisit,
                generatedAt: prescriptionData.generatedAt
            },
            include: {
                medicines: true,
                encounter: true
            }
        });

        // Create diagnosis if any diagnosis fields are provided
        if (diagnosisData && Object.values(diagnosisData).some(val => val !== null && val !== undefined)) {
            await tx.diagnosis.create({
                data: {
                    encounterId: prescriptionData.encounterId,
                    diagnosisText: diagnosisData.diagnosisText,
                    symptoms: diagnosisData.symptoms,
                    allergiesNoted: diagnosisData.allergiesNoted,
                    severity: diagnosisData.severity
                }
            });
        }

        return prescription;
    });
}

