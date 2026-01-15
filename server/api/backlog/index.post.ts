import type {
  AddBacklogItemsBody,
  AddBacklogItemsResponse,
} from '~~/shared/schema';
import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler(
  async (event): Promise<AddBacklogItemsResponse> => {
    const service = new BacklogService();
    const userId = event.context.userId;

    const body = await readBody<AddBacklogItemsBody>(event);

    return await service.addBacklogItems(userId, body);
  },
);
