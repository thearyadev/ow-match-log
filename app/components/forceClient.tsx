import React, { useEffect, useState } from 'react'
import { LoadingSpinner } from './loadingSpinner'

type ForceClientProps = {
    children: React.ReactNode
    useEffectCallbackExtras?: () => void
}
/**
 * ssr hydration boundary. This component ensures that nothing below it is rendered on the server.
 * This can be used for components that directly depend on the client for any functonality
 * could cause hydration errors idk.
 */
export default function ForceClient({
    children,
    useEffectCallbackExtras,
}: ForceClientProps) {
    const [mounted, setMounted] = useState<boolean>(false)

    useEffect(() => {
        setMounted(true)
        useEffectCallbackExtras?.()
    }, [])

    if (!mounted) {
        return <LoadingSpinner />
    }

    return <>{children}</>
}
