import { Await } from '@tanstack/react-router'
import { ActivityCalendar } from 'react-activity-calendar'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'
import React, { Suspense } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

type ActivityArray = {
    date: string
    count: number
    level: number
}[]

type ActivityChartProps = {
    dataPromise: Promise<ActivityArray>
    dataLoading: ActivityArray
}

export function ActivityChart(props: ActivityChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Match History</CardTitle>
                <CardDescription>
                    Heatmap of all matches played in the last year.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center">
                <Suspense
                    fallback={
                        <ActivityCalendar data={props.dataLoading} loading />
                    }
                >
                    <Await
                        promise={props.dataPromise}
                        children={(data) => (
                            <ActivityCalendar
                                data={data}
                                maxLevel={10}
                                blockRadius={4}
                                hideTotalCount
                                colorScheme="dark"
                                renderBlock={(block, activity) =>
                                    React.cloneElement(block, {
                                        'data-tooltip-id': 'react-tooltip',
                                        'data-tooltip-html': `${activity.count} matches played on ${activity.date}`,
                                    })
                                }
                            />
                        )}
                    ></Await>
                </Suspense>

                <ReactTooltip id="react-tooltip" />
            </CardContent>
        </Card>
    )
}
