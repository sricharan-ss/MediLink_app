import * as encounterRepository from './encounter.repo.js';
import * as doctorScheduleRepo from '../doctor_schedules/doctor_schedule.repo.js';
import * as paymentRepo from '../payments/payment.repo.js';
import * as paymentService from '../payments/payment.service.js';
import * as invoiceRepo from '../invoices/invoice.repo.js';
import * as invoiceItemRepo from '../invoice_items/invoice_item.repo.js';
import * as doctorRepo from '../doctors/doctor.repo.js';
import * as notificationRepo from '../notifications/notification.repo.js';
import * as userRepo from '../users/user.repo.js';
import * as reminderJobService from '../reminder_jobs/reminder_job.service.js';
import { AppError } from '../../common/errors.js';

export async function createEncounter(data) {
    let doctorName = 'Doctor';
    let doctorSpecialization = undefined;

    // Double-booking check: Prevent booking if doctor already has an active encounter or booked schedule at the same time
    const existingConflict = await doctorScheduleRepo.getDoctorSchedules({
        doctorId: data.doctorId,
        scheduledTime: data.scheduledTime,
    });
    if (existingConflict && existingConflict.length > 0 && existingConflict.some(s => s.isBooked)) {
        throw new AppError('The selected time slot is already booked for this doctor', 409);
    }

    // Also check encounters table directly for active (non-cancelled) encounter at this time
    const existingActiveEncounters = await encounterRepository.getEncounters({
        doctorId: data.doctorId,
    });
    const scheduledIso = new Date(data.scheduledTime).toISOString();
    const hasActiveConflict = existingActiveEncounters && existingActiveEncounters.some(
        e => e.status !== 'CANCELLED' && new Date(e.scheduledTime).toISOString() === scheduledIso
    );
    if (hasActiveConflict) {
        throw new AppError('The selected time slot is already booked for this doctor', 409);
    }

    // If this is a follow-up encounter, mark the previous encounter as revisited
    if (data.previousEncounterId) {
        const previousEncounter = await encounterRepository.getEncounterById(data.previousEncounterId);
        if (!previousEncounter) {
            throw new AppError('Previous encounter not found', 404);
        }
        // Mark previous encounter as revisited
        await encounterRepository.updateEncounter(data.previousEncounterId, {
            revisited: true,
            updatedAt: new Date()
        });
    }
    
    // Create encounter with atomic token generation (prevents concurrent token collisions)
    const encounter = await encounterRepository.createEncounterWithAtomicToken(data);
    
    // Then create the doctor schedule with the encounter ID
    const scheduleData = {
        doctorId: data.doctorId,
        patientId: data.patientId,
        hospitalId: data.hospitalId,
        encounterId: encounter.encounterId,
        scheduledTime: data.scheduledTime,
        slotDuration: data.duration || 15,
        isBooked: true
    };
    
    try {
        await doctorScheduleRepo.createDoctorSchedule(scheduleData);
    } catch (error) {
        // Rollback encounter creation if schedule creation fails
        try {
            await encounterRepository.deleteEncounter(encounter.encounterId);
        } catch (deleteError) {
            console.error('Failed to rollback encounter after schedule creation failure:', deleteError.message);
        }
        throw new AppError('Failed to create doctor schedule: ' + error.message, 400);
    }

    try {
        const doctorData = await doctorRepo.getDoctorById(data.doctorId);
        if (!doctorData) {
            throw new AppError('Doctor not found', 404);
        }

        const consultationFee = doctorData.consultationFee || 500.00;
        doctorSpecialization = doctorData.specialization;
        
        const taxRate = 0.10;
        const discountAmount = 0;
        const taxAmount = consultationFee * taxRate;
        const finalAmount = consultationFee + taxAmount - discountAmount;

        doctorName = doctorData.user ? `${doctorData.user.firstName} ${doctorData.user.lastName}` : 'Doctor';

        // Generate invoice with retry loop to handle unique constraint collisions
        const maxInvoiceRetries = 5;
        const year = new Date().getFullYear();
        let invoice = null;
        let invoiceNumber = null;

        for (let attempt = 0; attempt < maxInvoiceRetries; attempt++) {
            const randomNum = Math.floor(100000 + Math.random() * 900000);
            invoiceNumber = `INV-${year}-${randomNum}`;

            const invoiceData = {
                patientId: data.patientId,
                hospitalId: data.hospitalId,
                invoiceNumber: invoiceNumber,
                totalAmount: consultationFee,
                discountAmount: discountAmount,
                taxAmount: taxAmount,
                finalAmount: finalAmount,
                status: 'PENDING',
                generatedAt: new Date(),
                dueDate: data.scheduledTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                notes: `Consultation fee for appointment with Dr. ${doctorName}`
            };

            try {
                invoice = await invoiceRepo.createInvoice(invoiceData);
                break; // Success - exit retry loop
            } catch (error) {
                // Handle unique constraint violation on invoiceNumber (Prisma P2002)
                const isUniqueConstraintError =
                    error && error.code === 'P2002' &&
                    error.meta && error.meta.target && error.meta.target.includes('invoiceNumber');
                
                if (isUniqueConstraintError) {
                    if (attempt === maxInvoiceRetries - 1) {
                        throw new AppError('Failed to generate unique invoice number after multiple attempts', 500);
                    }
                    // Retry with new random number
                    continue;
                }
                // Rethrow non-unique-constraint errors
                throw error;
            }
        }

        if (invoice) {
            const invoiceItemData = {
                invoiceId: invoice.invoiceId,
                itemType: 'ENCOUNTER',
                itemId: encounter.encounterId,
                description: 'Doctor Consultation Fee',
                quantity: 1,
                unitPrice: consultationFee,
                totalPrice: consultationFee
            };

            await invoiceItemRepo.createInvoiceItem(invoiceItemData);
            console.log(`Invoice ${invoiceNumber} generated for encounter ${encounter.encounterId}`);
        }
    } catch (error) {
        // Log error but don't rollback encounter (invoice is optional, encounter is primary)
        console.error('Failed to auto-generate invoice:', error.message);
    }
    
    const notification = {
        userId: await userRepo.getUserIdByPatientId(data.patientId),
        title: 'Encounter Created',
        message: `Your encounter has been scheduled on ${data.scheduledTime}.`,
        type: 'ENCOUNTER_CREATED',
        relatedId: encounter.encounterId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    await notificationRepo.createNotification(notification);

    // Create reminder jobs for this encounter
    try {
        const reminderConfigs = [
            { offsetMinutes: -24 * 60, channel: 'SMS', templateKey: 'ENCOUNTER_REMINDER' },    // 24 hours before
            { offsetMinutes: -2 * 60, channel: 'EMAIL', templateKey: 'ENCOUNTER_REMINDER' },   // 2 hours before
            { offsetMinutes: -30, channel: 'WHATSAPP', templateKey: 'ENCOUNTER_REMINDER' }     // 30 minutes before
        ];

        const reminderPayload = {
            doctorName: doctorName,
            specialization: doctorSpecialization,
            appointmentTime: data.scheduledTime,
            encounterId: encounter.encounterId,
            hospitalName: data.hospitalName || 'Hospital',
            tokenNo: encounter.tokenNo,
            locationDetails: data.locationDetails || null
        };

        await reminderJobService.createRemindersForEvent(
            'ENCOUNTER',
            encounter.encounterId,
            data.patientId,
            new Date(data.scheduledTime),
            reminderConfigs,
            reminderPayload
        );

        console.log(`Created ${reminderConfigs.length} reminder jobs for encounter ${encounter.encounterId}`);
    } catch (reminderError) {
        // Log error but don't fail encounter creation if reminders fail
        console.error('Failed to create reminder jobs:', reminderError.message);
    }

    return encounter;
}

export async function updateEncounter(encounterId, data) {
    const encounter = await encounterRepository.getEncounterById(encounterId);
    if (!encounter) {
        throw new AppError('Encounter not found', 404);
    }

    const doctorId = data.doctorId || encounter.doctorId;
    const isRescheduling = data.scheduledTime && new Date(data.scheduledTime).toISOString() !== new Date(encounter.scheduledTime).toISOString();

    // If rescheduling, check that the new time slot isn't already occupied by another active encounter
    if (isRescheduling) {
        const newScheduledDate = new Date(data.scheduledTime);
        const newScheduledIso = newScheduledDate.toISOString();
        const existingActiveEncounters = await encounterRepository.getEncounters({ doctorId });
        const hasConflict = existingActiveEncounters && existingActiveEncounters.some(
            e => e.encounterId !== encounterId && e.status !== 'CANCELLED' && new Date(e.scheduledTime).toISOString() === newScheduledIso
        );
        if (hasConflict) {
            throw new AppError('The new time slot is already booked for this doctor', 409);
        }

        const existingScheduleConflicts = await doctorScheduleRepo.getDoctorSchedules({
            doctorId: doctorId,
            scheduledTime: newScheduledDate,
        });
        if (existingScheduleConflicts && existingScheduleConflicts.some(s => s.isBooked && s.encounterId !== encounterId)) {
            throw new AppError('The new time slot is already booked for this doctor', 409);
        }
    }

    // Update the encounter
    const updatedEncounter = await encounterRepository.updateEncounter(encounterId, data);
    
    // Update the linked doctor schedule
    try {
        const schedules = await doctorScheduleRepo.getDoctorSchedules({ encounterId });
        const isCancelled = data.status === 'CANCELLED';
        if (schedules && schedules.length > 0) {
            const schedule = schedules[0];
            if (isCancelled) {
                await doctorScheduleRepo.updateDoctorSchedule(schedule.scheduleId, {
                    isBooked: false,
                });
            } else if (isRescheduling) {
                const newScheduledDate = new Date(data.scheduledTime);
                const existingAtNewTime = await doctorScheduleRepo.getDoctorSchedules({
                    doctorId: doctorId,
                    scheduledTime: newScheduledDate,
                });
                if (existingAtNewTime && existingAtNewTime.length > 0 && existingAtNewTime[0].scheduleId !== schedule.scheduleId) {
                    await doctorScheduleRepo.updateDoctorSchedule(existingAtNewTime[0].scheduleId, {
                        patientId: data.patientId || schedule.patientId,
                        hospitalId: data.hospitalId || schedule.hospitalId,
                        encounterId: encounterId,
                        slotDuration: data.duration || schedule.slotDuration,
                        isBooked: true,
                    });
                    await doctorScheduleRepo.deleteDoctorSchedule(schedule.scheduleId);
                } else {
                    await doctorScheduleRepo.updateDoctorSchedule(schedule.scheduleId, {
                        doctorId: doctorId,
                        scheduledTime: newScheduledDate,
                        slotDuration: data.duration || schedule.slotDuration,
                        isBooked: true,
                    });
                }
            } else {
                await doctorScheduleRepo.updateDoctorSchedule(schedule.scheduleId, {
                    doctorId: doctorId,
                    patientId: data.patientId || schedule.patientId,
                    hospitalId: data.hospitalId || schedule.hospitalId,
                    slotDuration: data.duration || schedule.slotDuration,
                });
            }
        }
    } catch (error) {
        throw new AppError('Failed to update doctor schedule: ' + error.message, 400);
    }

    const notification = {
        userId: await userRepo.getUserIdByPatientId(encounter.patientId),
        title: 'Encounter Updated',
        message: `Your encounter scheduled on ${encounter.scheduledTime} has been updated.`,
        type: 'ENCOUNTER_UPDATE',
        relatedId: encounter.encounterId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    await notificationRepo.createNotification(notification);
    
    // If scheduledTime changed, update reminder jobs
    if (data.scheduledTime && data.scheduledTime !== encounter.scheduledTime) {
        try {
            const doctorData = await doctorRepo.getDoctorById(updatedEncounter.doctorId);
            const doctorName = doctorData && doctorData.user 
                ? `${doctorData.user.firstName} ${doctorData.user.lastName}` 
                : 'Doctor';

            const reminderConfigs = [
                { offsetMinutes: -24 * 60, channel: 'SMS', templateKey: 'ENCOUNTER_REMINDER' },
                { offsetMinutes: -2 * 60, channel: 'EMAIL', templateKey: 'ENCOUNTER_REMINDER' },
                { offsetMinutes: -30, channel: 'WHATSAPP', templateKey: 'ENCOUNTER_REMINDER' }
            ];

            const reminderPayload = {
                doctorName: doctorName,
                specialization: doctorData?.specialization,
                appointmentTime: data.scheduledTime,
                encounterId: updatedEncounter.encounterId,
                hospitalName: data.hospitalName || 'Hospital',
                tokenNo: updatedEncounter.tokenNo
            };

            // Upsert reminders (will update existing or create new)
            await reminderJobService.createRemindersForEvent(
                'ENCOUNTER',
                updatedEncounter.encounterId,
                updatedEncounter.patientId,
                new Date(data.scheduledTime),
                reminderConfigs,
                reminderPayload
            );

            console.log(`Updated reminder jobs for rescheduled encounter ${encounterId}`);
        } catch (reminderError) {
            console.error('Failed to update reminder jobs:', reminderError.message);
        }
    }
    
    return updatedEncounter;
}

export async function deleteEncounter(encounterId){
    const encounter = await encounterRepository.getEncounterById(encounterId);
    if (!encounter) {
        throw new AppError('Encounter not found', 404);
    }
    
    // Cancel invoice for this encounter
    let invoiceId = null;
    try {
        // Find invoice items linked to this encounter
        const invoiceItems = await invoiceItemRepo.getInvoiceItems({
            itemType: 'ENCOUNTER',
            itemId: encounterId
        });

        if (invoiceItems && invoiceItems.length > 0) {
            // Get the invoice ID from the first item
            invoiceId = invoiceItems[0].invoiceId;
            
            // Update invoice status to CANCELLED
            await invoiceRepo.updateInvoice(invoiceId, {
                status: 'CANCELLED',
                notes: `Cancelled due to encounter ${encounterId} deletion on ${new Date().toISOString()}`
            });

            console.log(`Invoice ${invoiceId} cancelled for encounter ${encounterId}`);
        }
    } catch (error) {
        console.error('Failed to cancel invoice:', error.message);
        // Continue with deletion even if invoice cancellation fails
    }
    
    // Process refund if payment exists
    try {
        if (invoiceId) {
            // Get payments for this specific invoice
            const payments = await paymentRepo.getPayments({ 
                invoiceId: invoiceId
            });
            
            // Process refund for successful payments
            if (payments && payments.length > 0) {
                for (const payment of payments) {
                    if (payment.status === 'SUCCESS') {
                        try {
                            // Call Razorpay refund API through payment service
                            await paymentService.refundPayment(
                                payment.paymentId,
                                null,
                                { reason: `Refund for cancelled encounter ${encounterId}` }
                            );
                            console.log(`Payment ${payment.paymentId} refunded via Razorpay for encounter ${encounterId}`);
                        } catch (refundError) {
                            console.error(`Failed to refund payment ${payment.paymentId} via Razorpay:`, refundError.message);
                            // Continue with next payment even if one refund fails
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to process refund:', error.message);
    }
    
    // Delete the linked doctor schedule first
    try {
        const schedules = await doctorScheduleRepo.getDoctorSchedules({ encounterId });
        if (schedules && schedules.length > 0) {
            for (const schedule of schedules) {
                await doctorScheduleRepo.deleteDoctorSchedule(schedule.scheduleId);
            }
        }
    } catch (error) {
        throw new AppError('Failed to delete doctor schedule: ' + error.message, 400);
    }
    
    const notification = {
        userId: await userRepo.getUserIdByPatientId(encounter.patientId),
        title: 'Encounter Cancelled',
        message: `Your encounter scheduled on ${encounter.scheduledTime} has been cancelled.`,
        type: 'ENCOUNTER_CANCELLED',
        relatedId: encounter.encounterId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    await notificationRepo.createNotification(notification);

    // Cancel all pending reminder jobs for this encounter
    try {
        await reminderJobService.cancelRemindersForDeletedSource('ENCOUNTER', encounterId);
        console.log(`Cancelled reminder jobs for deleted encounter ${encounterId}`);
    } catch (reminderError) {
        console.error('Failed to cancel reminder jobs:', reminderError.message);
    }

    // Then delete the encounter
    return await encounterRepository.deleteEncounter(encounterId);
}

export async function getEncounterById(encounterId) {
    const encounter = await encounterRepository.getEncounterById(encounterId);
    if(!encounter) {
        throw new AppError('Encounter not found', 404);
    }
    return encounter;
}

export async function getEncounters(filters = {}) {
    const encounters = await encounterRepository.getEncounters(filters);
    return encounters || [];
}

