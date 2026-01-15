import type {
  AddBacklogItemBody,
  AddBacklogItemResponse,
} from '~~/shared/schema';
import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler(
  async (event): Promise<AddBacklogItemResponse> => {
    const service = new BacklogService();
    const userId = event.context.userId;

    const body = await readBody<AddBacklogItemBody>(event);

    const item = await service.addBacklogItem(userId, body);

    return {
      id: item.id,
      type: item.type,
      spotifyId: item.spotifyId,
      name: item.name,
      imageUrl: item.imageUrl,
      artistNames: item.artistNames,
      addedAt: item.addedAt.toISOString(),
    };
  },
);
