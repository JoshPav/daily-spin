import { FutureListenService } from '../../services/futureListen.service';

export default defineEventHandler(async (event): Promise<void> => {
  const { userId } = event.context;
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Missing future listen ID',
    });
  }

  const service = new FutureListenService();

  await service.removeFutureListen(userId, id);
});
