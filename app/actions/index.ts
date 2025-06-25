import { createServerFn } from '@tanstack/react-start'
import {
    and,
    eq,
    gte,
    SQLWrapper,
    sql,
    count,
    desc,
    ne,
    avg,
} from 'drizzle-orm'
import { db } from '@/db'
import { collection, match as matchTable } from '@/db/schema'
import { Maps } from '@/lib/maps'

import percentile from 'percentile'
import { z } from 'zod'
import OpenAI from 'openai/index.mjs'
import { zodResponseFormat } from 'openai/helpers/zod.mjs'
import sharp from 'sharp'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path/posix'
import fs from 'node:fs/promises'
import os from 'node:os'
import { tryCatch } from '@/lib/try-catch'
import { convertImageUrlToBuffer } from '@/lib/imageProcessing'
import { preprocessImage } from '@/lib/imageProcessing'

function roundToTwoDecimals(num: number) {
    return Math.round(num * 100) / 100
}

export const getLastYearOfDataGroupedByDay = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const today = new Date()
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
        const todayString = today.toISOString().split('T')[0]

        const cutoffDate = new Date()
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
        cutoffDate.setMinutes(
            cutoffDate.getMinutes() - cutoffDate.getTimezoneOffset(),
        )
        const cutoffString = cutoffDate.toISOString()
        const cutoffDateString = cutoffString.split('T')[0]

        const bounds = {
            start: {
                date: cutoffDateString,
                count: 0,
                level: 0,
            },
            end: {
                date: todayString,
                count: 0,
                level: 0,
            },
        }

        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        filters.push(gte(matchTable.matchTimestamp, cutoffString))
        const data = await db
            .select({
                matchDate: sql`DATE(${matchTable.matchTimestamp})`,
                count: sql`COUNT(*)`,
            })
            .from(matchTable)
            .where(and(...filters))
            .groupBy(sql`DATE(${matchTable.matchTimestamp})`)
            .orderBy(sql`DATE(${matchTable.matchTimestamp})`)
        console.log(data)

        let dataMapped = data.map(({ matchDate, count }) => {
            const offsetDate = new Date(matchDate as string)
            offsetDate.setMinutes(
                offsetDate.getMinutes() - offsetDate.getTimezoneOffset(),
            )
            return {
                date: offsetDate.toISOString().split('T')[0],
                count: Number(count),
                level: Number(count) > 10 ? 10 : Number(count),
            }
        })
        if (dataMapped.length === 0) return [bounds.start, bounds.end]
        if (dataMapped[0].date !== cutoffDateString)
            dataMapped.unshift(bounds.start)
        if (dataMapped[dataMapped.length - 1].date !== todayString)
            dataMapped.push(bounds.end)
        console.log(dataMapped)
        return dataMapped
    })

export const getActivityLoader = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const today = new Date()
        const todayString = today.toISOString().split('T')[0]
        const cutoffDate = new Date()
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
        const cutoffString = cutoffDate.toISOString()

        return [
            { date: cutoffString, count: 0, level: 0 },
            { date: todayString, count: 0, level: 0 },
        ]
    })

export const getMapCount = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                mapName: matchTable.mapName,
                count: count(),
            })
            .from(matchTable)
            .orderBy(desc(count()))
            .where(and(...filters))
            .groupBy(matchTable.mapName)
        return {
            labels: data.map(({ mapName }) => mapName),
            values: data.map(({ count }) => Number(count)),
        }
    })

export const getMapWinPercentage = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                mapName: matchTable.mapName,
                totalCount: count(),
                winCount: count(sql`CASE WHEN result = 'victory' THEN 1 END`),
            })
            .from(matchTable)
            .where(and(...filters))
            .groupBy(matchTable.mapName)
            .execute()

        return {
            labels: data.map(({ mapName }) => mapName),
            values: data.map(
                ({ winCount, totalCount }) => (winCount / totalCount) * 100,
            ),
        }
    })

export const getTotalMatches = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                count: count(),
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()
        return data[0].count
    })
export const getWinrateByDayOfWeek = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const daysOfWeekWr = {
            0: {
                name: 'Sunday',
                wins: 0,
                total: 0,
            },
            1: {
                name: 'Monday',
                wins: 0,
                total: 0,
            },
            2: {
                name: 'Tuesday',
                wins: 0,
                total: 0,
            },
            3: {
                name: 'Wednesday',
                wins: 0,
                total: 0,
            },
            4: {
                name: 'Thursday',
                wins: 0,
                total: 0,
            },
            5: {
                name: 'Friday',
                wins: 0,
                total: 0,
            },
            6: {
                name: 'Saturday',
                wins: 0,
                total: 0,
            },
        }
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        filters.push(ne(matchTable.result, 'draw'))
        const data = await db
            .select({
                matchTimestamp: matchTable.matchTimestamp,
                result: matchTable.result,
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()

        data.forEach(({ matchTimestamp, result }) => {
            const date = new Date(matchTimestamp)
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
            const dayOfWeek = date.getDay()
            daysOfWeekWr[dayOfWeek].wins += result === 'victory' ? 1 : 0
            daysOfWeekWr[dayOfWeek].total += 1
        })
        return {
            labels: Object.values(daysOfWeekWr).map(({ name }) => name),
            values: Object.values(daysOfWeekWr).map(
                ({ wins, total }) => (wins / total) * 100 || 0,
            ),
        }
    })

export const getAverageMatchDuration = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                matchDuration: avg(matchTable.duration),
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()
        const matchDurationSeconds = data[0].matchDuration
        if (matchDurationSeconds === null) return 0
        const matchDurationMinutes = Number(matchDurationSeconds) / 60
        return matchDurationMinutes
    })

export const getDrawRate = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({ resultType: matchTable.result, value: count() })
            .from(matchTable)
            .where(and(...filters))
            .groupBy(matchTable.result)
            .execute()
        const [draws] = data.filter(({ resultType }) => resultType === 'draw')
        const [wins] = data.filter(({ resultType }) => resultType === 'victory')
        const [loss] = data.filter(({ resultType }) => resultType === 'defeat')

        return (draws?.value / (wins?.value + loss?.value)) * 100
    })

export const getMapTypeWinrate = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                mapName: matchTable.mapName,
                result: matchTable.result,
            })
            .from(matchTable)
            .where(and(...filters, ne(matchTable.result, 'draw')))
            .execute()
        const buckets = {
            escort: [0, 0],
            control: [0, 0],
            flashpoint: [0, 0],
            hybrid: [0, 0],
            push: [0, 0],
        }
        data.forEach(({ mapName, result }) => {
            const mapInfo = Maps[mapName]
            if (!mapInfo) throw new Error(`Map ${mapName} not found`)
            if (result === 'victory') buckets[mapInfo.mapType][0] += 1
            buckets[mapInfo.mapType][1] += 1
        })
        return {
            labels: Object.keys(buckets),
            values: Object.values(buckets).map(
                ([wins, total]) => (wins / total) * 100,
            ),
        }
    })

export const getMapGroupedMatchDurationBoxPlotData = createServerFn({
    method: 'GET',
})
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                mapName: matchTable.mapName,
                duration: matchTable.duration,
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()

        const groupedByMap = data.reduce(
            (acc, curr) => {
                const mapName = curr.mapName
                if (!acc[mapName]) {
                    acc[mapName] = []
                }
                acc[mapName].push(curr.duration)
                return acc
            },
            {} as Record<string, number[]>,
        )
        const result: Record<string, number[]> = {}
        for (const mapName in groupedByMap) {
            const values = groupedByMap[mapName].map((v) => {
                try {
                    return roundToTwoDecimals(v / 60)
                } catch (e) {
                    return v
                }
            })
            const q3 = percentile(75, values) as number
            const q1 = percentile(25, values) as number
            const median = percentile(50, values) as number
            const minimum = Math.min(...values)
            const maximum = Math.max(...values)
            result[mapName] = [minimum, q1, median, q3, maximum]
        }
        return result
    })

export const getMapTypeGroupedMatchDurationBoxPlotData = createServerFn({
    method: 'GET',
})
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                mapName: matchTable.mapName,
                duration: matchTable.duration,
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()

        const groupedByMapType = data.reduce(
            (acc, curr) => {
                const mapName = curr.mapName
                const mapType = Maps[mapName].mapType
                if (!acc[mapType]) {
                    acc[mapType] = []
                }
                acc[mapType].push(curr.duration)
                return acc
            },
            {} as Record<string, number[]>,
        )
        const result: Record<string, number[]> = {}
        for (const mapName in groupedByMapType) {
            const values = groupedByMapType[mapName].map((v) => {
                try {
                    return roundToTwoDecimals(v / 60)
                } catch (e) {
                    return v
                }
            })
            const q3 = percentile(75, values) as number
            const q1 = percentile(25, values) as number
            const median = percentile(50, values) as number
            const minimum = Math.min(...values)
            const maximum = Math.max(...values)
            result[mapName] = [minimum, q1, median, q3, maximum]
        }
        return result
    })

export const getResultGroupedMatchDurationBoxPlotData = createServerFn({
    method: 'GET',
})
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        const data = await db
            .select({
                duration: matchTable.duration,
                result: matchTable.result,
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()

        const groupedByResult = data.reduce(
            (acc, curr) => {
                if (!acc[curr.result]) {
                    acc[curr.result] = []
                }
                acc[curr.result].push(curr.duration)
                return acc
            },
            {} as Record<string, number[]>,
        )
        const result: Record<string, number[]> = {}
        for (const mapName in groupedByResult) {
            const values = groupedByResult[mapName].map((v) => {
                try {
                    return roundToTwoDecimals(v / 60)
                } catch (e) {
                    return v
                }
            })
            const q3 = percentile(75, values) as number
            const q1 = percentile(25, values) as number
            const median = percentile(50, values) as number
            const minimum = Math.min(...values)
            const maximum = Math.max(...values)
            result[mapName] = [minimum, q1, median, q3, maximum]
        }
        return result
    })

export const getWinrate = createServerFn({ method: 'GET' })
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        filters.push(ne(matchTable.result, 'draw'))
        const data = await db
            .select({
                wins: count(sql`CASE WHEN result = 'victory' THEN 1 END`),
                total: count(),
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()
        const winrate = data[0].wins / data[0].total
        return winrate
    })

export const getWinrateLast7Days = createServerFn({ method: 'GET' })
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        filters.push(
            sql`date(${matchTable.matchTimestamp}) >= date('now', '-7 days')`,
        )
        filters.push(ne(matchTable.result, 'draw'))
        const data = await db
            .select({
                wins: count(sql`CASE WHEN result = 'victory' THEN 1 END`),
                total: count(),
            })
            .from(matchTable)
            .where(and(...filters))
            .execute()
        const winrate = data[0].wins / data[0].total
        return winrate
    })

export const getMatches = createServerFn({ method: 'GET' })
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const filters: SQLWrapper[] = []
        if (collectionId)
            filters.push(eq(matchTable.collectionId, collectionId))
        return db
            .select()
            .from(matchTable)
            .orderBy(desc(matchTable.id))
            .where(and(...filters))
            .all()
    })

export function validateCollectionId(collectionId: string) {
    if (collectionId === 'all') return undefined
    if (isNaN(Number(collectionId))) throw new Error('Invalid collection id')
    return Number(collectionId)
}

export const getCollection = createServerFn({ method: 'GET' })
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        if (collectionId === undefined) return undefined
        const collectionQueried = await db
            .select()
            .from(collection)
            .where(eq(collection.id, collectionId))
            .execute()
        return collectionQueried[0]
    })

export const deleteRecord = createServerFn({ method: 'POST' })
    .validator((data: { id: number }) => data)
    .handler(async ({ data: { id } }) => {
        await db.delete(matchTable).where(eq(matchTable.id, id)).execute()
        return
    })

const Match = z.object({
    mapName: z
        .enum([
            'Busan',
            'Ilios',
            'Lijiang Tower',
            'Nepal',
            'Oasis',
            'Circuit Royal',
            'Dorado',
            'Havana',
            'Junkertown',
            'Rialto',
            'Route 66',
            'Watchpoint: Gibraltar',
            'Blizzard World',
            'Eichenwalde',
            'Hollywood',
            "King's Row",
            'Midtown',
            'Numbani',
            'Paraiso',
            'Colosseo',
            'Esperanca',
            'New Queen Street',
            'New Junk City',
            'Suravasa',
            'Antarctic Peninsula',
            'Runasapi',
            'Samoa',
            'Shambali Monastery',
            'Aatlis'
        ])
        .describe('name of the map. If not found use Other'),
    result: z.enum(['victory', 'defeat', 'draw']),
    scoreSelf: z.number().describe('score of the player, left side'),
    scoreOpponent: z.number().describe('score of the player, right side'),
    matchDuration: z
        .string()
        .describe(
            'the duration of the match. This is a time stamp of only numbers separated by a colon. Example: 14:38',
        ),
    timeSinceMatch: z
        .string()
        .describe(
            'time since the match was played. A string containing a number and a plural unit of time, separated by a single space. Examples: 20 seconds ago, 2 hours ago, 21 minutes ago, 1 days ago, a moment ago.',
        ),
    matchType: z.enum(['competitive', 'unranked', 'arcade', 'custom game']),
})

export const MatchHistory = z.object({
    matches: z.array(Match),
})

export type ProcessResult = {
    image?: {
        url?: string
        error?: string
    }
    ocr?: {
        text?: string
        error?: string
    }
    llmGeneration?: {
        matches?: Awaited<ReturnType<typeof getOpenAiCompletion>>
        error?: string
    }
    dbInsertion?: {
        items?: any[]
        error?: string
    }
}

export const getOpenAiCompletion = createServerFn()
    .validator((data: { ocrText: string }) => data)
    .handler(async ({ data: { ocrText } }) => {
        console.log(process.env.OPENAI_API_KEY)
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
        const completion = await client.beta.chat.completions.parse({
            model: process.env.MODEL ?? 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are provided with a messy OCR extraction of an Overwatch 2 match history. This text may include extraneous information, OCR misinterpretations, or irrelevant data. Your task is to convert this unstructured and error-prone OCR output into a clean, structured format that accurately represents the match history details. The "timeSinceMatch" will be a sentence like string denoting the time since the match was played, and will end with "ago". The matchDuration is a timestamp. MM:SS.
Requirements:
1. Disregard any irrelevant or garbled text that does not contribute to the match history.
2. Follow these instructions strictly and avoid adding extra commentary or explanations outside the structured data output.`,
                },
                {
                    role: 'user',
                    content: ocrText,
                },
            ],
            response_format: zodResponseFormat(MatchHistory, 'matchHistory'),
        })
        console.log(completion.usage)
        console.log(completion.choices[0].message.parsed)
        return completion.choices[0].message.parsed
    })

const execAwaitable = promisify(exec)

export const runOcrPython = createServerFn()
    .validator((data: { imageUrl: string }) => data)
    .handler(async ({ data: { imageUrl } }) => {
        const buffer = convertImageUrlToBuffer(imageUrl)
        const imagePath = path.join(os.tmpdir(), `image.${Math.random()}.jpg`)
        await sharp(buffer).toFile(imagePath)
        const { stdout } = await execAwaitable(
            `cd ./ocr && uv run main.py "${imagePath}"`,
        )
        console.log(stdout)
        return stdout
    })

export async function convertDurationToSeconds(duration: string) {
    const [minutes, seconds] = duration.split(':')
    return Number(minutes) * 60 + Number(seconds)
}

export function MapTimeSinceMatchToDate(timeSinceMatch: string): Date {
    if (timeSinceMatch.toLowerCase() === 'a moment ago') return new Date()
    const now = new Date()
    const [amount, unit] = timeSinceMatch.split(' ')
    const value = Number(amount)

    const unitHandlers: Record<string, (date: Date, value: number) => void> = {
        seconds: (date, val) => date.setSeconds(date.getSeconds() - val),
        second: (date, val) => date.setSeconds(date.getSeconds() - val),
        minutes: (date, val) => date.setMinutes(date.getMinutes() - val),
        minute: (date, val) => date.setMinutes(date.getMinutes() - val),
        hours: (date, val) => date.setHours(date.getHours() - val),
        hour: (date, val) => date.setHours(date.getHours() - val),
        days: (date, val) => date.setDate(date.getDate() - val),
        day: (date, val) => date.setDate(date.getDate() - val),
        weeks: (date, val) => date.setDate(date.getDate() - val * 7),
        week: (date, val) => date.setDate(date.getDate() - val * 7),
        months: (date, val) => date.setMonth(date.getMonth() - val),
        month: (date, val) => date.setMonth(date.getMonth() - val),
        years: (date, val) => date.setFullYear(date.getFullYear() - val),
        year: (date, val) => date.setFullYear(date.getFullYear() - val),
    }

    const handler = unitHandlers[unit]
    if (!handler) {
        throw new Error(`Invalid time unit provided: ${unit}`)
    }

    handler(now, value)
    return now
}

export const ProcessMatchHistory = createServerFn({ method: 'POST' })
    .validator((data: { imageUrl: string; collectionId: number }) => data)
    .handler(async ({ data }) => {
        async function _ProcessMatchHistory(
            imageUrl: string,
            collectionId: number,
        ): Promise<ProcessResult> {
            const { data: processedImageUrl, error: eImagePreProcess } =
                await tryCatch(preprocessImage(imageUrl))
            if (eImagePreProcess) {
                console.error(eImagePreProcess)
                return {
                    image: {
                        error: eImagePreProcess.message,
                    },
                }
            }

            const { data: ocrText, error: eOcr } = await tryCatch(
                runOcrPython({ data: { imageUrl: processedImageUrl } }),
            )
            if (eOcr) {
                console.error(eOcr)
                return {
                    image: {
                        url: processedImageUrl,
                    },
                    ocr: {
                        error: eOcr.message,
                    },
                }
            }
            const { data: generatedMatches, error: eCompletion } =
                await tryCatch(getOpenAiCompletion({ data: { ocrText } }))

            if (eCompletion) {
                console.error(eCompletion)
                return {
                    image: {
                        url: processedImageUrl,
                    },
                    ocr: {
                        text: ocrText,
                    },
                    llmGeneration: {
                        error: eCompletion.message,
                    },
                }
            }

            if (!generatedMatches || generatedMatches.matches.length === 0) {
                console.log('LLM did not generate anything')
                return {
                    image: {
                        url: processedImageUrl,
                    },
                    ocr: {
                        text: ocrText,
                    },
                    llmGeneration: {
                        error: 'The LLM did not generate anything.',
                    },
                }
            }

            const genMatchReverse = generatedMatches.matches.reverse()

            const filters: SQLWrapper[] = []
            if (collectionId)
                filters.push(eq(matchTable.collectionId, collectionId))
            const last8Matches = await db
                .select()
                .from(matchTable)
                .where(and(...filters))
                .orderBy(desc(matchTable.id))
                .limit(8)
                .execute()
            const dedupedMatches: typeof genMatchReverse = []

            const seenMatches = new Set<string>()

            for (const cm of genMatchReverse) {
                const matchKey = `${cm.mapName}|${cm.result}|${cm.matchType}|${cm.scoreSelf}|${cm.scoreOpponent}|${cm.matchDuration}`
                const { data: matchDurationSeconds, error: eTimeConversion } =
                    await tryCatch(convertDurationToSeconds(cm.matchDuration))
                if (eTimeConversion) {
                    console.error(eTimeConversion)
                    return {
                        image: {
                            url: processedImageUrl,
                        },
                        ocr: {
                            text: ocrText,
                        },
                        llmGeneration: {
                            error: `Error converting generated time to seconds: ${eTimeConversion.message}`,
                        },
                    }
                }

                const isDuplicate = last8Matches.some(
                    (m) =>
                        m.mapName === cm.mapName &&
                        m.result === cm.result &&
                        m.matchType === cm.matchType &&
                        m.scoreSelf === cm.scoreSelf &&
                        m.scoreOpponent === cm.scoreOpponent &&
                        m.duration === matchDurationSeconds,
                )
                if (!isDuplicate && !seenMatches.has(matchKey)) {
                    dedupedMatches.push(cm)
                    seenMatches.add(matchKey)
                }
            }

            const insertedMatches: any[] = []

            dedupedMatches.forEach(async (match) => {
                const {
                    mapName,
                    result,
                    scoreSelf,
                    scoreOpponent,
                    matchDuration,
                    timeSinceMatch,
                    matchType,
                } = match

                if (matchType !== 'competitive') return
                const matchTimestamp =
                    MapTimeSinceMatchToDate(timeSinceMatch).toISOString()
                const { data: matchDurationSeconds, error: eTimeConversion } =
                    await tryCatch(convertDurationToSeconds(matchDuration))
                if (eTimeConversion) {
                    console.error(eTimeConversion)
                    return {
                        image: {
                            url: processedImageUrl,
                        },
                        ocr: {
                            text: ocrText,
                        },
                        llmGeneration: {
                            matches: {
                                genMatchReverse,
                            },
                        },
                        dbInsertion: {
                            error: `Error converting generated time to seconds: ${eTimeConversion.message}`,
                        },
                    }
                }
                const { data: insertedRecord, error: eInsertionError } =
                    await tryCatch(
                        db
                            .insert(matchTable)
                            .values({
                                mapName,
                                result,
                                scoreSelf,
                                scoreOpponent,
                                duration: matchDurationSeconds,
                                matchTimestamp,
                                matchType,
                                collectionId,
                            })
                            .returning({
                                id: matchTable.id,
                                mapName: matchTable.mapName,
                                result: matchTable.result,
                                scoreSelf: matchTable.scoreSelf,
                                scoreOpponent: matchTable.scoreOpponent,
                                duration: matchTable.duration,
                                matchTimestamp: matchTable.matchTimestamp,
                                matchType: matchTable.matchType,
                                collectoinId: matchTable.collectionId,
                            }),
                    )

                if (eInsertionError) {
                    console.error(eInsertionError)
                    return {
                        image: {
                            url: processedImageUrl,
                        },
                        ocr: {
                            text: ocrText,
                        },
                        llmGeneration: {
                            matches: {
                                matches: genMatchReverse,
                            },
                        },
                        dbInsertion: {
                            error: `Error inserting match: ${eInsertionError?.message}`,
                        },
                    }
                }
                insertedMatches.push(...insertedRecord)
            })

            return {
                image: {
                    url: processedImageUrl,
                },
                ocr: {
                    text: ocrText,
                },
                llmGeneration: {
                    matches: {
                        matches: genMatchReverse,
                    },
                },
                dbInsertion: {
                    items: insertedMatches,
                },
            }
        }
        return await _ProcessMatchHistory(data.imageUrl, data.collectionId)
    })

export const deleteRecords = createServerFn({ method: 'POST' })
    .validator((data: { ids: bigint[] }) => data)
    .handler(async ({ data }) => {
        for (const id of data.ids) {
            await db
                .delete(matchTable)
                .where(eq(matchTable.id, Number(id)))
                .execute()
        }
        return
    })
