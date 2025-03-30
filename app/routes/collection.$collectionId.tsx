import { Await, createFileRoute } from '@tanstack/react-router'
import 'react-tooltip/dist/react-tooltip.css'
import { createServerFn } from '@tanstack/react-start'
import { collection, match as matchTable } from '@/db/schema'
import { db } from '@/db'
import {
    gte,
    sql,
    count,
    desc,
    avg,
    eq,
    ne,
    and,
    SQLWrapper,
} from 'drizzle-orm'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

import { ActivityChart } from '@/components/charts/activityChart'
import { Suspense } from 'react'
import { BarChart } from '@/components/charts/barChart'
import { Maps } from '@/lib/maps'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'

const getLastYearOfDataGroupedByDay = createServerFn()
    .validator((data: { collectionId?: number }) => data)
    .handler(async ({ data: { collectionId } }) => {
        const today = new Date()
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
        const todayString = today.toISOString().split('T')[0]

        const cutoffDate = new Date()
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
        cutoffDate.setMinutes(cutoffDate.getMinutes() - cutoffDate.getTimezoneOffset())
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

        let dataMapped = data.map(({ matchDate, count }) => {
            const offsetDate = new Date(matchDate as string)
            offsetDate.setMinutes(offsetDate.getMinutes() - offsetDate.getTimezoneOffset())
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
        return dataMapped
    })

const getActivityLoader = createServerFn()
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

const getMapCount = createServerFn()
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

const getMapWinPercentage = createServerFn()
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

const getTotalMatches = createServerFn()
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

const getWinrateByDayOfWeek = createServerFn()
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

const getAverageMatchDuration = createServerFn()
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

const getDrawRate = createServerFn()
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

const getMapTypeWinrate = createServerFn()
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
            .where(and(...filters))
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
            buckets[mapInfo.mapType][result === 'victory' ? 0 : 1] += 1
            buckets[mapInfo.mapType][1] += 1
        })
        return {
            labels: Object.keys(buckets),
            values: Object.values(buckets).map(
                ([wins, total]) => (wins / total) * 100,
            ),
        }
    })

const getMatches = createServerFn({ method: 'GET' })
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

function validateCollectionId(collectionId: string) {
    if (collectionId === 'all') return undefined
    if (isNaN(Number(collectionId))) throw new Error('Invalid collection id')
    return Number(collectionId)
}

const getCollection = createServerFn({ method: 'GET' })
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

export const Route = createFileRoute('/collection/$collectionId')({
    component: RouteComponent,
    loader: async ({ params: { collectionId } }) => {
        return {
            collection: await getCollection({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            matches: getMatches({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            lastYearOfDataGroupedByDay: getLastYearOfDataGroupedByDay({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            lastYearOfDataGroupedByDayLoader: await getActivityLoader({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            winrateByDayOfWeek: getWinrateByDayOfWeek({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            mapCount: getMapCount({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            mapWinPercentage: getMapWinPercentage({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            mapTypeCount: null,
            totalMatches: getTotalMatches({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            averageMatchDuration: getAverageMatchDuration({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            drawRate: getDrawRate({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
            mapTypeWinrate: getMapTypeWinrate({
                data: { collectionId: validateCollectionId(collectionId) },
            }),
        }
    },
})

type Match = Awaited<ReturnType<typeof getMatches>>[0]
const columnHelper = createColumnHelper<Match>()
const defaultColumns = [
    columnHelper.accessor('id', {
        header: () => 'ID',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('mapName', {
        header: () => 'Map',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('result', {
        header: () => 'Result',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('scoreSelf', {
        header: () => 'Score Self',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('scoreOpponent', {
        header: () => 'Score Opponent',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('duration', {
        header: () => 'Duration',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('matchTimestamp', {
        header: () => 'Match Timestamp',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
    columnHelper.accessor('matchType', {
        header: () => 'Match Type',
        cell: (props) => <div>{props.getValue()}</div>,
    }),
]
function MatchTable({ matches }: { matches: Match[] }) {
    const columns = defaultColumns
    const data = matches
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })
    return (
        <div className="w-full h-screen">
            <table className="w-full ">
                <thead className="">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="">
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext(),
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    {table.getFooterGroups().map((footerGroup) => (
                        <tr key={footerGroup.id}>
                            {footerGroup.headers.map((header) => (
                                <th key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.footer,
                                            header.getContext(),
                                        )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </tfoot>
            </table>
            <div className="h-4" />
        </div>
    )
}

function RouteComponent() {
    const {
        lastYearOfDataGroupedByDay,
        lastYearOfDataGroupedByDayLoader,
        mapCount,
        mapWinPercentage,
        totalMatches,
        winrateByDayOfWeek,
        averageMatchDuration,
        drawRate,
        mapTypeWinrate,
        matches,
        collection,
    } = Route.useLoaderData()
    return (
        <Tabs defaultValue="Statistics" className="p-3">
            <div className="flex items-center gap-4">
                {collection !== undefined ? (
                    <h1 className="text-3xl">Collection: {collection.name}</h1>
                ) : null}
                <TabsList className="w-[400px]">
                    <TabsTrigger value="Statistics">Statistics</TabsTrigger>
                    <TabsTrigger value="Data">Data</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="Statistics">
                <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
                        <div className="col-span-1 xl:col-span-3">
                            <ActivityChart
                                dataPromise={lastYearOfDataGroupedByDay}
                                dataLoading={lastYearOfDataGroupedByDayLoader}
                            />
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Matches Played</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-full">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={totalMatches}
                                        children={(data) => (
                                            <div className="text-center text-4xl font-extrabold pb-4">
                                                {data}
                                            </div>
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1: xl:grid-cols-2 gap-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Map Occurrences</CardTitle>
                                <CardDescription>
                                    Count of maps in match history.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-[50vh] overflow-y-hidden">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={mapCount}
                                        children={(data) => (
                                            <BarChart
                                                data={data}
                                                seriesName="Map Count"
                                                percents={false}
                                            />
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Map Winrate</CardTitle>
                                <CardDescription>
                                    Win Percentage for all maps
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-[50vh] overflow-y-hidden">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={mapWinPercentage}
                                        children={(data) => (
                                            <BarChart
                                                data={data}
                                                seriesName="Win Rate"
                                                percents
                                            />
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                        <Card className="col-span-1 xl:col-span-2">
                            <CardHeader>
                                <CardTitle>Day of Week Winrate</CardTitle>
                                <CardDescription>
                                    Win Percentage for each day of the week
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-[50vh] overflow-y-hidden">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={winrateByDayOfWeek}
                                        children={(data) => (
                                            <BarChart
                                                data={data}
                                                seriesName="Win Rate"
                                                percents
                                            />
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Average Match Duration</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-full pb-4">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={averageMatchDuration}
                                        children={(data) => (
                                            <div className="text-center text-4xl font-extrabold">
                                                {data?.toFixed(2)} minutes
                                            </div>
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Draw Rate</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-full">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={drawRate}
                                        children={(data) => (
                                            <div className="text-center text-4xl font-extrabold">
                                                {data?.toFixed(2)}%
                                            </div>
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle>Map Type Winrate</CardTitle>
                                <CardDescription>
                                    Winrate by map type
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-[50vh] overflow-y-hidden">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Await
                                        promise={mapTypeWinrate}
                                        children={(data) => (
                                            <BarChart
                                                data={data}
                                                seriesName="Map Count"
                                                percents={false}
                                            />
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="Data">
                <Suspense fallback={<p>Loading...</p>}>
                    <Await
                        promise={matches}
                        children={(matches) => {
                            return <MatchTable matches={matches} />
                        }}
                    />
                </Suspense>
            </TabsContent>
        </Tabs>
    )
}
