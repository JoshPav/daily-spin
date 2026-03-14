import { NoSkipRepository } from '~~/server/repositories/noSkip.repository';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { toggleNoSkipSchema } from '~~/shared/schemas/noSkip.schema';

export default createEventHandler(toggleNoSkipSchema, async (event) => {
  const log = createContextLogger(event, 'API:no-skip.patch');
  const { spotifyAlbumId } = event.validatedParams;
  const { noSkip } = event.validatedBody;
  const { userId } = event.context;

  log.info('Toggling no-skip label', { spotifyAlbumId, noSkip });

  const repo = new NoSkipRepository();
  const result = await repo.setNoSkip(userId, spotifyAlbumId, noSkip);

  log.info('Successfully toggled no-skip label', {
    spotifyAlbumId,
    noSkip: result,
  });

  return { noSkip: result };
});
