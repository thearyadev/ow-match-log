import { deleteRecord, type getMatches } from '@/actions'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import { Button } from './ui/button'
import { XIcon } from 'lucide-react'

type Match = Awaited<ReturnType<typeof getMatches>>[0]

interface MatchWithDeletionId extends Match {
    deletionId: number
}

const columnHelper = createColumnHelper<MatchWithDeletionId>()

export function MatchTable({ matches }: { matches: Match[] }) {
    const [data, setData] = React.useState(
        matches.map((match) => ({ ...match, deletionId: match.id })),
    )

    const columns = React.useMemo(
        () => [
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
                header: () => 'Match Timestamp (UTC)',
                cell: (props) => <div>{props.getValue()}</div>,
            }),
            columnHelper.accessor('matchType', {
                header: () => 'Match Type',
                cell: (props) => <div>{props.getValue()}</div>,
            }),
            columnHelper.accessor('deletionId', {
                header: () => '',
                cell: (props) => (
                    <div className="flex justify-center items-center">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                deleteRecord({
                                    data: {
                                        id: props.getValue(),
                                    },
                                }).then(() => {
                                    const dataCopy = [...data]
                                    dataCopy.splice(props.row.index, 1)
                                    setData(dataCopy)
                                })
                            }}
                        >
                            <XIcon />
                        </Button>
                    </div>
                ),
            }),
        ],
        [data],
    )
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
