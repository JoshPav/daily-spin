import { getSpotifyApiClient } from '../clients/spotify';
import { mapDailyListens } from '../mappers/listenMapper';
import { DailyListenRepository } from '../repositories/dailyListen.repository';
import { dateInRange, isToday } from '../utils/datetime.utils';
import { RecentlyPlayedService } from './recentlyPlayed.service';

export class DailyListenService {
  constructor(private dailyListenRepo = new DailyListenRepository()) {}

  async getListensInRange(userId: string, range: { start: Date; end: Date }) {
    const listens = await this.dailyListenRepo.getListens(
      userId,
      range.start,
      range.end,
    );

    if (
      dateInRange(new Date(), range) &&
      !listens.find((listen) => isToday(listen.date))
    ) {
      // If today is in desired range and we don't have it yet, lets try calc that.
      console.info("Missing today's data, attempting to calculate it...");
      const service = new RecentlyPlayedService(getSpotifyApiClient());

      const todaysListens = await service.processTodaysListens(userId);

      if (todaysListens) {
        console.info('Found data for today, appending to results...');
        listens.push(todaysListens);
      }
    }

    return listens.map(mapDailyListens);
  }
}
