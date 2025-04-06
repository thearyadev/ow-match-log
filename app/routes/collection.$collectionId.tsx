import { Await, createFileRoute, useRouter } from '@tanstack/react-router'
import 'react-tooltip/dist/react-tooltip.css'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { LoadingSpinner } from '@/components/loadingSpinner'

import { ActivityChart } from '@/components/charts/activityChart'
import { Suspense } from 'react'
import { BarChart } from '@/components/charts/barChart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BoxPlot } from '@/components/charts/boxPlot'
import {
    getLastYearOfDataGroupedByDay,
    getActivityLoader,
    getMapCount,
    getMapWinPercentage,
    getTotalMatches,
    getWinrateByDayOfWeek,
    getAverageMatchDuration,
    getDrawRate,
    getMapTypeWinrate,
    getMapGroupedMatchDurationBoxPlotData,
    getMapTypeGroupedMatchDurationBoxPlotData,
    getResultGroupedMatchDurationBoxPlotData,
    getWinrate,
    getWinrateLast7Days,
    getMatches,
    validateCollectionId,
    getCollection,
} from '@/actions'
import { MatchTable } from '@/components/matchTable'
import { Import } from '@/components/import'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/collection/$collectionId')({
    component: RouteComponent,
    loader: async ({ params: { collectionId } }) => {
        const args = {
            data: { collectionId: validateCollectionId(collectionId) },
        }
        const [collection, lastYearOfDataGroupedByDayLoader] =
            await Promise.all([getCollection(args), getActivityLoader(args)])
        return {
            collection,
            lastYearOfDataGroupedByDayLoader,
            matches: getMatches(args),
            lastYearOfDataGroupedByDay: getLastYearOfDataGroupedByDay(args),
            winrateByDayOfWeek: getWinrateByDayOfWeek(args),
            mapCount: getMapCount(args),
            mapWinPercentage: getMapWinPercentage(args),
            mapTypeCount: null,
            totalMatches: getTotalMatches(args),
            averageMatchDuration: getAverageMatchDuration(args),
            drawRate: getDrawRate(args),
            mapTypeWinrate: getMapTypeWinrate(args),
            mapGroupedMatchDurationBoxPlotData:
                getMapGroupedMatchDurationBoxPlotData(args),
            mapTypeGroupedMatchDurationBoxPlotData:
                getMapTypeGroupedMatchDurationBoxPlotData(args),
            resultGroupedMatchDurationBoxPlotData:
                getResultGroupedMatchDurationBoxPlotData(args),
            winrate: getWinrate(args),
            winrateLast7Days: getWinrateLast7Days(args),
        }
    },
})

function RouteComponent() {
    const data = Route.useLoaderData()
    const router = useRouter()
    return (
        <Tabs defaultValue="Statistics" className="p-3">
            <div className="flex items-center gap-4 py-4 px-1.5">
                {data.collection !== undefined ? (
                    <h1 className="text-2xl">
                        Collection: {data.collection.name}
                    </h1>
                ) : null}
                <TabsList className="w-[400px] h-7">
                    <TabsTrigger
                        value="Statistics"
                        onClick={() => router.invalidate()}
                    >
                        Statistics
                    </TabsTrigger>
                    <TabsTrigger
                        value="Data"
                        onClick={() => router.invalidate()}
                    >
                        Data
                    </TabsTrigger>
                    {data.collection !== undefined ? (
                        <TabsTrigger
                            value="Import"
                            onClick={() => router.invalidate()}
                        >
                            Import
                        </TabsTrigger>
                    ) : null}
                </TabsList>
            </div>

            <Separator className="mb-2" />
            <TabsContent value="Statistics">
                <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
                        <div className="col-span-1 xl:col-span-3">
                            <ActivityChart
                                dataPromise={data.lastYearOfDataGroupedByDay}
                                dataLoading={
                                    data.lastYearOfDataGroupedByDayLoader
                                }
                            />
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Matches Played</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-full">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.totalMatches}
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
                    <div className="grid grid-cols-2 gap-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Winrate</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-full">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.winrate}
                                        children={(data) => (
                                            <div className="text-center text-4xl font-extrabold pb-4">
                                                {(data * 100).toFixed(2)}%
                                            </div>
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Winrate (Last 7 Days)</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center h-full">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.winrateLast7Days}
                                        children={(data) => (
                                            <div className="text-center text-4xl font-extrabold pb-4">
                                                {(data * 100).toFixed(2)}%
                                            </div>
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Map Occurrences</CardTitle>
                            <CardDescription>
                                Count of maps in match history.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center items-center ">
                            <Suspense fallback={<LoadingSpinner />}>
                                <Await
                                    promise={data.mapCount}
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
                        <CardContent className="flex justify-center items-center ">
                            <Suspense fallback={<LoadingSpinner />}>
                                <Await
                                    promise={data.mapWinPercentage}
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
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                        <Card className="col-span-1 xl:col-span-2">
                            <CardHeader>
                                <CardTitle>Day of Week Winrate</CardTitle>
                                <CardDescription>
                                    Win Percentage for each day of the week
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center ">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.winrateByDayOfWeek}
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
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.averageMatchDuration}
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
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.drawRate}
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
                            <CardContent className="flex justify-center items-center ">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={data.mapTypeWinrate}
                                        children={(data) => (
                                            <BarChart
                                                data={data}
                                                seriesName="Map Count"
                                                percents
                                            />
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                    <Card className="">
                        <CardHeader>
                            <CardTitle>Map Duration Boxplot, By Map</CardTitle>
                            <CardDescription>
                                Boxplot of match durations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center items-center h-[50vh] overflow-y-hidden">
                            <Suspense fallback={<LoadingSpinner />}>
                                <Await
                                    promise={
                                        data.mapGroupedMatchDurationBoxPlotData
                                    }
                                    children={(data) => (
                                        <BoxPlot data={data} seriesName="idk" />
                                    )}
                                ></Await>
                            </Suspense>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                        <Card className="col-span-1 xl:col-span-2">
                            <CardHeader>
                                <CardTitle>
                                    Map Duration Boxplot, By Map Type
                                </CardTitle>
                                <CardDescription>
                                    Boxplot of match durations
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={
                                            data.mapTypeGroupedMatchDurationBoxPlotData
                                        }
                                        children={(data) => (
                                            <BoxPlot
                                                data={data}
                                                seriesName="idk"
                                            />
                                        )}
                                    ></Await>
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Map Duration Boxplot, By Result
                                </CardTitle>
                                <CardDescription>
                                    Boxplot of match durations
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center ">
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Await
                                        promise={
                                            data.resultGroupedMatchDurationBoxPlotData
                                        }
                                        children={(data) => (
                                            <BoxPlot
                                                data={data}
                                                seriesName="idk"
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
                <div>
                    <Suspense
                        fallback={
                            <div className="py-40 flex justify-center items-center">
                                <LoadingSpinner />
                            </div>
                        }
                    >
                        <Await
                            promise={data.matches}
                            children={(resolvedMatches) => (
                                <MatchTable matches={resolvedMatches} />
                            )}
                        />
                    </Suspense>
                </div>
            </TabsContent>

            <TabsContent value="Import" className="flex flex-grow h-full">
                {data.collection !== undefined ? (
                    <Import collectionId={data.collection.id} />
                ) : null}
            </TabsContent>
        </Tabs>
    )
}
