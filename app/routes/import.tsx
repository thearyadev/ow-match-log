import { Await, createFileRoute } from '@tanstack/react-router'
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/header'
import { createServerFn } from '@tanstack/react-start'
import { getOpenAiClient } from '@/actions'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { useQuery } from '@tanstack/react-query'
import sharp from 'sharp'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { db } from '@/db'
import { match as matchTable } from '@/db/schema'
import { desc } from 'drizzle-orm'

const model = 'gpt-4o-mini'
export const Route = createFileRoute('/import')({
    component: RouteComponent,
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
    matchDuration: z.string().describe('match duration. Example: 14:38'),
    timeSinceMatch: z
        .string()
        .describe(
            'time since the match was played. A string containing a number and a plural unit of time, separated by a single space. Examples: 20 seconds, 2 hours, 21 minutes, 1 days',
        ),
    matchType: z.enum(['competitive', 'unranked', 'arcade', 'custom game']),
})

export const MatchHistory = z.object({
    matches: z.array(Match),
})
const ProcessMatchHistory = createServerFn({ method: 'POST' })
    .validator((imageUrl: string) => imageUrl)
    .handler(async ({ data }) => {
        const base64Data = data.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        const image = sharp(buffer)
        const { width, height } = (await image.metadata()) as {
            width: number
            height: number
        }

        const imgResized = await image
            .extract({
                width: Math.round(width / 1.38),
                height: Math.round(height / 2),
                top: Math.round(height / 2.84),
                left: Math.round(width / 4.26),
            })
            .resize(900)
            .jpeg({ quality: 100 })
            .toBuffer()
        const processedImageUrl = `data:image/jpeg;base64,${imgResized.toString('base64')}`

        const client = getOpenAiClient()
        const completion = await client.beta.chat.completions.parse({
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        'Analyze the match history image from Overwatch and respond with the match history. If there are no matches, respond with an empty array.',
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: processedImageUrl,
                            },
                        },
                    ],
                },
            ],
            response_format: zodResponseFormat(MatchHistory, 'matchHistory'),
        })
        console.log(completion.choices[0].message.parsed)
        console.log(completion.usage)

        const output = completion.choices[0].message.parsed
        if (!output) throw new Error('No matches found')
        var { matches } = output
        if (matches.length === 0) throw new Error('No matches found')
        matches = matches.reverse()
        // dedupe
        const last8Matches = await db
            .select()
            .from(matchTable)
            .orderBy(desc(matchTable.id))
            .limit(8)

        for (const cm of matches) {
            const dupeIndex = last8Matches.findIndex((m) => {
                return (
                    m.mapName === cm.mapName &&
                    m.result === cm.result &&
                    m.matchType === cm.matchType &&
                    m.scoreSelf === cm.scoreSelf &&
                    m.scoreOpponent === cm.scoreOpponent &&
                    m.duration === cm.matchDuration
                )
            })

            if (dupeIndex !== -1) {
                matches = matches.slice(0, dupeIndex)
            }
        }

        matches.forEach(async (match) => {
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
                duration: matchDuration,
                matchTimestamp,
                matchType,
            })
        })
        return true
    })

function MapTimeSinceMatchToDate(timeSinceMatch: string): Date {
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
    const [inputDisabled, setInputDisabled] = useState(false)

    const onDrop = useCallback((accepedFiles: File[]) => {
        setInputDisabled(true)
        const [file] = accepedFiles
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (e) => {
            toast.promise(
                ProcessMatchHistory({ data: e.target?.result as string }),
                {
                    loading: 'Analyzing match history...',
                    success: 'Match history analyzed successfully!',
                    error: 'Error analyzing match history',
                },
            )
            await ProcessMatchHistory({ data: e.target?.result as string })
        }
        reader.readAsDataURL(file)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
    })

    return (
        <>
            <div className="flex-grow flex justify-center overflow-y-hidden ">
                <div className="w-full gap-4">
                    <div
                        {...getRootProps()}
                        className="w-full group h-full border border-dashed border-gray-300 rounded-lg p-4 text-center flex flex-col items-center justify-center"
                    >
                        <input
                            {...getInputProps()}
                            className=""
                            accept="image/*"
                            disabled={inputDisabled}
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
        </>
    )
}
