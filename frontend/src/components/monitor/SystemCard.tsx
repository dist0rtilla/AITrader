import type { ComponentInfo } from '../../types';

/**
 * SystemCard — presentational card for a system component.
 * Props: { info: ComponentInfo; onRestart?: (id: string) => Promise<void> }
 */
export function SystemCard({ info, onRestart }: { info: ComponentInfo; onRestart?: (id: string) => Promise<void> }) {
    const handleRestart = async () => {
        if (!onRestart) return;
        try {
            await onRestart(info.id);
        } catch (err) {
            console.error('restart failed', err);
        }
    };

    const statusColor = info.status === 'ok' ? 'text-accent-teal' : info.status === 'warn' ? 'text-amber-400' : 'text-red-400';

    return (
        <div className="rounded-lg p-4 bg-neutral-800 text-neutral-100 shadow-elevation-1">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">{info.name}</h3>
                    <p className="text-neutral-400 text-sm">{info.details || 'No additional details'}</p>
                </div>
                <div className="text-right">
                    <div className={`${statusColor} font-semibold`}>{info.status.toUpperCase()}</div>
                    <button
                        aria-label={`Restart ${info.name}`}
                        className="mt-2 inline-flex items-center px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm"
                        onClick={handleRestart}
                    >
                        Restart
                    </button>
                </div>
            </div>
        </div>
    );
}
