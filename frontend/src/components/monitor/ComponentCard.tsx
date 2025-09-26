
import { useState } from 'react'

export default function ComponentCard({ name, meta, onRestart }: { name: string, meta: any, onRestart?: (id: string) => Promise<void> }) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const running = meta && (meta.running === true || meta.status === 'running' || meta.status === 'ok')
    const statusText = running ? 'running' : (meta && meta.status ? String(meta.status) : 'stopped')

    const handleRestart = async () => {
        if (!onRestart) return
        setLoading(true)
        try {
            await onRestart(name)
        } catch (e) {
            console.error('restart failed', e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-3 rounded-md shadow-elevation-1 bg-neutral-800 text-neutral-100">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-sm text-neutral-400 mt-2">{statusText}</div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex gap-2">
                        <button
                            aria-label={`Details ${name}`}
                            className="inline-flex items-center px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm"
                            onClick={() => setOpen(true)}
                        >
                            Details
                        </button>
                        <button
                            aria-label={`Restart ${name}`}
                            className="inline-flex items-center px-3 py-1 rounded bg-accent-teal/10 hover:bg-accent-teal/20 text-sm"
                            onClick={handleRestart}
                            disabled={loading}
                        >
                            {loading ? 'Restarting...' : 'Restart'}
                        </button>
                    </div>
                </div>
            </div>

            {open && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                    <div className="relative max-w-md w-full p-6 bg-neutral-900 rounded-lg shadow-elevation-3 text-neutral-100">
                        <h3 className="text-lg font-semibold mb-2">{name} details</h3>
                        <pre className="text-sm text-neutral-300 max-h-64 overflow-auto">{JSON.stringify(meta, null, 2)}</pre>
                        <div className="mt-4 flex justify-end">
                            <button className="px-3 py-1 rounded bg-neutral-700" onClick={() => setOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
