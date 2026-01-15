import type { AddAlbumListenBody, DailyListens } from '#shared/schema';
import { mapDailyListens } from '../mappers/listenMapper';
import {
  type AlbumListen,
  DailyListenRepository,
} from '../repositories/dailyListen.repository';
import { UserRepository } from '../repositories/user.repository';
import { dateInRange, isToday } from '../utils/datetime.utils';
import { BacklogService } from './backlog.service';
import { RecentlyPlayedService } from './recentlyPlayed.service';

export class DailyListenService {
  constructor(
    private dailyListenRepo = new DailyListenRepository(),
    private userRepo = new UserRepository(),
    private backlogService = new BacklogService(),
  ) {}

  async addAlbumListen(userId: string, body: AddAlbumListenBody) {
    const dateOfListens = new Date(body.date);

    await this.dailyListenRepo.saveListens(
      userId,
      [this.mapAddAlbumBody(body)],
      dateOfListens,
    );

    // Remove album from backlog if present
    await this.backlogService.removeBacklogItemByAlbumSpotifyId(
      userId,
      body.album.albumId,
    );
  }

  private mapAddAlbumBody({
    album: { albumId, albumName, artistNames, imageUrl },
    listenMetadata: {
      listenOrder = 'ordered',
      listenMethod = 'spotify',
      listenTime,
    },
  }: AddAlbumListenBody): AlbumListen {
    return {
      albumId,
      albumName,
      artistNames,
      imageUrl,
      listenOrder,
      listenMethod,
      listenTime,
    };
  }

  async getListensInRange(userId: string, range: { start: Date; end: Date }) {
    const listens = await this.dailyListenRepo.getListens(
      userId,
      range.start,
      range.end,
    );

    const shouldAutoFetch = process.env.DISABLE_AUTO_FETCH !== 'true';

    if (
      shouldAutoFetch &&
      dateInRange(new Date(), range) &&
      !listens.find((listen) => isToday(listen.date))
    ) {
      // If today is in desired range and we don't have it yet, lets try calc that.
      console.info("Missing today's data, attempting to calculate it...");
      const service = new RecentlyPlayedService();

      const user = await this.userRepo.getUser(userId);

      if (user) {
        const todaysListens = await service.processTodaysListens({
          id: user.id,
          auth: user.accounts[0],
        });

        if (todaysListens) {
          console.info('Found data for today, appending to results...');
          listens.push(todaysListens);
        } else {
          console.info('No data found for data');
        }
      }
    }

    const mappedListens = listens.map(mapDailyListens);

    // Fill in missing days with empty albums array
    return this.fillMissingDays(mappedListens, range.start, range.end);
  }

  private fillMissingDays(
    listens: DailyListens[],
    startDate: Date,
    endDate: Date,
  ): DailyListens[] {
    const listensByDate = new Map<string, DailyListens>();

    // Index existing listens by date
    for (const listen of listens) {
      const dateKey = new Date(listen.date).toISOString().split('T')[0];
      listensByDate.set(dateKey, listen);
    }

    // Generate all days in range
    const result: DailyListens[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];

      const existingListen = listensByDate.get(dateKey);
      if (existingListen) {
        result.push(existingListen);
      } else {
        // Create empty entry for missing day
        result.push({
          date: new Date(currentDate).toISOString(),
          albums: [],
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }
}
