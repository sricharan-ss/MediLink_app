import { prisma } from '../../config/db.js';

// GET all lab tests
export const getLabTests = async (req, res) => {
  try {
    const tests = await prisma.labTest.findMany();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE lab test
export const createLabTest = async (req, res) => {
  try {
    const { testName, unit, normalRange } = req.body;

    const test = await prisma.labTest.create({
      data: { testName, unit, normalRange },
    });

    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};