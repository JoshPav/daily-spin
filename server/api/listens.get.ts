import prisma from '../utils/prisma'
import { mapDailyListens } from '../mappers/listenMapper'
import { GetListensQueryParams, GetListensResponse } from '../schema'

export default defineEventHandler<Promise<GetListensResponse>>(async (event) => {
  const query = getQuery<GetListensQueryParams>(event)

  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
  const month = query.month ? parseInt(query.month as string) : new Date().getMonth() + 1

  const userId = 'cmk3492kb0000hah2069i2dmn' // TODO: Get from session once auth is set up

  if (month < 1 || month > 12) {
    throw createError({
      statusCode: 400,
      message: 'month must be between 1 and 12'
    })
  }

  // Calculate start and end dates for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const listens = await prisma.dailyListen.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      albums: true
    },
    orderBy: {
      date: 'asc'
    }
  })

  return listens.map(mapDailyListens)
})
