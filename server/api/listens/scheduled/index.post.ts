import { ScheduledListenService } from '~~/server/services/scheduledListen.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { addScheduledListenSchema } from '~~/shared/schemas/scheduledListen.schema';

export default createEventHandler(addScheduledListenSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens/scheduled.post');
  const { userId } = event.context;
  const body = event.validatedBody;
  const service = new ScheduledListenService();

  log.info('Adding scheduled listen', {
    albumSpotifyId: body.spotifyId,
    scheduledDate: body.date,
  });

  const result = await service.addScheduledListen(userId, body);

  log.info('Successfully added scheduled listen', {
    scheduledListenId: result.id,
    albumSpotifyId: body.spotifyId,
  });

  return result;
});
