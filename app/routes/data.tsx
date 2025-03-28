import { db } from '@/db'
import { match } from '@/db/schema'
import { Await, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Suspense } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { desc } from 'drizzle-orm'

const getMatches = createServerFn({ method: 'GET' })
    .validator(() => null)
    .handler(async () => {
        return db.select().from(match).orderBy(desc(match.id)).all()
    })

export const Route = createFileRoute('/data')({
    component: RouteComponent,
    loader: async () => {
        return {
            matches: getMatches(),
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

function RouteComponent() {
    const { matches } = Route.useLoaderData()
    return (
        <div>
            <Suspense fallback={<p>Loading...</p>}>
                <Await
                    promise={matches}
                    children={(matches) => {
                        return <MatchTable matches={matches} />
                    }}
                />
            </Suspense>
        </div>
    )
}

function MatchTable({ matches }: { matches: Match[] }) {
    const columns = defaultColumns
    const data = matches
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })
    return (
        <div className="w-full h-screen ">
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
