import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateItineraryDto } from './create-itinerary.dto';

describe('CreateItineraryDto', () => {
  it.each(['2026-02-30', '2026-04-31', '2026-00-10', '2026-13-01'])(
    'rejects invalid calendar date %s',
    async (startDate) => {
      const dto = plainToInstance(CreateItineraryDto, {
        title: 'Trip',
        startDate,
        endDate: '2026-12-31',
      });

      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('accepts a valid leap day and ordered range', async () => {
    const dto = plainToInstance(CreateItineraryDto, {
      title: 'Trip',
      startDate: '2024-02-29',
      endDate: '2024-03-01',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects timestamps', async () => {
    const dto = plainToInstance(CreateItineraryDto, {
      title: 'Trip',
      startDate: '2026-12-01T00:00:00.000Z',
      endDate: '2026-12-05T00:00:00.000Z',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
