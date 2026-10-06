import { prisma } from '../../config/db.js';

export async function createSummary(data) {
  return await prisma.summary.create({
    data: {
      patientId: data.patientId,
      encounterId: data.encounterId,
      keyFindings: data.keyFindings,
      recommendations: data.recommendations,
      medicalHistory: data.medicalHistory,
      labHistory: data.labHistory,
      riskFactors: data.riskFactors,
      generatedBy: data.generatedBy || 'Medical System',
      generatedAt: data.generatedAt || new Date(),
    },
  });
}

export async function getSummaryById(summaryId) {
  return await prisma.summary.findUnique({
    where: { summaryId },
  });
}

export async function getSummaries(filters = {}) {
  const where = {};

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.encounterId) {
    where.encounterId = filters.encounterId;
  }

  return await prisma.summary.findMany({
    where,
    orderBy: {
      generatedAt: 'desc',
    },
  });
}
