import { TypeIcon, GroupIcon } from 'lucide-react'

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
            variant="floating"
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
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="h-full overflow-y-scroll">
                    <SidebarGroupContent>
                        <SidebarGroupLabel>Collections</SidebarGroupLabel>
                        <SidebarMenu>
                            {collections.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton asChild>
                                        <a href={`/collection/${item.id}`}>
                                            <GroupIcon />
                                            <span>{item.name}</span>
                                        </a>
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
