import { BadGatewayException } from '@nestjs/common';
import { PlanningService } from './planning.service';

const baseItem = {
  day: 1,
  order: 1,
  title: 'Breakfast',
  startTime: '08:00',
  endTime: '09:00',
};

const params = {
  groupId: 'group-id',
  destination: 'Da Nang',
  startDate: new Date('2026-12-01T00:00:00.000Z'),
  endDate: new Date('2026-12-03T00:00:00.000Z'),
  duration: 3,
  requestedBy: 'user-id',
};

function createService(rawPlan: unknown) {
  const geminiService = {
    generateJsonContent: jest.fn().mockResolvedValue(rawPlan),
  };
  const prisma = {
    itinerary: {
      create: jest.fn().mockImplementation((value) => value),
    },
  };

  return {
    service: new PlanningService(geminiService as never, prisma as never),
    prisma,
  };
}

describe('PlanningService AI validation', () => {
  it('rejects an item outside the itinerary range', async () => {
    const { service, prisma } = createService({
      title: 'Trip',
      items: [{ ...baseItem, day: 4 }],
    });

    await expect(service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
    expect(prisma.itinerary.create).not.toHaveBeenCalled();
  });

  it('validates the final mapped date even if duration input is inconsistent', async () => {
    const { service, prisma } = createService({
      title: 'Trip',
      items: [{ ...baseItem, day: 3 }],
    });

    await expect(
      service.generateItinerary({
        ...params,
        endDate: new Date('2026-12-02T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadGatewayException);
    expect(prisma.itinerary.create).not.toHaveBeenCalled();
  });

  it('rejects missing day or order instead of applying defaults', async () => {
    const { day: _day, order: _order, ...missingPosition } = baseItem;
    const { service, prisma } = createService({
      title: 'Trip',
      items: [missingPosition],
    });

    await expect(service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
    expect(prisma.itinerary.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate and non-sequential positions', async () => {
    const duplicate = createService({
      title: 'Trip',
      items: [baseItem, { ...baseItem, title: 'Museum', startTime: '09:30', endTime: '10:30' }],
    });
    const nonSequential = createService({
      title: 'Trip',
      items: [{ ...baseItem, order: 2 }],
    });

    await expect(duplicate.service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
    await expect(nonSequential.service.generateItinerary(params)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('rejects order values that collide with the next day block', async () => {
    const { service } = createService({
      title: 'Trip',
      items: [{ ...baseItem, order: 101 }],
    });

    await expect(service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
  });

  it('rejects reverse and overlapping time ranges', async () => {
    const reverse = createService({
      title: 'Trip',
      items: [{ ...baseItem, startTime: '18:00', endTime: '09:00' }],
    });
    const overlap = createService({
      title: 'Trip',
      items: [
        { ...baseItem, endTime: '10:00' },
        {
          ...baseItem,
          order: 2,
          title: 'Museum',
          startTime: '09:00',
          endTime: '11:00',
        },
      ],
    });

    await expect(reverse.service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
    await expect(overlap.service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
  });

  it('rejects order numbers that do not follow activity times', async () => {
    const { service } = createService({
      title: 'Trip',
      items: [
        { ...baseItem, startTime: '10:00', endTime: '11:00' },
        {
          ...baseItem,
          order: 2,
          title: 'Museum',
          startTime: '08:00',
          endTime: '09:00',
        },
      ],
    });

    await expect(service.generateItinerary(params)).rejects.toThrow(BadGatewayException);
  });

  it('persists a valid plan with deterministic order numbers', async () => {
    const { service, prisma } = createService({
      title: 'Trip',
      items: [
        baseItem,
        {
          ...baseItem,
          day: 2,
          title: 'Beach',
          startTime: '09:00',
          endTime: '11:00',
        },
      ],
    });

    await service.generateItinerary(params);

    const createArgs = prisma.itinerary.create.mock.calls[0]?.[0];
    expect(createArgs?.data.items.createMany.data).toEqual([
      expect.objectContaining({
        orderNo: 1,
        startTime: new Date('2026-12-01T08:00:00.000Z'),
      }),
      expect.objectContaining({
        orderNo: 101,
        startTime: new Date('2026-12-02T09:00:00.000Z'),
      }),
    ]);
  });

  it('applies the same validation to AI edits', async () => {
    const { service } = createService({
      items: [{ ...baseItem, day: 4 }],
    });
    const itinerary = {
      id: 'itinerary-id',
      groupId: 'group-id',
      createdBy: 'user-id',
      title: 'Trip',
      description: null,
      destination: 'Da Nang',
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      endDate: new Date('2026-12-03T00:00:00.000Z'),
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      group: { currency: 'VND' },
    };

    await expect(
      service.modifyEntireItinerary(itinerary as never, 'Add one activity'),
    ).rejects.toThrow(BadGatewayException);
  });
});
