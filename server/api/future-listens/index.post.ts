import { FutureListenService } from '~~/server/services/futureListen.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { addFutureListenSchema } from '~~/shared/schemas/futureListen.schema';

export default createEventHandler(addFutureListenSchema, async (event) => {
  const log = createContextLogger(event, 'API:future-listens.post');
  const { userId } = event.context;
  const body = event.validatedBody;
  const service = new FutureListenService();

  log.info('Adding future listen', {
    albumSpotifyId: body.spotifyId,
    scheduledDate: body.date,
  });

  const result = await service.addFutureListen(userId, body);

  log.info('Successfully added future listen', {
    futureListenId: result.id,
    albumSpotifyId: body.spotifyId,
  });

  return result;
});
