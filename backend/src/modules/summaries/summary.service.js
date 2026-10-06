import * as summaryRepo from './summary.repo.js';

export async function createSummary(data) {
  return await summaryRepo.createSummary(data);
}

export async function getSummaryById(summaryId) {
  return await summaryRepo.getSummaryById(summaryId);
}

export async function getSummaries(filters = {}) {
  const summaries = await summaryRepo.getSummaries(filters);
  return summaries || [];
}
