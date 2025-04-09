import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loadingSpinner'
import { type ProcessResult } from '@/actions'
import { MatchTable } from './matchTable'

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
        if (state !== DIALOG_STATE.LOADING) {
            setResult({})
        }
        setOpenDialog(false)
    }

    const contentAreaHeight = 'h-[450px]'

    return (
        <Dialog open={openDialog} onOpenChange={closeDialog}>
            <DialogContent
                className="sm:max-w-[650px] overflow-hidden p-0"
                onPointerDownOutside={
                    state === DIALOG_STATE.LOADING
                        ? (e) => e.preventDefault()
                        : undefined
                }
            >
                <DialogHeader className="text-center px-6 pt-6 pb-3">
                    <DialogTitle className="text-2xl font-semibold">
                        {state === DIALOG_STATE.LOADING && 'Processing...'}
                        {state === DIALOG_STATE.ERROR && 'Something went wrong'}
                        {state === DIALOG_STATE.SUCCESS &&
                            'Matches successfully imported!'}
                    </DialogTitle>
                </DialogHeader>

                <div
                    className={`flex justify-center items-center w-full ${contentAreaHeight} px-6 pb-6`}
                >
                    {state === DIALOG_STATE.LOADING && <LoadingSpinner />}

                    {state !== DIALOG_STATE.LOADING && (
                        <Tabs
                            defaultValue="db"
                            className="w-full h-full flex flex-col"
                        >
                            <div className="flex justify-center">
                                <TabsList className="mb-4 shrink-0">
                                    <TabsTrigger value="image">
                                        Input Image
                                    </TabsTrigger>
                                    <TabsTrigger value="ocr">
                                        OCR Result
                                    </TabsTrigger>
                                    <TabsTrigger value="llm">
                                        LLM Result
                                    </TabsTrigger>
                                    <TabsTrigger value="db">
                                        Processed Matches
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-grow overflow-hidden min-h-0">
                                <TabsContent
                                    value="image"
                                    className="h-full overflow-auto flex justify-center items-center p-2"
                                >
                                    {result.image?.error ? (
                                        <p className="text-red-500 text-center">
                                            {result.image.error}
                                        </p>
                                    ) : result.image?.url ? (
                                        <a
                                            href={result.image.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="max-w-full max-h-full flex justify-center items-center"
                                        >
                                            <img
                                                src={result.image.url}
                                                alt="Input"
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </a>
                                    ) : (
                                        <p>No image data available.</p>
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="ocr"
                                    className="h-full overflow-auto p-2 "
                                >
                                    {result.ocr?.error ? (
                                        <p className="text-red-500">
                                            {result.ocr.error}
                                        </p>
                                    ) : result.ocr?.text ? (
                                        <pre className="text-sm whitespace-pre-wrap break-words">
                                            {result.ocr.text}
                                        </pre>
                                    ) : (
                                        <p>No OCR data available.</p>
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="llm"
                                    className="h-full overflow-auto p-2 border rounded-md"
                                >
                                    {result.llmGeneration?.error ? (
                                        <p className="text-red-500">
                                            {result.llmGeneration.error}
                                        </p>
                                    ) : result.llmGeneration?.matches ? (
                                        <pre className="text-sm whitespace-pre-wrap break-words">
                                            {JSON.stringify(
                                                result.llmGeneration.matches,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    ) : (
                                        <p>No LLM data available.</p>
                                    )}
                                </TabsContent>
                                <TabsContent
                                    value="db"
                                    className="h-full overflow-auto"
                                >
                                    {result.dbInsertion?.error ? (
                                        <p className="text-red-500 p-2">
                                            {result.dbInsertion.error}
                                        </p>
                                    ) : (
                                        <MatchTable
                                            matches={
                                                result.dbInsertion?.items ?? []
                                            }
                                            useHScreen={false}
                                        />
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>
                {state !== DIALOG_STATE.LOADING && (
                    <div className="flex justify-end p-4 border-t">
                        <Button variant="outline" onClick={closeDialog}>
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default DialogComponent

// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
// } from '@/components/ui/dialog'

// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Button } from '@/components/ui/button'
// import { LoadingSpinner } from '@/components/loadingSpinner'
// import { type ProcessResult, deleteRecords } from '@/actions'
// import { useRouter } from '@tanstack/react-router'
// import { MatchTable } from './matchTable'

// const DIALOG_STATE = {
//     LOADING: 'loading',
//     ERROR: 'error',
//     SUCCESS: 'success',
// }

// function getDialogState(result: ProcessResult) {
//     if (
//         result.ocr === undefined &&
//         result.image === undefined &&
//         result.llmGeneration === undefined &&
//         result.dbInsertion === undefined
//     ) {
//         return DIALOG_STATE.LOADING
//     }
//     if (
//         (result.ocr?.error ||
//             result.image?.error ||
//             result.llmGeneration?.error ||
//             result.dbInsertion?.error) &&
//         !(
//             result.ocr?.error &&
//             result.image?.error &&
//             result.llmGeneration?.error &&
//             result.dbInsertion?.error
//         )
//     ) {
//         return DIALOG_STATE.ERROR
//     }
//     if (
//         !result.ocr?.error &&
//         !result.image?.error &&
//         !result.llmGeneration?.error &&
//         !result.dbInsertion?.error
//     ) {
//         return DIALOG_STATE.SUCCESS
//     }
//     return null
// }

// function DialogComponent({
//     openDialog,
//     setOpenDialog,
//     result,
//     setResult,
// }: {
//     openDialog: boolean
//     setOpenDialog: (open: boolean) => void
//     result: ProcessResult
//     setResult: (result: ProcessResult) => void
// }) {
//     const state = getDialogState(result)

//     const closeDialog = () => {
//         setResult({})
//         setOpenDialog(false)
//     }

//     return (
//         <Dialog open={openDialog} onOpenChange={closeDialog}>
//             <DialogContent
//                 className=" overflow-hidden"
//                 onPointerDownOutside={
//                     state === DIALOG_STATE.LOADING
//                         ? (e) => e.preventDefault()
//                         : () => { }
//                 }
//             >
//                 <DialogHeader className="text-center ">
//                     <DialogTitle className="text-2xl font-semibold text-center py-3">
//                         {state === DIALOG_STATE.LOADING && (
//                             <h1>Processing...</h1>
//                         )}
//                         {state === DIALOG_STATE.ERROR && (
//                             <h1>Something went wrong</h1>
//                         )}
//                         {state === DIALOG_STATE.SUCCESS && (
//                             <h1>Matches successfully imported!</h1>
//                         )}
//                     </DialogTitle>
//                 </DialogHeader>
//                 <div className="">
//                     {state === DIALOG_STATE.LOADING && <LoadingSpinner />}
//                     {state !== DIALOG_STATE.LOADING && (
//                         <div>
//                             <Tabs
//                                 defaultValue="db"
//                                 className=" h-[400px]"

//                             >
//                                 <TabsList className="mb-4">
//                                     <TabsTrigger value="image">
//                                         Input Image
//                                     </TabsTrigger>
//                                     <TabsTrigger value="ocr">
//                                         OCR Result
//                                     </TabsTrigger>
//                                     <TabsTrigger value="llm">
//                                         LLM Result
//                                     </TabsTrigger>
//                                     <TabsTrigger value="db">
//                                         Processed Matches
//                                     </TabsTrigger>
//                                 </TabsList>
//                                 <TabsContent
//                                     value="image"
//                                     className="flex justify-center items-center h-[300px] pt-20"
//                                 >
//                                     {result.image?.error ? (
//                                         <p className="text-red-500">
//                                             {result.image.error}
//                                         </p>
//                                     ) : (
//                                         <a
//                                             href={result.image?.url}
//                                             target="_blank"
//                                             rel="noreferrer"
//                                         >
//                                             <img
//                                                 src={result.image?.url}
//                                                 className="max-w-full object-contain"
//                                             />
//                                         </a>
//                                     )}
//                                 </TabsContent>
//                                 <TabsContent
//                                     value="ocr"
//                                     className="h-[300px] overflow-auto"
//                                 >
//                                     {result.ocr?.error ? (
//                                         <p className="text-red-500">
//                                             {result.ocr.error}
//                                         </p>
//                                     ) : (
//                                         <pre className="h-full overflow-auto whitespace-pre-wrap">
//                                             {result.ocr?.text}
//                                         </pre>
//                                     )}
//                                 </TabsContent>
//                                 <TabsContent
//                                     value="llm"
//                                     className="h-[300px] overflow-auto"
//                                 >
//                                     {result.llmGeneration?.error ? (
//                                         <p className="text-red-500">
//                                             {result.llmGeneration.error}
//                                         </p>
//                                     ) : (
//                                         <pre className="h-full overflow-auto whitespace-pre-wrap">
//                                             {JSON.stringify(
//                                                 result.llmGeneration?.matches,
//                                                 null,
//                                                 2,
//                                             )}
//                                         </pre>
//                                     )}
//                                 </TabsContent>
//                                 <TabsContent
//                                     value="db"
//                                     className="h-[300px] overflow-auto"
//                                 >
//                                     {result.dbInsertion?.error ? (
//                                         <p className="text-red-500">
//                                             {result.dbInsertion.error}
//                                         </p>
//                                     ) : (
//                                     <MatchTable matches={result.dbInsertion?.items ?? []} />
//                                     )}
//                                 </TabsContent>

//                             </Tabs>
//                         </div>
//                     )}
//                 </div>
//             </DialogContent>
//         </Dialog>
//     )
// }

// export default DialogComponent
