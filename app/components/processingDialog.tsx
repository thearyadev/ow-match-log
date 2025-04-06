import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loadingSpinner'
import { type ProcessResult, deleteRecords } from '@/actions'
import { useRouter } from '@tanstack/react-router'

const DIALOG_STATE = {
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
}

function getDialogState(result: ProcessResult) {
    if (
        result.ocr === undefined &&
        result.image === undefined &&
        result.llmGeneration === undefined &&
        result.dbInsertion === undefined
    ) {
        return DIALOG_STATE.LOADING
    }
    if (
        (result.ocr?.error ||
            result.image?.error ||
            result.llmGeneration?.error ||
            result.dbInsertion?.error) &&
        !(
            result.ocr?.error &&
            result.image?.error &&
            result.llmGeneration?.error &&
            result.dbInsertion?.error
        )
    ) {
        return DIALOG_STATE.ERROR
    }
    if (
        !result.ocr?.error &&
        !result.image?.error &&
        !result.llmGeneration?.error &&
        !result.dbInsertion?.error
    ) {
        return DIALOG_STATE.SUCCESS
    }
    return null
}

function DialogComponent({
    openDialog,
    setOpenDialog,
    result,
    setResult,
}: {
    openDialog: boolean
    setOpenDialog: (open: boolean) => void
    result: ProcessResult
    setResult: (result: ProcessResult) => void
}) {
    const state = getDialogState(result)

    const closeDialog = () => {
        setResult({})
        setOpenDialog(false)
    }

    return (
        <Dialog open={openDialog} onOpenChange={closeDialog}>
            <DialogContent
                className=" overflow-hidden"
                onPointerDownOutside={
                    state === DIALOG_STATE.LOADING
                        ? (e) => e.preventDefault()
                        : () => {}
                }
            >
                <DialogHeader className="text-center ">
                    <DialogTitle className="text-2xl font-semibold text-center py-3">
                        {state === DIALOG_STATE.LOADING && (
                            <h1>Processing...</h1>
                        )}
                        {state === DIALOG_STATE.ERROR && (
                            <h1>Something went wrong</h1>
                        )}
                        {state === DIALOG_STATE.SUCCESS && (
                            <h1>Matches successfully imported!</h1>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex justify-center items-center h-[400px]">
                    {state === DIALOG_STATE.LOADING && <LoadingSpinner />}
                    {state !== DIALOG_STATE.LOADING && (
                        <div>
                            <Tabs
                                defaultValue="llm"
                                className="w-[400px] h-[400px]"
                            >
                                <TabsList className="grid grid-cols-3 w-full mb-4">
                                    <TabsTrigger value="image">
                                        Input Image
                                    </TabsTrigger>
                                    <TabsTrigger value="ocr">
                                        OCR Result
                                    </TabsTrigger>
                                    <TabsTrigger value="llm">
                                        LLM Result
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent
                                    value="image"
                                    className="flex justify-center items-center h-[300px]"
                                >
                                    {result.image?.error ? (
                                        <p className="text-red-500">
                                            {result.image.error}
                                        </p>
                                    ) : (
                                        <a
                                            href={result.image?.url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <img
                                                src={result.image?.url}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </a>
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="ocr"
                                    className="h-[300px] overflow-auto"
                                >
                                    {result.ocr?.error ? (
                                        <p className="text-red-500">
                                            {result.ocr.error}
                                        </p>
                                    ) : (
                                        <pre className="h-full overflow-auto whitespace-pre-wrap">
                                            {result.ocr?.text}
                                        </pre>
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="llm"
                                    className="h-[300px] overflow-auto"
                                >
                                    {result.llmGeneration?.error ? (
                                        <p className="text-red-500">
                                            {result.llmGeneration.error}
                                        </p>
                                    ) : (
                                        <pre className="h-full overflow-auto whitespace-pre-wrap">
                                            {JSON.stringify(
                                                result.llmGeneration?.matches,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    )}
                                </TabsContent>
                                <div className="grid grid-cols-4 gap-2">
                                    <Button
                                        className="w-full col-span-3"
                                        onClick={() => {
                                            closeDialog()
                                        }}
                                    >
                                        Looks Good
                                    </Button>
                                    <Button
                                        variant="destructiveOutline"
                                        className="w-full"
                                        onClick={() => {
                                            deleteRecords({
                                                data: {
                                                    ids:
                                                        result.dbInsertion
                                                            ?.ids ?? [],
                                                },
                                            }).then(() => {
                                                closeDialog()
                                            })
                                        }}
                                    >
                                        Revert
                                    </Button>
                                </div>
                            </Tabs>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default DialogComponent
