import type { GetBacklogResponse } from '#shared/schema';
import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler<Promise<GetBacklogResponse>>(
  async (event) => {
    const { userId } = event.context;
    const backlogService = new BacklogService();

    const albums = await backlogService.getBacklog(userId);

    return { albums };
  },
);
