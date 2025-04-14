import type { ReactNode } from 'react'
import {
    Outlet,
    createRootRoute,
    HeadContent,
    Scripts,
} from '@tanstack/react-router'
import appCss from '@/styles/app.css?url'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/sidebar'
import {
    BoxIcon,
    DownloadIcon,
    FolderIcon,
    GitGraphIcon,
    NewspaperIcon,
} from 'lucide-react'
import { Header } from '@/components/header'
import ScreenSizeIndicator from '@/components/ssi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { collection } from '@/db/schema'
import { db } from '@/db'
import { createServerFn } from '@tanstack/react-start'
const GetCollections = createServerFn().handler(async () => {
    const data = await db.select().from(collection).execute()
    return data
})

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head />
            <body>
                <main>{children}</main>
                <Toaster />
            </body>
        </html>
    )
}

export const Route = createRootRoute({
    head: () => ({
        links: [
            {
                rel: 'stylesheet',
                href: appCss,
            },
        ],
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'Overwatch Match Log',
            },
        ],
    }),
    component: RootComponent,
    loader: async () => {
        return {
            collections: await GetCollections(),
        }
    },
})

const CreateCollection = createServerFn()
    .validator((name: string) => name)
    .handler(async ({ data }) => {
        await db.insert(collection).values({ name: data })
    })

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    )
}
const queryClient = new QueryClient()

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    const { collections } = Route.useLoaderData()

    const [dialogOpen, setDialogOpen] = React.useState(collections.length === 0)
    const [collectionName, setCollectionName] = React.useState('')

    const sidebarLinks = [
        {
            title: 'All Data',
            url: '/collection/all',
            icon: BoxIcon,
        },
    ]

    return (
        <html className="dark">
            <head>
                <HeadContent />
            </head>
            <body className="">
                <ScreenSizeIndicator />
                <Dialog open={dialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Welcome to Overwatch Match Log!
                            </DialogTitle>
                            <DialogDescription className="grid grid-rows-3 gap-4">
                                Enter the name for your first collection. This
                                can be anything, but a common scheme is the
                                season number. For example, "Season 12"
                                <Input
                                    onChange={(e) =>
                                        setCollectionName(e.target.value)
                                    }
                                    value={collectionName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            CreateCollection({
                                                data: collectionName,
                                            }).then(() => {
                                                setDialogOpen(false)
                                            })
                                        }
                                    }}
                                />
                                <Button
                                    onClick={() => {
                                        CreateCollection({
                                            data: collectionName,
                                        }).then(() => {
                                            setDialogOpen(false)
                                            setCollectionName('')
                                        })
                                    }}
                                >
                                    Create
                                </Button>
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>

                <QueryClientProvider client={queryClient}>
                    <SidebarProvider defaultOpen={false}>
                        <AppSidebar
                            items={sidebarLinks}
                            collections={collections}
                            onCreateCollection={() => setDialogOpen(true)}
                        />
                        <main className="w-full h-screen flex flex-col">
                            {children}
                        </main>
                        <Toaster />
                    </SidebarProvider>
                </QueryClientProvider>

                <Scripts />
            </body>
        </html>
    )
}
