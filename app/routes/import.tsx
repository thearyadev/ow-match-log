import { createFileRoute } from '@tanstack/react-router'
import React, { useCallback, useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { db } from '@/db'
import { collection } from '@/db/schema'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { type ProcessResult, ProcessMatchHistory } from '@/actions'
import DialogComponent from '@/components/processingDialog'

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
                setResult={setResult}
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
            </div>
        </>
    )
}
