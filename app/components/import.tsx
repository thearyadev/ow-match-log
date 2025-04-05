import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { type ProcessResult, ProcessMatchHistory } from '@/actions'
import DialogComponent from '@/components/processingDialog'

export function Import({ collectionId }: { collectionId: number }) {
    const [openDialog, setOpenDialog] = useState(false)
    const [result, setResult] = useState<ProcessResult>({})
    const onDrop = useCallback((accepedFiles: File[]) => {
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
            <div className="justify-center overflow-y-hidden p-4 w-full">
                <div className="h-full w-full flex flex-col gap-3">
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
