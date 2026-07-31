import { BusinessRuleError } from '../../shared/common/domain-errors';
import { ItineraryService } from './itinerary.service';

describe('ItineraryService date handling', () => {
  it('rejects an impossible manual date when called outside the controller', async () => {
    const prisma = {
      itinerary: { create: jest.fn() },
    };
    const service = new ItineraryService(prisma as never, {} as never);

    await expect(
      service.createItinerary(
        'group-id',
        {
          title: 'Trip',
          startDate: '2026-02-30',
          endDate: '2026-03-03',
        },
        'user-id',
      ),
    ).rejects.toThrow(BusinessRuleError);
    expect(prisma.itinerary.create).not.toHaveBeenCalled();
  });

  it('normalizes Group timestamps before calculating inclusive duration', async () => {
    const prisma = {
      group: {
        findUnique: jest.fn().mockResolvedValue({
          startDate: new Date('2026-12-01T08:00:00.000Z'),
          endDate: new Date('2026-12-02T18:00:00.000Z'),
          budgetGoal: null,
          currency: 'VND',
        }),
      },
    };
    const planningService = {
      generateItinerary: jest.fn().mockResolvedValue({}),
    };
    const service = new ItineraryService(prisma as never, planningService as never);

    await service.generateAiItinerary('group-id', {
      destination: 'Da Nang',
      requestedBy: 'user-id',
    });

    expect(planningService.generateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        endDate: new Date('2026-12-02T00:00:00.000Z'),
        duration: 2,
      }),
    );
  });

  it('uses an inclusive three-day fallback', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-12-01T18:00:00.000Z'));
    const prisma = {
      group: {
        findUnique: jest.fn().mockResolvedValue({
          startDate: null,
          endDate: null,
          budgetGoal: null,
          currency: 'VND',
        }),
      },
    };
    const planningService = {
      generateItinerary: jest.fn().mockResolvedValue({}),
    };
    const service = new ItineraryService(prisma as never, planningService as never);

    await service.generateAiItinerary('group-id', {
      destination: 'Da Nang',
      requestedBy: 'user-id',
    });

    expect(planningService.generateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        endDate: new Date('2026-12-03T00:00:00.000Z'),
        duration: 3,
      }),
    );
    jest.useRealTimers();
  });
});
