import * as summaryService from './summary.service.js';

export const getById = async (req, res, next) => {
  try {
    const summaryId = req.params.id;
    const summary = await summaryService.getSummaryById(summaryId);

    if (!summary) {
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Medical summary not found',
      });
    }

    // Enforce patient ownership check
    if (
      req.userRoles &&
      req.userRoles.includes('PATIENT') &&
      !req.userRoles.some((r) =>
        ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r)
      )
    ) {
      const { prisma } = await import('../../config/db.js');
      const patient = await prisma.patient.findUnique({
        where: { userId: req.userId },
        select: { patientId: true },
      });
      if (!patient || summary.patientId !== patient.patientId) {
        return res.status(403).json({
          status: 'FORBIDDEN',
          message: 'Access denied: You can only view your own medical summaries.',
        });
      }
    }

    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};

export const getAll = async (req, res, next) => {
  try {
    let { patientId, encounterId } = req.query;

    // Enforce patient scoping for PATIENT role
    if (
      req.userRoles &&
      req.userRoles.includes('PATIENT') &&
      !req.userRoles.some((r) =>
        ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r)
      )
    ) {
      const { prisma } = await import('../../config/db.js');
      const patient = await prisma.patient.findUnique({
        where: { userId: req.userId },
        select: { patientId: true },
      });
      if (!patient) {
        return res.status(200).json([]);
      }
      patientId = patient.patientId;
    }

    const summaries = await summaryService.getSummaries({
      patientId,
      encounterId,
    });
    res.status(200).json(summaries);
  } catch (err) {
    next(err);
  }
};
