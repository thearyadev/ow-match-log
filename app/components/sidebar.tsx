import { TypeIcon, GroupIcon, FolderIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'
import { Button } from './ui/button'

interface SidebarItem {
    title: string
    url: string
    icon: typeof TypeIcon
}

export function AppSidebar({
    items,
    collections,
    onCreateCollection,
}: {
    items: SidebarItem[]
    collections: { id: number; name: string }[]
    onCreateCollection: () => void
}) {
    const { setOpen } = useSidebar()
    return (
        <Sidebar
            collapsible="icon"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link to={item.url}>
                                            <item.icon className="text-gray-300" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <span
                                        className="hover:cursor-pointer"
                                        onClick={onCreateCollection}
                                    >
                                        <FolderIcon className="text-gray-300" />
                                        <span>Create Collection</span>
                                    </span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="h-full overflow-y-scroll overflow-x-hidden">
                    <SidebarGroupContent>
                        <SidebarGroupLabel>Collections</SidebarGroupLabel>
                        <SidebarMenu>
                            {collections.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton asChild>
                                        <Link
                                            // @ts-ignore
                                            to={`/collection/${item.id}`}
                                            className="text-center"
                                        >
                                            <GroupIcon className="text-gray-300" />
                                            <span>{item.name}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
