import { useEffect, useRef } from 'react'

export default function useWebSocket(url: string, onMessage: (data: any) => void) {
    const wsRef = useRef<WebSocket | null>(null)
    useEffect(() => {
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.onmessage = e => {
            try { onMessage(JSON.parse(e.data)) } catch (e) { }
        }
        return () => { try { ws.close() } catch (e) { } }
    }, [url, onMessage])
}
