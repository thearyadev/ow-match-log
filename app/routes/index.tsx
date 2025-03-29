import { Button } from '@/components/ui/button'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: Home,
    beforeLoad: () => {
        throw redirect({
            // @ts-ignore : dynamic route.
            to: '/collection/all',
            permanent: true,
        })
    },
})

function Home() {}
