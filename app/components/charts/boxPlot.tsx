import React, { Suspense, useEffect, useRef, useState } from 'react'
import * as Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import ForceClient from '../forceClient'
import HighchartsMore from 'highcharts/highcharts-more'

type BoxPlotData = Record<string, number[]>

interface BoxPlotProps extends HighchartsReact.Props {
    data: BoxPlotData
    seriesName: string
}

export function BoxPlot(props: BoxPlotProps) {
    const options: Highcharts.Options = {
        chart: {
            backgroundColor: 'transparent',
            style: {
                color: '#fafafa',
            },
            type: 'boxplot',
        },
        title: {
            text: undefined,
            margin: 0,
        },
        xAxis: {
            categories: Object.keys(props.data),
            labels: {
                style: {
                    color: '#fafafa',
                },
            },
            lineColor: '#fafafa',
            tickColor: '#fafafa',
        },
        yAxis: {
            labels: {
                style: {
                    color: '#fafafa',
                },
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)',
            title: {
                style: {
                    color: '#fafafa',
                    enabled: false,
                },
            },
            allowDecimals: false,
        },
        legend: {
            enabled: false,
        },
        series: [
            {
                type: 'boxplot',
                data: Object.values(props.data),
                color: '#fafafa',
                fillColor: '#d2d2d2',
            },
        ],
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            style: {
                color: '#FFFFFF',
            },
        },
        plotOptions: {
            column: {
                borderColor: '#333333',
            },
        },
        credits: {
            enabled: false,
        },
    }

    const chartComponentRef = useRef<HighchartsReact.RefObject>(null)
    return (
        <ForceClient>
            <div
                className="w-full"
                onLoad={() => {
                    HighchartsMore(Highcharts)
                }}
            >
                <HighchartsReact
                    highcharts={Highcharts}
                    options={options}
                    ref={chartComponentRef}
                    {...props}
                />
            </div>
        </ForceClient>
    )
}
