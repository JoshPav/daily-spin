import type { AddAlbumListenBody } from '~~/shared/schema';
import { DailyListenService } from '../services/dailyListen.service';
import { handleError } from '../utils/errorHandler';
import { createTaggedLogger } from '../utils/logger';
import { getLogContext } from '../utils/requestContext';

const logger = createTaggedLogger('API:listens.post');

export default defineEventHandler(async (event) => {
  const service = new DailyListenService();
  const userId = event.context.userId;
  const logContext = getLogContext(event);

  const body = await readBody<AddAlbumListenBody>(event);

  logger.info('Manually logging album listen', {
    ...logContext,
    albumId: body.album.albumId,
    albumName: body.album.albumName,
    date: body.date,
    listenMethod: body.listenMetadata.listenMethod,
  });

  try {
    await service.addAlbumListen(userId, body);

    logger.info('Successfully logged album listen', {
      ...logContext,
      albumId: body.album.albumId,
    });
  } catch (error) {
    throw handleError(error, {
      ...logContext,
      albumId: body.album.albumId,
    });
  }
});
