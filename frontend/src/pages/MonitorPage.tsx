import { useState } from 'react'
import TopNav from '../components/layout/TopNav'
import ComponentCard from '../components/monitor/ComponentCard'
import { ToastProvider, useToast } from '../components/ui/Toast'
import useSystemStatus from '../hooks/useSystemStatus'
import useWebSocket from '../hooks/useWebSocket'

export default function MonitorPage() {
    const status = useSystemStatus()
    const [events, setEvents] = useState<any[]>([])

    useWebSocket('/api/ws/monitor', (ev: any) => {
        // prepend events
        setEvents((s) => [ev, ...s].slice(0, 100))
    })

    return (
        <ToastProvider>
            <MonitorInner status={status} events={events} setEvents={setEvents} />
        </ToastProvider>
    )


    function MonitorInner({ status, events, setEvents }: { status: any; events: any[]; setEvents: (v: any) => void }) {
        const toast = useToast()

        async function handleRestart(id: string) {
            try {
                const res = await fetch(`/api/components/${id}/restart`, { method: 'POST' })
                if (!res.ok) throw new Error('Restart failed')
                toast.push({ message: `Restarted ${id}`, type: 'success' })
            } catch (e) {
                console.error('restart error', e)
                toast.push({ message: `Restart failed: ${String(e)}`, type: 'error' })
            }
        }

        return (
            <div className="container mx-auto p-6">
                <TopNav />
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Monitor</h2>
                    <div className="text-sm text-neutral-400">{status && status.ts ? `Last: ${new Date(status.ts * 1000).toLocaleString()}` : 'Loading...'}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {status ? Object.entries(status.components).map(([k, v]: any) => (
                                <ComponentCard key={k} name={k} meta={v} onRestart={handleRestart} />
                            )) : <div>loading...</div>}
                        </div>
                    </div>

                    <aside className="bg-neutral-800 p-4 rounded-lg shadow-elevation-1">
                        <h3 className="text-lg font-medium mb-2">Events</h3>
                        <div className="flex flex-col gap-2 max-h-96 overflow-auto">
                            {events.length === 0 && <div className="text-sm text-neutral-400">No recent events</div>}
                            {events.map((e: any, idx: number) => (
                                <div key={idx} className="text-sm text-neutral-200">
                                    <div className="font-semibold">{String(e.type)}</div>
                                    <div className="text-neutral-400">{JSON.stringify(e.payload)}</div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        )
    }
    async function handleRestart(id: string) {
        try {
            await fetch(`/api/components/${id}/restart`, { method: 'POST' })
        } catch (e) {
            console.error('restart error', e)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <TopNav />
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Monitor</h2>
                <div className="text-sm text-neutral-400">{status ? `Last: ${new Date(status.ts * 1000).toLocaleString()}` : 'Loading...'}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                            const compObj = status && (status as any).components ? (status as any).components : null
                            if (!compObj) return <div>loading...</div>
                            const compsArr = Object.entries(compObj)
                            return compsArr.map(([k, v]: any) => <ComponentCard key={k} name={k} meta={v} onRestart={handleRestart} />)
                        })()}
                    </div>
                </div>

                <aside className="bg-neutral-800 p-4 rounded-lg shadow-elevation-1">
                    <h3 className="text-lg font-medium mb-2">Events</h3>
                    <div className="flex flex-col gap-2 max-h-96 overflow-auto">
                        {events.length === 0 && <div className="text-sm text-neutral-400">No recent events</div>}
                        {events.map((e, idx) => (
                            <div key={idx} className="text-sm text-neutral-200">
                                <div className="font-semibold">{e.type}</div>
                                <div className="text-neutral-400">{JSON.stringify(e.payload)}</div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    )
}
