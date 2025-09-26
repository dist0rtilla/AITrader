// Shared TypeScript types for the frontend (copy of canonical shapes from instructions)

export interface ComponentInfo {
    id: string;
    name: string;
    status: 'ok' | 'warn' | 'error';
    details?: string;
}

export interface GPUInfo {
    id: string;
    name: string;
    memoryTotal: number;
    memoryUsed: number;
    utilization?: number;
}

export interface SystemStatus {
    timestamp: string; // ISO
    components: ComponentInfo[];
    gpus?: GPUInfo[];
}

export interface Signal {
    id: string;
    symbol: string;
    time: string; // ISO
    score: number; // -1..1
    meta?: Record<string, any>;
}

export type WebSocketEvent =
    | { type: 'system_status'; payload: SystemStatus }
    | { type: 'signal'; payload: Signal }
    | { type: 'prediction'; payload: { id: string; symbol: string; time: string; values: number[] } }
    | { type: 'sentiment'; payload: { symbol: string; score: number; window: string } }
    | { type: 'settings_update'; payload: { keyPath: string; value: any } };

export interface SettingsSnapshot {
    settings: Record<string, any>;
    updatedAt?: string;
    updatedBy?: string;
}
