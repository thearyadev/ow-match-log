import { Button } from '@/components/ui/button'
import { createFileRoute, useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: Home,
})

function Home() {
    return <Button type="button">hello</Button>
}
