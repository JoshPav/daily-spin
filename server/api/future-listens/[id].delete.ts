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

  try {
    await service.removeFutureListen(userId, id);
  } catch {
    throw createError({
      statusCode: 404,
      message: 'Future listen not found',
    });
  }
});
