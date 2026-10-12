import * as encounterService from './encounter.service.js';
import { createEncounterSchema, updateEncounterSchema } from './encounter.validator.js';
import { getPatientByUserId } from '../patients/patient.repo.js';
import { getDoctorByUserId } from '../doctors/doctor.repo.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createEncounterSchema.parse(req.body);

        // Security: If the requester is a PATIENT, ensure they can only book for themselves
        if (req.userRoles?.includes('PATIENT') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(r))) {
            const patient = await getPatientByUserId(req.userId);
            if (!patient) {
                return res.status(403).json({ message: 'Patient profile not found for authenticated user' });
            }
            if (validatedData.patientId && validatedData.patientId !== patient.patientId) {
                return res.status(403).json({ message: 'Access denied: cannot create appointment for another patient' });
            }
            validatedData.patientId = patient.patientId;
        }

        const encounter = await encounterService.createEncounter(validatedData);
        res.status(201).json(encounter);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const encounterId = req.params.id;
        const validatedData = updateEncounterSchema.parse(req.body);

        // Security: If the requester is a PATIENT, ensure they own this encounter and prevent clinical modifications
        if (req.userRoles?.includes('PATIENT') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(r))) {
            const existing = await encounterService.getEncounterById(encounterId);
            const patient = await getPatientByUserId(req.userId);
            if (!patient || existing.patientId !== patient.patientId) {
                return res.status(403).json({ message: 'Access denied: cannot modify another patient\'s appointment' });
            }

            // Patients can only cancel or reschedule
            if (validatedData.status && !['CANCELLED', 'SCHEDULED'].includes(validatedData.status)) {
                return res.status(403).json({ message: 'Access denied: patients cannot perform clinical status transitions' });
            }
            if (validatedData.diagnosis || validatedData.outcome || validatedData.actualStartTime || validatedData.actualEndTime || validatedData.chiefComplaint) {
                return res.status(403).json({ message: 'Access denied: clinical fields can only be modified by medical staff' });
            }
        }

        // Security: If the requester is a DOCTOR, ensure this encounter is assigned to them
        if (req.userRoles?.includes('DOCTOR') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(r))) {
            const existing = await encounterService.getEncounterById(encounterId);
            const doctor = await getDoctorByUserId(req.userId);
            if (!doctor || existing.doctorId !== doctor.doctorId) {
                return res.status(403).json({ message: 'Access denied: cannot modify an appointment assigned to another doctor' });
            }
        }

        const encounter = await encounterService.updateEncounter(encounterId, validatedData);
        res.status(200).json(encounter);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const encounterId = req.params.id;

        // Security: If the requester is a PATIENT, ensure they own this encounter
        if (req.userRoles?.includes('PATIENT') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(r))) {
            const existing = await encounterService.getEncounterById(encounterId);
            const patient = await getPatientByUserId(req.userId);
            if (!patient || existing.patientId !== patient.patientId) {
                return res.status(403).json({ message: 'Access denied: cannot delete another patient\'s appointment' });
            }
        }

        await encounterService.deleteEncounter(encounterId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const encounterId = req.params.id;
        const encounter = await encounterService.getEncounterById(encounterId);

        // Security: If the requester is a PATIENT, ensure they own this encounter
        if (req.userRoles?.includes('PATIENT') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(r))) {
            const patient = await getPatientByUserId(req.userId);
            if (!patient || encounter.patientId !== patient.patientId) {
                return res.status(403).json({ message: 'Access denied: cannot view another patient\'s appointment' });
            }
        }

        // Security: If the requester is a DOCTOR, ensure this encounter is assigned to them
        if (req.userRoles?.includes('DOCTOR') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(r))) {
            const doctor = await getDoctorByUserId(req.userId);
            if (!doctor || encounter.doctorId !== doctor.doctorId) {
                return res.status(403).json({ message: 'Access denied: cannot view another doctor\'s appointment' });
            }
        }

        res.status(200).json(encounter);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        let { patientId, doctorId, hospitalId, status, visitType, statusCategory } = req.query;

        // Security: If the requester is a PATIENT, force patientId to their own patientId
        if (req.userRoles?.includes('PATIENT') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(r))) {
            const patient = await getPatientByUserId(req.userId);
            if (!patient) {
                return res.status(200).json([]);
            }
            patientId = patient.patientId;
        }

        // Security: If the requester is a DOCTOR, force doctorId to their own doctorId
        if (req.userRoles?.includes('DOCTOR') && !req.userRoles.some(r => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(r))) {
            const doctor = await getDoctorByUserId(req.userId);
            if (!doctor) {
                return res.status(200).json([]);
            }
            doctorId = doctor.doctorId;
        }

        const encounters = await encounterService.getEncounters({
            patientId,
            doctorId,
            hospitalId,
            status,
            visitType,
            statusCategory
        });
        res.status(200).json(encounters);
    } catch (err) {
        next(err);
    }
};