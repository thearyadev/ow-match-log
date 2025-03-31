import { createFileRoute } from '@tanstack/react-router'
import React, { useCallback, useEffect, useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { getOpenAiClient } from '@/actions'
import { object, z } from 'zod'
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
import { tryCatch } from '@/lib/try-catch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/loadingSpinner'
import { Button } from '@/components/ui/button'

const GetCollections = createServerFn().handler(async () => {
    const data = await db.select().from(collection).execute()
    return data
})

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
            'time since the match was played. A string containing a number and a plural unit of time, separated by a single space. Examples: 20 seconds ago, 2 hours ago, 21 minutes ago, 1 days ago, a moment ago.',
        ),
    matchType: z.enum(['competitive', 'unranked', 'arcade', 'custom game']),
})

export const MatchHistory = z.object({
    matches: z.array(Match),
})

type ProcessResult = {
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
        ids?: bigint[]
        error?: string
    }
}

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
}

const execAwaitable = promisify(exec)
async function runOcrPython(imageUrl: string) {
    const buffer = convertImageUrlToBuffer(imageUrl)
    const imagePath = path.join(os.tmpdir(), `image.${Math.random()}.jpg`)
    await sharp(buffer).toFile(imagePath)
    const { stdout } = await execAwaitable(
        `cd ./ocr && uv run main.py "${imagePath}"`,
    )
    console.log(stdout)
    return stdout
}

async function convertDurationToSeconds(duration: string) {
    const [minutes, seconds] = duration.split(':')
    return Number(minutes) * 60 + Number(seconds)
}

async function _ProcessMatchHistory(
    imageUrl: string,
    collectionId: number,
): Promise<ProcessResult> {
    const { data: processedImageUrl, error: eImagePreProcess } = await tryCatch(
        preprocessImage(imageUrl),
    )
    if (eImagePreProcess) {
        console.error(eImagePreProcess)
        return {
            image: {
                error: eImagePreProcess.message,
            },
        }
    }

    const { data: ocrText, error: eOcr } = await tryCatch(
        runOcrPython(processedImageUrl),
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
    const { data: generatedMatches, error: eCompletion } = await tryCatch(
        getOpenAiCompletion(ocrText),
    )

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

    const insertedIds: bigint[] = []

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
                    matches: generatedMatches,
                },
                dbInsertion: {
                    error: `Error converting generated time to seconds: ${eTimeConversion.message}`,
                },
            }
        }
        const { data: insertedRecord, error: eInsertionError } = await tryCatch(
            db.insert(matchTable).values({
                mapName,
                result,
                scoreSelf,
                scoreOpponent,
                duration: matchDurationSeconds,
                matchTimestamp,
                matchType,
                collectionId,
            }),
        )

        if (eInsertionError || insertedRecord.lastInsertRowid === undefined) {
            console.error(eInsertionError)
            return {
                image: {
                    url: processedImageUrl,
                },
                ocr: {
                    text: ocrText,
                },
                llmGeneration: {
                    matches: generatedMatches,
                },
                dbInsertion: {
                    error: `Error inserting match: ${eInsertionError?.message} || lastInsertRowid is undefined`,
                },
            }
        }
        insertedIds.push(insertedRecord.lastInsertRowid)
    })

    return {
        image: {
            url: processedImageUrl,
        },
        ocr: {
            text: ocrText,
        },
        llmGeneration: {
            matches: generatedMatches,
        },
        dbInsertion: {
            ids: insertedIds,
        },
    }
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

    const [openDialog, setOpenDialog] = useState(false)

    const [result, setResult] = useState<ProcessResult>({})

    const onDrop = useCallback((accepedFiles: File[]) => {
        setInputDisabled(true)
        const [file] = accepedFiles
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (e) => {
            setOpenDialog(true)
            ProcessMatchHistory({
                data: {
                    imageUrl: e.target?.result as string,
                    collectionId,
                },
            }).then((result) => {
                setResult(result)
                setOpenDialog(true)
            })
        }
        reader.readAsDataURL(file)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
    })

    return (
        <>
            <DialogComponent
                openDialog={openDialog}
                setOpenDialog={setOpenDialog}
                result={result}
            />
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

const deleteRecords = createServerFn({ method: 'POST' })
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

const DIALOG_STATE = {
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
}

function getDialogState(result: ProcessResult) {
    if (
        result.ocr === undefined &&
        result.image === undefined &&
        result.llmGeneration === undefined &&
        result.dbInsertion === undefined
    ) {
        return DIALOG_STATE.LOADING
    }
    if (
        (result.ocr?.error ||
            result.image?.error ||
            result.llmGeneration?.error ||
            result.dbInsertion?.error) &&
        !(
            result.ocr?.error &&
            result.image?.error &&
            result.llmGeneration?.error &&
            result.dbInsertion?.error
        )
    ) {
        return DIALOG_STATE.ERROR
    }
    if (
        !result.ocr?.error &&
        !result.image?.error &&
        !result.llmGeneration?.error &&
        !result.dbInsertion?.error
    ) {
        return DIALOG_STATE.SUCCESS
    }
    return null
}

function DialogComponent({ openDialog, setOpenDialog, result }) {
    const state = getDialogState(result)

    return (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent
                className=" overflow-hidden"
                onPointerDownOutside={
                    state === DIALOG_STATE.LOADING
                        ? (e) => e.preventDefault()
                        : () => {}
                }
            >
                <DialogHeader className="text-center ">
                    <DialogTitle className="text-lg font-semibold text-center py-1">
                        {state === DIALOG_STATE.LOADING && (
                            <h1>Processing...</h1>
                        )}
                        {state === DIALOG_STATE.ERROR && (
                            <h1>Something went wrong</h1>
                        )}
                        {state === DIALOG_STATE.SUCCESS && (
                            <h1>Match successfully imported!</h1>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex justify-center items-center h-[400px]">
                    {state === DIALOG_STATE.LOADING && <LoadingSpinner />}
                    {state !== DIALOG_STATE.LOADING && (
                        <div>
                            <Tabs
                                defaultValue="llm"
                                className="w-[400px] h-[400px]"
                            >
                                <TabsList className="grid grid-cols-3 w-full mb-4">
                                    <TabsTrigger value="image">
                                        Input Image
                                    </TabsTrigger>
                                    <TabsTrigger value="ocr">
                                        OCR Result
                                    </TabsTrigger>
                                    <TabsTrigger value="llm">
                                        LLM Result
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent
                                    value="image"
                                    className="flex justify-center items-center h-[300px]"
                                >
                                    {result.image?.error ? (
                                        <p className="text-red-500">
                                            {result.image.error}
                                        </p>
                                    ) : (
                                        <img
                                            src={result.image?.url}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="ocr"
                                    className="h-[300px] overflow-auto"
                                >
                                    {result.ocr?.error ? (
                                        <p className="text-red-500">
                                            {result.ocr.error}
                                        </p>
                                    ) : (
                                        <pre className="h-full overflow-auto whitespace-pre-wrap">
                                            {result.ocr?.text}
                                        </pre>
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="llm"
                                    className="h-[300px] overflow-auto"
                                >
                                    {result.llmGeneration?.error ? (
                                        <p className="text-red-500">
                                            {result.llmGeneration.error}
                                        </p>
                                    ) : (
                                        <pre className="h-full overflow-auto whitespace-pre-wrap">
                                            {JSON.stringify(
                                                result.llmGeneration?.matches,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    )}
                                </TabsContent>
                            </Tabs>
                            <div>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => {
                                        deleteRecords({
                                            data: {
                                                ids:
                                                    result.dbInsertion?.ids ??
                                                    [],
                                            },
                                        }).then(() => {
                                            setOpenDialog(false)
                                        })
                                    }}
                                >
                                    Revert
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default DialogComponent
