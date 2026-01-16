import { eachDayOfInterval, format, startOfDay } from 'date-fns';
import type { AddAlbumListenBody, DailyListens } from '#shared/schema';
import { mapDailyListens } from '../mappers/listenMapper';
import {
  type AlbumListenInput,
  DailyListenRepository,
} from '../repositories/dailyListen.repository';
import { UserRepository } from '../repositories/user.repository';
import { dateInRange, isToday } from '../utils/datetime.utils';
import { createTaggedLogger } from '../utils/logger';
import { BacklogService } from './backlog.service';
import { RecentlyPlayedService } from './recentlyPlayed.service';

const logger = createTaggedLogger('Service:DailyListen');

export class DailyListenService {
  constructor(
    private dailyListenRepo = new DailyListenRepository(),
    private userRepo = new UserRepository(),
    private backlogService = new BacklogService(),
  ) {}

  async addAlbumListen(userId: string, body: AddAlbumListenBody) {
    const dateOfListens = new Date(body.date);

    logger.info('Adding album listen', {
      userId,
      albumId: body.album.albumId,
      date: body.date,
    });

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

    logger.info('Successfully added album listen', {
      userId,
      albumId: body.album.albumId,
    });
  }

  private mapAddAlbumBody({
    album: { albumId, albumName, imageUrl, artists },
    listenMetadata: {
      listenOrder = 'ordered',
      listenMethod = 'spotify',
      listenTime,
    },
  }: AddAlbumListenBody): AlbumListenInput {
    return {
      album: {
        spotifyId: albumId,
        name: albumName,
        imageUrl,
        artists: artists
          ? artists.map((artist) => ({
              spotifyId: artist.spotifyId,
              name: artist.name,
              imageUrl: artist.imageUrl,
            }))
          : [],
      },
      listenOrder,
      listenMethod,
      listenTime,
    };
  }

  async getListensInRange(userId: string, range: { start: Date; end: Date }) {
    logger.debug('Fetching listens in date range', {
      userId,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
    });

    const listens = await this.dailyListenRepo.getListens(
      userId,
      range.start,
      range.end,
    );

    const shouldAutoFetch = useRuntimeConfig().disableAutoFetch !== 'true';

    if (
      shouldAutoFetch &&
      dateInRange(new Date(), range) &&
      !listens.find((listen) => isToday(listen.date))
    ) {
      // If today is in desired range and we don't have it yet, lets try calc that.
      logger.info("Missing today's data, attempting to calculate it", {
        userId,
      });
      const service = new RecentlyPlayedService();

      const user = await this.userRepo.getUser(userId);

      if (user?.accounts[0]) {
        const todaysListens = await service.processTodaysListens({
          id: user.id,
          auth: user.accounts[0],
        });

        if (todaysListens) {
          logger.info('Found data for today, appending to results', {
            userId,
          });
          listens.push(todaysListens);
        } else {
          logger.info('No data found for today', {
            userId,
          });
        }
      }
    }

    const mappedListens = listens.map(mapDailyListens);

    logger.debug('Fetched listens successfully', {
      userId,
      listenCount: mappedListens.length,
    });

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
      const dateKey = format(new Date(listen.date), 'yyyy-MM-dd');
      listensByDate.set(dateKey, listen);
    }

    // Generate all days in range and fill missing days
    return eachDayOfInterval({
      start: startOfDay(startDate),
      end: startOfDay(endDate),
    }).map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const existingListen = listensByDate.get(dateKey);

      if (existingListen) {
        return existingListen;
      }

      // Create empty entry for missing day
      return {
        date: day.toISOString(),
        albums: [],
      };
    });
  }
}
