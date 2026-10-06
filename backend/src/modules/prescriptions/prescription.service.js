import * as prescriptionRepository from './prescription.repo.js';
import * as encounterRepository from '../encounters/encounter.repo.js';
import * as notificationRepo from '../notifications/notification.repo.js';
import * as userRepo from '../users/user.repo.js';
import { AppError } from '../../common/errors.js';

export async function createPrescription(data) {
    const encounter = await encounterRepository.getEncounterById(data.encounterId);
    if (!encounter) {
        throw new AppError('Encounter not found', 404);
    }
    
    const existingPrescription = await prescriptionRepository.getPrescriptionByEncounterId(data.encounterId);
    if (existingPrescription) {
        throw new AppError('Prescription already exists for this encounter', 409);
    }
    
    const notification = {
        userId: await userRepo.getUserIdByDoctorId(encounter.doctorId),
        title: 'Prescription Created',
        message: `New prescription created for encounter ${data.encounterId}`,
        type: 'PRESCRIPTION_CREATED',
        relatedId: data.encounterId,
        isRead: false
    };
    await notificationRepo.createNotification(notification);

    return await prescriptionRepository.createPrescriptionWithDiagnosis(
        {
            encounterId: data.encounterId,
            nextVisit: data.nextVisit,
            generatedAt: data.generatedAt
        },
        {
            diagnosisText: data.diagnosisText,
            symptoms: data.symptoms,
            allergiesNoted: data.allergiesNoted,
            severity: data.severity
        }
    );
}

export async function updatePrescription(prescriptionId, data) {
    const prescription = await prescriptionRepository.getPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new AppError('Prescription not found', 404);
    }

    const encounterId = prescription.encounterId;
    
    try {
        const updatedPrescription = await prescriptionRepository.updatePrescriptionWithDiagnosis(
            prescriptionId,
            encounterId,
            {
                nextVisit: data.nextVisit,
                generatedAt: data.generatedAt,
            },
            {
                diagnosisText: data.diagnosisText,
                symptoms: data.symptoms,
                allergiesNoted: data.allergiesNoted,
                severity: data.severity,
            }
        );

        const notification = {
            userId: await userRepo.getUserIdByDoctorId(prescription.encounter.doctorId),
            title: 'Prescription Updated',
            message: `Prescription updated for encounter ${prescription.encounterId}`,
            type: 'PRESCRIPTION_UPDATED',
            relatedId: prescription.encounterId,
            isRead: false
        };
        await notificationRepo.createNotification(notification);
        
        return updatedPrescription;
    } catch (error) {
        throw new AppError(`Failed to update prescription and diagnosis: ${error.message}`, 500);
    }
}

export async function deletePrescription(prescriptionId) {
    const prescription = await prescriptionRepository.getPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new AppError('Prescription not found', 404);
    }

    const  notification = {
        userId: await userRepo.getUserIdByDoctorId(prescription.encounter.doctorId),
        title: 'Prescription Deleted',
        message: `Prescription deleted for encounter ${prescription.encounterId}`,
        type: 'PRESCRIPTION_DELETED',
        relatedId: prescription.encounterId,
        isRead: false
    };
    await notificationRepo.createNotification(notification);
    
    return await prescriptionRepository.deletePrescription(prescriptionId);
}

export async function getPrescriptionById(prescriptionId) {
    const prescription = await prescriptionRepository.getPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new AppError('Prescription not found', 404);
    }
    return prescription;
}

export async function getPrescriptions(filters = {}) {
    const prescriptions = await prescriptionRepository.getPrescriptions(filters);
    if (!prescriptions || prescriptions.length === 0) {
        return [];
    }
    return prescriptions;
}