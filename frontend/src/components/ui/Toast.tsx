import React, { createContext, useContext, useState } from 'react';

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' }

const ToastContext = createContext<any>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    function push(t: Omit<Toast, 'id'>) {
        const id = Math.random().toString(36).slice(2, 9)
        setToasts(s => [...s, { id, ...t }])
        setTimeout(() => {
            setToasts(s => s.filter(x => x.id !== id))
        }, 5000)
    }

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-2 rounded ${t.type === 'error' ? 'bg-red-700' : t.type === 'success' ? 'bg-green-700' : 'bg-neutral-700'} text-white`}>{t.message}</div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    return useContext(ToastContext)
}
