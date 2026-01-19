import { DailyListenService } from '~~/server/services/dailyListen.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { addListenSchema } from '~~/shared/schemas/listens.schema';

export default createEventHandler(addListenSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens.post');
  const service = new DailyListenService();
  const { userId } = event.context;
  const body = event.validatedBody;

  log.info('Manually logging album listen', {
    albumId: body.album.albumId,
    albumName: body.album.albumName,
    date: body.date,
    listenMethod: body.listenMetadata.listenMethod,
  });

  await service.addAlbumListen(userId, body);

  log.info('Successfully logged album listen', {
    albumId: body.album.albumId,
  });
});
