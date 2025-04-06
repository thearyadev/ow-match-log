import React, { Suspense, useEffect, useRef, useState } from 'react'
import * as Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import ForceClient from '../forceClient'

interface BarChartData {
    labels: string[]
    values: number[]
}

interface BarChartProps extends HighchartsReact.Props {
    data: BarChartData
    percents: boolean
    seriesName: string
}

export function BarChart(props: BarChartProps) {
    const options: Highcharts.Options = {
        chart: {
            backgroundColor: 'transparent',
            style: {
                color: '#fafafa',
            },
        },
        title: {
            text: undefined,
            margin: 0,
        },
        xAxis: {
            categories: props.data.labels,
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
                step: 1,
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
                type: 'column',
                name: props.seriesName,
                data: props.percents
                    ? props.data.values.map((value) => {
                          const d = {
                              y: Math.round(value * 100) / 100,
                              color: undefined,
                          }
                          if (value < 50) {
                              // @ts-ignore
                              d.color = 'red'
                          }
                          return d
                      })
                    : props.data.values,
                color: '#fafafa',
            },
        ],
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            style: {
                color: '#fafafa',
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
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
                ref={chartComponentRef}
                {...props}
            />
        </ForceClient>
    )
}
