// Shared TypeScript types for the frontend (copy of canonical shapes from instructions)

export interface ComponentInfo {
    id: string;
    name: string;
    status: 'ok' | 'warn' | 'error' | 'warning';
    details?: string;
    uptime?: string;
    version?: string;
    memory?: string;
    cpu?: string;
    gpu?: string;
    port?: number;
    requests?: string;
    patterns?: string;
    sentiment?: string;
    strategies?: string;
    feeds?: string;
    connections?: string;
    tasks?: string;
    ticks?: string;
    books?: string;
    executions?: string;
    inferences?: string;
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

export interface Prediction {
    id: string;
    symbol: string;
    time: string; // ISO
    values: number[];
    horizon?: number;
    model?: string;
    confidence?: number;
}

export interface SentimentData {
    symbol: string;
    score: number; // -1..1
    window: string;
    timestamp: string;
    sources?: string[];
}

export interface ComponentMetrics {
    id: string;
    name: string;
    metrics: {
        cpu?: number;
        memory?: number;
        requests_per_second?: number;
        error_rate?: number;
        uptime?: number;
    };
    timestamp: string;
}

export interface TrainingJob {
    id: string;
    model: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    createdAt: string;
    completedAt?: string;
    metrics?: Record<string, number>;
}

export interface ExecutionOrder {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price?: number;
    status: 'pending' | 'filled' | 'cancelled' | 'rejected';
    timestamp: string;
    fillPrice?: number;
    fillQuantity?: number;
}
