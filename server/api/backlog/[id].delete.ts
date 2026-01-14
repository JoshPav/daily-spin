import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Missing id parameter',
    });
  }

  const { userId } = event.context;
  const service = new BacklogService();

  try {
    await service.removeBacklogItem(userId, id);
  } catch {
    throw createError({
      statusCode: 404,
      message: 'Backlog item not found',
    });
  }

  setResponseStatus(event, 204);
  return null;
});
