import { createFileRoute } from '@tanstack/react-router'
import React, { useCallback, useEffect, useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { getOpenAiClient } from '@/actions'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import sharp from 'sharp'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { db } from '@/db'
import { collection, match as matchTable } from '@/db/schema'
import { and, desc, eq, SQLWrapper } from 'drizzle-orm'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import OpenAI from 'openai'

const GetCollections = createServerFn().handler(async () => {
    const data = await db.select().from(collection).execute()
    return data
})

const model = 'gpt-4o'
export const Route = createFileRoute('/import')({
    component: RouteComponent,
    loader: async () => {
        return {
            collections: await GetCollections(),
        }
    },
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
            'Throne of Anubis',
            'Hanaoka',
            'Antarctic Peninsula',
            'Runasapi',
            'Samoa',
            'Shambali Monastery',
            'Throne of Anubis',
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
            'time since the match was played. A string containing a number and a plural unit of time, separated by a single space. Examples: 20 seconds, 2 hours, 21 minutes, 1 days, a moment ago',
        ),
    matchType: z.enum(['competitive', 'unranked', 'arcade', 'custom game']),
})

export const MatchHistory = z.object({
    matches: z.array(Match),
})

function convertImageUrlToBuffer(imageUrl: string): Buffer {
    const base64ImageData = imageUrl.split(',')[1]
    return Buffer.from(base64ImageData, 'base64')
}

async function preprocessImage(imageUrl: string): Promise<string> {
    const buffer = convertImageUrlToBuffer(imageUrl)
    const imageObject = sharp(buffer)
    // get image dimensions
    const { width, height } = (await imageObject.metadata()) as {
        width: number
        height: number
    }
    // shrink and crop
    const resizedImage = await imageObject
        .extract({
            width: Math.round(width / 1.38),
            height: Math.round(height / 1.9),
            top: Math.round(height / 3.2),
            left: Math.round(width / 4.26),
        })
        .toBuffer()
    return `data:image/jpeg;base64,${resizedImage.toString('base64')}`
}

async function getOpenAiCompletion(ocrText: string) {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })
    const completion = await client.beta.chat.completions.parse({
        model,
        messages: [
            {
                role: 'system',
                content: `You are provided with a messy OCR extraction of an Overwatch 2 match history. This text may include extraneous information, OCR misinterpretations, or irrelevant data. Your task is to convert this unstructured and error-prone OCR output into a clean, structured format that accurately represents the match history details.
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
    return completion.choices[0].message.parsed
}

const execAwaitable = promisify(exec)
async function runOcrPython(imageUrl: string) {
    const buffer = convertImageUrlToBuffer(imageUrl)
    const imagePath = path.join(os.tmpdir(), `image.${Math.random()}.jpg`)
    await sharp(buffer).toFile(imagePath)
    const { stdout } = await execAwaitable(
        `cd ./ocr && uv run main.py "${imagePath}"`,
    )
    return stdout
}

function convertDurationToSeconds(duration: string) {
    const [minutes, seconds] = duration.split(':')
    return Number(minutes) * 60 + Number(seconds)
}

async function _ProcessMatchHistory(imageUrl: string, collectionId: number) {
    var processedImageUrl = await preprocessImage(imageUrl)
    var ocrText = await runOcrPython(processedImageUrl)
    const generatedMatches = await getOpenAiCompletion(ocrText)
    if (!generatedMatches) throw new Error('No matches found')
    if (generatedMatches.matches.length === 0)
        throw new Error('No matches found')
    const genMatchReverse = generatedMatches.matches.reverse()

    const filters: SQLWrapper[] = []
    if (collectionId) filters.push(eq(matchTable.collectionId, collectionId))
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
        const isDuplicate = last8Matches.some(
            (m) =>
                m.mapName === cm.mapName &&
                m.result === cm.result &&
                m.matchType === cm.matchType &&
                m.scoreSelf === cm.scoreSelf &&
                m.scoreOpponent === cm.scoreOpponent &&
                m.duration === convertDurationToSeconds(cm.matchDuration),
        )
        if (!isDuplicate && !seenMatches.has(matchKey)) {
            dedupedMatches.push(cm)
            seenMatches.add(matchKey)
        }
    }

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
        await db.insert(matchTable).values({
            mapName,
            result,
            scoreSelf,
            scoreOpponent,
            duration: convertDurationToSeconds(matchDuration),
            matchTimestamp,
            matchType,
            collectionId,
        })
    })
}

const ProcessMatchHistory = createServerFn({ method: 'POST' })
    .validator((data: { imageUrl: string; collectionId: number }) => data)
    .handler(async ({ data }) => {
        return await _ProcessMatchHistory(data.imageUrl, data.collectionId)
    })

function MapTimeSinceMatchToDate(timeSinceMatch: string): Date {
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
    }

    const handler = unitHandlers[unit]
    if (!handler) {
        throw new Error(`Invalid time unit provided: ${unit}`)
    }

    handler(now, value)
    return now
}

function RouteComponent() {
    const { collections } = Route.useLoaderData()
    const [inputDisabled, setInputDisabled] = useState(false)
    const [collectionId, setCollectionId] = useState(collections[0].id)

    const onDrop = useCallback((accepedFiles: File[]) => {
        setInputDisabled(true)
        const [file] = accepedFiles
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (e) => {
            toast.promise(
                ProcessMatchHistory({
                    data: {
                        imageUrl: e.target?.result as string,
                        collectionId,
                    },
                }),
                {
                    loading: 'Analyzing match history...',
                    success: 'Match history analyzed successfully!',
                    error: 'Error analyzing match history',
                },
            )
        }
        reader.readAsDataURL(file)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
    })

    return (
        <>
            <div className="flex-grow flex justify-center overflow-y-hidden p-4">
                <div className="h-full w-full flex flex-col gap-3">
                    <Select
                        onValueChange={(e) => setCollectionId(Number(e))}
                        defaultValue={collectionId.toString()}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Collection" />
                        </SelectTrigger>
                        <SelectContent>
                            {collections.map(({ id, name }) => (
                                <SelectItem key={id} value={id.toString()}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="w-full flex flex-grow">
                        <div
                            {...getRootProps()}
                            className="w-full group flex-grow border border-dashed border-gray-300 rounded-lg p-4 text-center flex flex-col items-center justify-center"
                        >
                            <input
                                {...getInputProps()}
                                className=""
                                accept="image/*"
                            />
                            <p
                                className={cn(
                                    'group-hover:text-gray-300 transition-all duration-200 text-sm',
                                    isDragActive && 'italic',
                                )}
                            >
                                Upload a screenshot
                            </p>
                        </div>
                    </div>
                </div>
            </div>{' '}
        </>
    )
}
