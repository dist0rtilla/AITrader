import { getJSON } from './client'

export type SystemStatus = {
    ts: number
    components: Record<string, any>
}

export function fetchStatus(): Promise<SystemStatus> {
    return getJSON<SystemStatus>('/api/status')
}
