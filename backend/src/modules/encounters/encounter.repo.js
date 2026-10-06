import { prisma } from "../../config/db.js";

export async function createEncounter(data) {
    return await prisma.encounter.create({
        data: {
            patientId: data.patientId,
            doctorId: data.doctorId,
            hospitalId: data.hospitalId,
            scheduledTime: data.scheduledTime,
            duration: data.duration,
            tokenNo: data.tokenNo,
            status: data.status,
            visitType: data.visitType,
            reason: data.reason,
            notes: data.notes,
            cancellationNote: data.cancellationNote,
            actualStartTime: data.actualStartTime,
            actualEndTime: data.actualEndTime,
            chiefComplaint: data.chiefComplaint,
            diagnosis: data.diagnosis,
            outcome: data.outcome,
            followUpDate: data.followUpDate,
            revisited: data.revisited,
            previousEncounterId: data.previousEncounterId,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateEncounter(encounterId, data) {
    return await prisma.encounter.update({
        where: { encounterId: encounterId },
        data: {
            patientId: data.patientId,
            doctorId: data.doctorId,
            hospitalId: data.hospitalId,
            scheduledTime: data.scheduledTime,
            duration: data.duration,
            tokenNo: data.tokenNo,
            status: data.status,
            visitType: data.visitType,
            reason: data.reason,
            notes: data.notes,
            cancellationNote: data.cancellationNote,
            actualStartTime: data.actualStartTime,
            actualEndTime: data.actualEndTime,
            chiefComplaint: data.chiefComplaint,
            diagnosis: data.diagnosis,
            outcome: data.outcome,
            followUpDate: data.followUpDate,
            revisited: data.revisited,
            previousEncounterId: data.previousEncounterId,
            updatedAt: new Date()
        }
    })
}

export async function deleteEncounter(encounterId) {
    return await prisma.encounter.delete({
        where: { encounterId: encounterId }
    })
}

export async function getEncounterById(encounterId) {
    return await prisma.encounter.findUnique({
        where: { encounterId: encounterId }
    })
}

export async function getEncounters(filters = {}) {
    const where = {};

    if (filters.patientId) {
        where.patientId = filters.patientId;
    }

    if (filters.doctorId) {
        where.doctorId = filters.doctorId;
    }

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.visitType) {
        where.visitType = filters.visitType;
    }

    if(filters.tokenNo){
        where.tokenNo = filters.tokenNo;
    }

    return await prisma.encounter.findMany({ where });
}

export async function createEncounterWithAtomicToken(data) {
    return await prisma.$transaction(async (tx) => {
        // Query existing encounters for this doctor on the scheduled date
        const today = new Date(data.scheduledTime);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Count ALL encounters for this doctor on this specific day (including cancelled)
        // Note: This is intentional - cancelled encounters keep their token numbers for historical tracking.
        // Token numbers are assigned at booking time and don't shift when appointments are cancelled.
        const encountersToday = await tx.encounter.findMany({
            where: {
                doctorId: data.doctorId,
                hospitalId: data.hospitalId,
                scheduledTime: {
                    gte: today,
                    lt: tomorrow
                }
            },
            select: { encounterId: true }
        });

        // Calculate next token number atomically
        const tokenNo = encountersToday.length + 1;

        // Create encounter with the atomic token within the same transaction
        return await tx.encounter.create({
            data: {
                patientId: data.patientId,
                doctorId: data.doctorId,
                hospitalId: data.hospitalId,
                scheduledTime: data.scheduledTime,
                duration: data.duration,
                tokenNo: tokenNo,
                status: data.status,
                visitType: data.visitType,
                reason: data.reason,
                notes: data.notes,
                cancellationNote: data.cancellationNote,
                actualStartTime: data.actualStartTime,
                actualEndTime: data.actualEndTime,
                chiefComplaint: data.chiefComplaint,
                diagnosis: data.diagnosis,
                outcome: data.outcome,
                followUpDate: data.followUpDate,
                revisited: data.revisited,
                previousEncounterId: data.previousEncounterId,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    });
}