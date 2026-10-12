import { prisma } from '../../config/db.js';

// GET lab results with patient scoping and filtering
export const getLabResults = async (req, res) => {
  try {
    let { patientId, encounterId, limit } = req.query;
    const where = {};

    // Enforce patient scoping for PATIENT role
    if (
      req.userRoles &&
      req.userRoles.includes('PATIENT') &&
      !req.userRoles.some((r) =>
        ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'LAB_MANAGER'].includes(r)
      )
    ) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.userId },
        select: { patientId: true },
      });
      if (!patient) {
        return res.json([]);
      }
      patientId = patient.patientId;
    }

    if (patientId) {
      where.encounter = {
        patientId,
      };
    }

    if (encounterId) {
      where.encounterId = encounterId;
    }

    const take = limit ? Math.min(Number(limit), 100) : undefined;

    const results = await prisma.labResult.findMany({
      where,
      include: {
        labTest: true,
        encounter: {
          select: {
            encounterId: true,
            patientId: true,
            doctorId: true,
            hospitalId: true,
            scheduledTime: true,
            hospital: {
              select: {
                hospitalId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { reportedAt: 'desc' },
      take,
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET lab result by ID with authorization check
export const getLabResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.labResult.findUnique({
      where: { resultId: id },
      include: {
        labTest: true,
        encounter: {
          select: {
            encounterId: true,
            patientId: true,
            doctorId: true,
            hospitalId: true,
            scheduledTime: true,
            hospital: {
              select: {
                hospitalId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      return res.status(404).json({ error: 'Lab result not found' });
    }

    // Ownership check for PATIENT
    if (
      req.userRoles &&
      req.userRoles.includes('PATIENT') &&
      !req.userRoles.some((r) =>
        ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'LAB_MANAGER'].includes(r)
      )
    ) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.userId },
        select: { patientId: true },
      });
      if (!patient || result.encounter?.patientId !== patient.patientId) {
        return res.status(403).json({
          error: 'Access denied: You can only view your own lab results.',
        });
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE lab result
export const createLabResult = async (req, res) => {
  try {
    const {
      encounterId,
      labTestId,
      resultValue,
      isAbnormal,
      remarks,
      actionsTaken,
    } = req.body;

    if (!encounterId || !labTestId || resultValue === undefined) {
      return res.status(400).json({
        error: 'encounterId, labTestId, and resultValue are required',
      });
    }

    const result = await prisma.labResult.create({
      data: {
        encounterId,
        labTestId,
        resultValue: String(resultValue),
        isAbnormal: Boolean(isAbnormal),
        remarks: remarks || null,
        actionsTaken: actionsTaken || null,
      },
      include: {
        labTest: true,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};