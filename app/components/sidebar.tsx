import { TypeIcon, GroupIcon } from 'lucide-react'
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

interface SidebarItem {
    title: string
    url: string
    icon: typeof TypeIcon
}

export function AppSidebar({
    items,
    collections,
}: { items: SidebarItem[]; collections: { id: number; name: string }[] }) {
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
                                        {/* @ts-ignore */}
                                        <Link
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
