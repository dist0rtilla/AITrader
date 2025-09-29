/**
 * ComponentStatusParser — utility for parsing and structuring component metadata
 * 
 * Copilot: Transforms raw component metadata into structured, displayable information.
 * Features:
 * - Extracts health metrics, operational parameters, and resource usage
 * - Normalizes different component metadata formats
 * - Provides fallback values for missing data
 * - Calculates derived metrics and health scores
 * 
 * Usage: const status = parseComponentStatus(componentName, rawMeta);
 */

export interface ComponentHealth {
    status: 'running' | 'warning' | 'error' | 'stopped' | 'starting';
    uptime?: string;
    lastSeen?: string;
    healthScore?: number;
}

export interface ComponentMetrics {
    cpuUsage?: number;
    memoryUsage?: number;
    requestsPerSecond?: number;
    errorRate?: number;
    responseTime?: number;
    connections?: number;
    processedItems?: number;
}

export interface ComponentConfig {
    version?: string;
    environment?: string;
    host?: string;
    port?: number;
    database?: string;
    modelPath?: string;
    [key: string]: any;
}

export interface ParsedComponentStatus {
    name: string;
    type: 'service' | 'database' | 'engine' | 'api' | 'runner' | 'unknown';
    health: ComponentHealth;
    metrics: ComponentMetrics;
    config: ComponentConfig;
    rawData: any;
}

export function parseComponentStatus(name: string, meta: any): ParsedComponentStatus {
    try {
        if (!meta || typeof meta !== 'object') {
            return createDefaultStatus(name, meta);
        }

        // Check for circular references or problematic data
        try {
            JSON.stringify(meta);
        } catch (error) {
            console.warn('ComponentStatusParser: Circular reference or invalid data detected', error);
            return createDefaultStatus(name, { error: 'Invalid data structure' });
        }

        const componentType = determineComponentType(name);
        const health = parseHealthStatus(meta);
        const metrics = parseMetrics(meta, componentType);
        const config = parseConfiguration(meta);

        return {
            name,
            type: componentType,
            health,
            metrics,
            config,
            rawData: meta
        };
    } catch (error) {
        console.error('ComponentStatusParser: Error parsing component status', error);
        return createDefaultStatus(name, { error: 'Parser error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}

function determineComponentType(name: string): ParsedComponentStatus['type'] {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('database') || lowerName.includes('postgres') || lowerName.includes('redis')) {
        return 'database';
    }
    if (lowerName.includes('engine')) {
        return 'engine';
    }
    if (lowerName.includes('api') || lowerName.includes('backend') || lowerName.includes('frontend')) {
        return 'api';
    }
    if (lowerName.includes('runner') || lowerName.includes('onnx') || lowerName.includes('tensorrt')) {
        return 'runner';
    }
    if (lowerName.includes('service') || lowerName.includes('worker')) {
        return 'service';
    }

    return 'unknown';
}

function parseHealthStatus(meta: any): ComponentHealth {
    // Copilot: Extract health information from various metadata formats
    const status = meta.status || meta.state || meta.health || 'unknown';
    const running = meta.running ?? (status === 'ok' || status === 'running' || status === 'healthy');

    let normalizedStatus: ComponentHealth['status'] = 'stopped';
    if (running || status === 'running' || status === 'ok' || status === 'healthy') {
        normalizedStatus = 'running';
    } else if (status === 'warning' || status === 'warn') {
        normalizedStatus = 'warning';
    } else if (status === 'error' || status === 'failed' || status === 'down') {
        normalizedStatus = 'error';
    } else if (status === 'starting' || status === 'initializing') {
        normalizedStatus = 'starting';
    }

    return {
        status: normalizedStatus,
        uptime: meta.uptime || meta.uptimeSeconds ? formatUptime(meta.uptimeSeconds || meta.uptime) : undefined,
        lastSeen: meta.lastSeen || meta.timestamp ? formatTimestamp(meta.lastSeen || meta.timestamp) : undefined,
        healthScore: calculateHealthScore(meta)
    };
}

function parseMetrics(meta: any, componentType: string): ComponentMetrics {
    const metrics: ComponentMetrics = {};

    // Copilot: Extract performance metrics based on component type
    if (meta.cpu !== undefined) metrics.cpuUsage = parseFloat(meta.cpu);
    if (meta.memory !== undefined) metrics.memoryUsage = parseFloat(meta.memory);
    if (meta.memoryUsage !== undefined) metrics.memoryUsage = parseFloat(meta.memoryUsage);

    // Request/response metrics
    if (meta.requestsPerSecond !== undefined) metrics.requestsPerSecond = parseFloat(meta.requestsPerSecond);
    if (meta.rps !== undefined) metrics.requestsPerSecond = parseFloat(meta.rps);
    if (meta.errorRate !== undefined) metrics.errorRate = parseFloat(meta.errorRate);
    if (meta.responseTime !== undefined) metrics.responseTime = parseFloat(meta.responseTime);
    if (meta.avgResponseTime !== undefined) metrics.responseTime = parseFloat(meta.avgResponseTime);

    // Connection metrics
    if (meta.connections !== undefined) metrics.connections = parseInt(meta.connections);
    if (meta.activeConnections !== undefined) metrics.connections = parseInt(meta.activeConnections);

    // Processing metrics
    if (meta.processed !== undefined) metrics.processedItems = parseInt(meta.processed);
    if (meta.itemsProcessed !== undefined) metrics.processedItems = parseInt(meta.itemsProcessed);
    if (meta.signalsGenerated !== undefined) metrics.processedItems = parseInt(meta.signalsGenerated);

    return metrics;
}

function parseConfiguration(meta: any): ComponentConfig {
    const config: ComponentConfig = {};

    // Copilot: Extract configuration details
    if (meta.version) config.version = meta.version;
    if (meta.environment || meta.env) config.environment = meta.environment || meta.env;
    if (meta.host || meta.hostname) config.host = meta.host || meta.hostname;
    if (meta.port) config.port = parseInt(meta.port);
    if (meta.database || meta.db) config.database = meta.database || meta.db;
    if (meta.modelPath || meta.model) config.modelPath = meta.modelPath || meta.model;

    // Include other configuration keys
    Object.keys(meta).forEach(key => {
        if (!['status', 'running', 'health', 'cpu', 'memory', 'uptime', 'timestamp', 'lastSeen'].includes(key)) {
            config[key] = meta[key];
        }
    });

    return config;
}

function calculateHealthScore(meta: any): number {
    // Copilot: Calculate a 0-100 health score based on available metrics
    let score = 50; // Base score

    if (meta.status === 'running' || meta.status === 'ok') score += 30;
    else if (meta.status === 'warning') score += 10;
    else if (meta.status === 'error') score -= 30;

    if (meta.cpu !== undefined) {
        const cpu = parseFloat(meta.cpu);
        if (cpu < 50) score += 10;
        else if (cpu > 80) score -= 15;
    }

    if (meta.memory !== undefined) {
        const memory = parseFloat(meta.memory);
        if (memory < 70) score += 10;
        else if (memory > 90) score -= 20;
    }

    if (meta.errorRate !== undefined) {
        const errorRate = parseFloat(meta.errorRate);
        if (errorRate < 1) score += 10;
        else if (errorRate > 5) score -= 20;
    }

    return Math.max(0, Math.min(100, score));
}

function formatUptime(seconds: number | string): string {
    const secs = typeof seconds === 'string' ? parseInt(seconds) : seconds;
    if (isNaN(secs)) return 'Unknown';

    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatTimestamp(timestamp: string | number): string {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString();
    } catch {
        return 'Invalid date';
    }
}

function createDefaultStatus(name: string, meta: any): ParsedComponentStatus {
    return {
        name,
        type: 'unknown',
        health: {
            status: 'stopped',
            healthScore: 0
        },
        metrics: {},
        config: {},
        rawData: meta
    };
}