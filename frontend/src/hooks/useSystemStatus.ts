import { useEffect, useState } from 'react'
import { fetchStatus, SystemStatus } from '../api/healthClient'

export default function useSystemStatus() {
    const [status, setStatus] = useState<SystemStatus | null>(null)
    useEffect(() => {
        let mounted = true
        fetchStatus().then(s => { if (mounted) setStatus(s) }).catch(() => {
            // fallback to fixtures
            import('../fixtures/system_status.json').then(m => { if (mounted) setStatus(m as any) })
        })
        return () => { mounted = false }
    }, [])
    return status
}
