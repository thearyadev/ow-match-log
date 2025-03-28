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
import { DownloadIcon, GitGraphIcon, NewspaperIcon } from 'lucide-react'
import { Header } from '@/components/header'
import ScreenSizeIndicator from '@/components/ssi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

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
        links: [
            {
                rel: 'stylesheet',
                href: appCss,
            },
        ],
    }),
    component: RootComponent,
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
    const sidebarLinks = [
        {
            title: 'Statistics',
            url: '/statistics',
            icon: GitGraphIcon,
        },
        {
            title: 'Data',
            url: '/data',
            icon: NewspaperIcon,
        },
        {
            title: 'Import',
            url: '/import',
            icon: DownloadIcon,
        },
    ]

    return (
        <html className="dark">
            <head>
                <HeadContent />
            </head>
            <body className="">
                <ScreenSizeIndicator />
                <QueryClientProvider client={queryClient}>
                    <SidebarProvider>
                        <AppSidebar items={sidebarLinks} />
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
