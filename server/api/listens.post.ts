import type { AddAlbumListenBody } from '~~/shared/schema';
import { DailyListenService } from '../services/dailyListen.service';

export default defineEventHandler(async (event) => {
  const service = new DailyListenService();
  const userId = event.context.userId;

  const body = await readBody<AddAlbumListenBody>(event);

  await service.addAlbumListen(userId, body);
});
