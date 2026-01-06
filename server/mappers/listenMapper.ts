import { Prisma } from "@prisma/client"
import { DailyListens } from "../schema"

export const mapDailyListens = (dailyListens: Prisma.DailyListenGetPayload<{
  include: { albums: true }
}>): DailyListens => ({
  dayOfMonth: dailyListens.date.getDate(),
  albums: dailyListens.albums.map(album => album.albumId)
})
