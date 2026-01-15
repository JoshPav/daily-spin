import type { AddFutureListenBody, FutureListenItem } from '#shared/schema';
import { FutureListenService } from '../../services/futureListen.service';

export default defineEventHandler(async (event): Promise<FutureListenItem> => {
  const { userId } = event.context;
  const service = new FutureListenService();

  const body = await readBody<AddFutureListenBody>(event);

  return await service.addFutureListen(userId, body);
});
