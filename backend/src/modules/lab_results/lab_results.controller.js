import { prisma } from '../../config/db.js';

// GET all lab results
export const getLabResults = async (req, res) => {
  try {
    const results = await prisma.labResult.findMany({
      include: { labTest: true },
      orderBy: { reportedAt: "desc" },
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE lab result
export const createLabResult = async (req, res) => {
  try {
    const { encounterId, labTestId, resultValue, isAbnormal } = req.body;

    const result = await prisma.labResult.create({
      data: {
        encounterId,
        labTestId,
        resultValue,
        isAbnormal,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};