import type { GetFutureListensResponse } from '#shared/schema';
import { FutureListenService } from '../../services/futureListen.service';

export default defineEventHandler<Promise<GetFutureListensResponse>>(
  async (event) => {
    const { userId } = event.context;
    const service = new FutureListenService();

    const items = await service.getFutureListens(userId);

    return { items };
  },
);
