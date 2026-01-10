import type { AddAlbumListenBody } from '~~/shared/schema';
import { DailyListenService } from '../services/dailyListen.service';
import { getUserId } from '../utils/auth.utils';

export default defineEventHandler(async (event) => {
  const service = new DailyListenService();
  const userId = getUserId();

  const body = await readBody<AddAlbumListenBody>(event);

  await service.addAlbumListen(userId, body);
});
