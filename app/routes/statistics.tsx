import { Await, createFileRoute } from '@tanstack/react-router'
import 'react-tooltip/dist/react-tooltip.css'
import { createServerFn } from '@tanstack/react-start'
import { match as matchTable } from '@/db/schema'
import { db } from '@/db'
import { gte, sql, count, desc } from 'drizzle-orm'
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
import ForceClient from '@/components/forceClient'

const getLastYearOfDataGroupedByDay = createServerFn().handler(async () => {
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
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

    const data = await db
        .select({
            matchDate: sql`DATE(${matchTable.matchTimestamp})`,
            count: sql`COUNT(*)`,
        })
        .from(matchTable)
        .where(gte(matchTable.matchTimestamp, cutoffString))
        .groupBy(sql`DATE(${matchTable.matchTimestamp})`)
        .orderBy(sql`DATE(${matchTable.matchTimestamp})`)

    let dataMapped = data.map(({ matchDate, count }) => ({
        date: matchDate as string,
        count: Number(count),
        level: Number(count) > 10 ? 10 : Number(count),
    }))
    if (dataMapped.length === 0) return [bounds.start, bounds.end]
    if (dataMapped[0].date !== cutoffDateString)
        dataMapped.unshift(bounds.start)
    if (dataMapped[dataMapped.length - 1].date !== todayString)
        dataMapped.push(bounds.end)
    return dataMapped
})

const getActivityLoader = createServerFn().handler(async () => {
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

const getMapCount = createServerFn().handler(async () => {
    const data = await db
        .select({
            mapName: matchTable.mapName,
            count: count(),
        })
        .from(matchTable)
        .orderBy(desc(count()))
        .groupBy(matchTable.mapName)
    return {
        labels: data.map(({ mapName }) => mapName),
        values: data.map(({ count }) => Number(count)),
    }
})

const getMapWinPercentage = createServerFn().handler(async () => {
    const data = await db
        .select({
            mapName: matchTable.mapName,
            totalCount: count(),
            winCount: count(sql`CASE WHEN result = 'victory' THEN 1 END`),
        })
        .from(matchTable)
        .groupBy(matchTable.mapName)
        .execute()

    return {
        labels: data.map(({ mapName }) => mapName),
        values: data.map(
            ({ winCount, totalCount }) => (winCount / totalCount) * 100,
        ),
    }
})

const getTotalMatches = createServerFn().handler(async () => {
    const data = await db
        .select({
            count: count(),
        })
        .from(matchTable)
        .execute()
    return data[0].count
})

const getWinrateByDayOfWeek = createServerFn().handler(async () => {
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
    const data = await db
        .select({
            matchTimestamp: matchTable.matchTimestamp,
            result: matchTable.result,
        })
        .from(matchTable)
        .execute()

    data.forEach(({ matchTimestamp, result }) => {
        const date = new Date(matchTimestamp)
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

export const Route = createFileRoute('/statistics')({
    component: RouteComponent,
    loader: async () => {
        return {
            lastYearOfDataGroupedByDay: getLastYearOfDataGroupedByDay(),
            lastYearOfDataGroupedByDayLoader: await getActivityLoader(),

            winrateByDayOfWeek: getWinrateByDayOfWeek(),

            mapCount: getMapCount(),
            mapWinPercentage: getMapWinPercentage(),

            mapTypeCount: null,
            mapTypeWinPercentage: null,

            totalMatches: getTotalMatches(),
        }
    },
    // ssr: false,
})

function RouteComponent() {
    const {
        lastYearOfDataGroupedByDay,
        lastYearOfDataGroupedByDayLoader,
        mapCount,
        mapWinPercentage,
        totalMatches,
        winrateByDayOfWeek,
    } = Route.useLoaderData()
    return (
        <div className="p-3 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
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
                                    <div className="text-center text-4xl font-extrabold">
                                        {data}
                                    </div>
                                )}
                            ></Await>
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Map Occurrences</CardTitle>
                        <CardDescription>
                            Count of maps in match history.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center h-[30vh] overflow-y-hidden">
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
                    <CardContent className="flex justify-center items-center h-[30vh] overflow-y-hidden">
                        <Suspense
                            fallback={
                                <div className="text-green-900">Loading...</div>
                            }
                        >
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

            <Card>
                <CardHeader>
                    <CardTitle>Day of Week Winrate</CardTitle>
                    <CardDescription>
                        Win Percentage for each day of the week
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[30vh] overflow-y-hidden">
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
        </div>
    )
}
