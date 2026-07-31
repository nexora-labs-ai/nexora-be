import { BadGatewayException } from '@nestjs/common';
import { RecommendationAiService } from './recommendation.service';

function createService(raw: unknown, expenses: unknown[] = [{}]) {
  const geminiService = {
    generateJsonContent: jest.fn().mockResolvedValue(raw),
  };
  const prisma = {
    expense: {
      findMany: jest.fn().mockResolvedValue(expenses),
    },
  };

  return {
    service: new RecommendationAiService(geminiService as never, prisma as never),
    geminiService,
  };
}

describe('RecommendationAiService budget analysis', () => {
  it('returns an explicit state without calling AI when expenses are empty', async () => {
    const { service, geminiService } = createService({}, []);

    await expect(service.generateBudgetAnalysis('group-id')).resolves.toEqual({
      status: 'error',
      message: 'Not enough expense data',
    });
    expect(geminiService.generateJsonContent).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { foo: 'bar' },
    {
      status: 'success',
      data: {
        summary: 'Summary',
        trends: 'Stable',
        topCategories: ['Food'],
        savingOpportunities: 'Cook more',
        projectedMonthlySpend: null,
      },
    },
    {
      status: 'success',
      data: {
        summary: 'Summary',
        trends: 'Stable',
        topCategories: ['Food'],
        savingOpportunities: 'Cook more',
        projectedMonthlySpend: 100,
      },
      message: 'Contradictory',
    },
  ])('rejects invalid AI budget response %#', async (raw) => {
    const { service } = createService(raw);

    await expect(service.generateBudgetAnalysis('group-id')).rejects.toThrow(BadGatewayException);
  });

  it('accepts a strict success response', async () => {
    const raw = {
      status: 'success',
      data: {
        summary: 'Summary',
        trends: 'Stable',
        topCategories: ['Food'],
        savingOpportunities: 'Cook more',
        projectedMonthlySpend: 100,
      },
    };
    const { service } = createService(raw);

    await expect(service.generateBudgetAnalysis('group-id')).resolves.toEqual(raw);
  });
});
