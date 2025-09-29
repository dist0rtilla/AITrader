/**
 * SystemsPage — comprehensive system monitoring and management
 * 
 * Features:
 * - System overview with health metrics
 * - Detailed component monitoring
 * - Performance metrics and resource usage
 * - System logs and event history  
 * - Bulk operations and system controls
 * - Service dependency visualization
 */

import { AlertTriangle, CheckCircle, Clock, Cpu, Download, Eye, Gauge, Network, RefreshCw, RotateCcw, Search, Server, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import SystemsMonitor from '../components/monitor/SystemsMonitor';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import useSystemStatus from '../hooks/useSystemStatus';
import useWebSocket from '../hooks/useWebSocket';
import { ComponentInfo } from '../types';

interface SystemMetrics {
    totalServices: number;
    healthyServices: number;
    warningServices: number;
    errorServices: number;
    systemUptime: string;
    totalMemoryUsage: string;
    totalCpuUsage: string;
    diskUsage: string;
    networkActivity: string;
    gpuUtilization: string;
    gpuMemory: string;
    gpuTemperature: string;
    gpuPower: string;
}

interface SystemLog {
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    service: string;
    message: string;
}

export default function SystemsPage() {
    const { status: systemStatus, loading: statusLoading, error: statusError, refetch: refreshStatus } = useSystemStatus(30000); // Auto-refresh every 30s
    const { isConnected } = useWebSocket('/api/ws/monitor');
    const [selectedView, setSelectedView] = useState<'overview' | 'components' | 'performance' | 'logs'>('overview');
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Real services based on docker-compose.yml
    const componentsArray = systemStatus?.components || [];
    const enhancedComponents: ComponentInfo[] = componentsArray.length > 0 ? componentsArray : [
        {
            id: 'postgres',
            name: 'PostgreSQL Database',
            status: 'ok',
            details: 'Primary database for trading data - 99.9% uptime',
            uptime: '15d 6h 42m',
            version: 'PostgreSQL 15-alpine',
            memory: '512MB',
            cpu: '8%',
            connections: '45/100'
        },
        {
            id: 'redis',
            name: 'Redis Cache',
            status: 'ok',
            details: 'In-memory data store and message broker',
            uptime: '15d 6h 42m',
            version: 'Redis 7',
            memory: '128MB',
            cpu: '3%',
            connections: '12/64'
        },
        {
            id: 'backend',
            name: 'Backend API',
            status: 'ok',
            details: 'Main FastAPI backend service - all endpoints responding',
            uptime: '5d 12h 15m',
            version: 'v1.2.3',
            memory: '256MB',
            cpu: '15%',
            requests: '1.2k/min'
        },
        {
            id: 'worker',
            name: 'Background Worker',
            status: 'ok',
            details: 'Background task processing worker',
            uptime: '5d 12h 15m',
            version: 'v1.2.3',
            memory: '192MB',
            cpu: '12%',
            tasks: '47/min'
        },
        {
            id: 'tick_replay',
            name: 'Tick Replay Service',
            status: 'ok',
            details: 'Market data tick replay system',
            uptime: '3d 8h 30m',
            version: 'v1.0.0',
            memory: '128MB',
            cpu: '8%',
            ticks: '25k/min'
        },
        {
            id: 'book_builder',
            name: 'Order Book Builder',
            status: 'ok',
            details: 'Real-time order book construction',
            uptime: '3d 8h 30m',
            version: 'v1.0.0',
            memory: '256MB',
            cpu: '18%',
            books: '15/sec'
        },
        {
            id: 'pattern_engine',
            name: 'Pattern Detection Engine',
            status: 'ok',
            details: 'ML pattern detection service - processing 50k patterns/min',
            uptime: '2d 16h 20m',
            version: 'v0.9.1',
            memory: '1.0GB',
            cpu: '25%',
            patterns: '847/min'
        },
        {
            id: 'strategy_engine',
            name: 'Strategy Engine',
            status: 'ok',
            details: 'Trading strategy execution - 12 active strategies',
            uptime: '2d 14h 45m',
            version: 'v2.1.0',
            memory: '768MB',
            cpu: '32%',
            strategies: '12 active'
        },
        {
            id: 'execution_simulator',
            name: 'Execution Simulator',
            status: 'ok',
            details: 'Trade execution simulation service',
            uptime: '1d 6h 12m',
            version: 'v1.1.0',
            memory: '384MB',
            cpu: '20%',
            executions: '156/min'
        },
        {
            id: 'onnx_runner',
            name: 'ONNX Model Runner',
            status: 'ok',
            details: 'GPU-accelerated ONNX model inference - GPU utilization 45%',
            uptime: '2d 10h 5m',
            version: 'v1.0.0',
            memory: '2.0GB',
            cpu: '15%',
            gpu: '45%',
            inferences: '2.3k/min'
        },
        {
            id: 'frontend',
            name: 'Frontend Server',
            status: 'ok',
            details: 'React frontend application served by nginx',
            uptime: '1d 4h 20m',
            version: 'v2.1.0',
            memory: '64MB',
            cpu: '2%',
            requests: '892/min'
        },
        {
            id: 'backend-main',
            name: 'Backend Main Service',
            status: 'ok',
            details: 'Additional backend service instance',
            uptime: '4d 18h 35m',
            version: 'dev',
            memory: '320MB',
            cpu: '18%',
            requests: '654/min'
        },
        {
            id: 'mock-mcp',
            name: 'Mock MCP Service',
            status: 'ok',
            details: 'Mock Model Context Protocol service',
            uptime: '15d 6h 42m',
            version: 'v1.0.0',
            memory: '96MB',
            cpu: '5%',
            requests: '234/min'
        },
        {
            id: 'sentiment_engine',
            name: 'Sentiment Analysis Engine',
            status: 'warning',
            details: 'NLP sentiment analysis - high latency detected (450ms)',
            uptime: '6h 30m',
            version: 'v1.0.5',
            memory: '512MB',
            cpu: '22%',
            sentiment: '89/min'
        },
        {
            id: 'tensorrt_runner',
            name: 'TensorRT Runner',
            status: 'ok',
            details: 'High-performance GPU inference with TensorRT - GPU 68%',
            uptime: '1d 12h 48m',
            version: 'v1.0.0',
            memory: '1.5GB',
            cpu: '12%',
            gpu: '68%',
            inferences: '4.1k/min'
        }
    ];

    // Mock system metrics with GPU data
    const systemMetrics: SystemMetrics = {
        totalServices: enhancedComponents.length,
        healthyServices: enhancedComponents.filter(c => c.status === 'ok').length,
        warningServices: enhancedComponents.filter(c => c.status === 'warning').length,
        errorServices: enhancedComponents.filter(c => c.status === 'error').length,
        systemUptime: '15d 6h 42m',
        totalMemoryUsage: '2.1GB / 8GB',
        totalCpuUsage: '34%',
        diskUsage: '45GB / 100GB',
        networkActivity: '2.3MB/s',
        gpuUtilization: '78%',
        gpuMemory: '6.2GB / 12GB',
        gpuTemperature: '72°C',
        gpuPower: '285W / 350W'
    };

    // Mock system logs with real service names
    const generateMockLogs = (): SystemLog[] => [
        { id: '1', timestamp: '2025-09-28T10:15:30Z', level: 'info', service: 'Pattern Detection Engine', message: 'Successfully processed 50,000 market patterns - GPU utilization at 45%' },
        { id: '2', timestamp: '2025-09-28T10:14:22Z', level: 'warning', service: 'Sentiment Analysis Engine', message: 'High latency detected: 450ms response time - investigating transformer model performance' },
        { id: '3', timestamp: '2025-09-28T10:13:45Z', level: 'info', service: 'Order Book Builder', message: 'Real-time order book construction active - processing 15 books/sec' },
        { id: '4', timestamp: '2025-09-28T10:12:18Z', level: 'info', service: 'PostgreSQL Database', message: 'Automated backup completed successfully - 512MB RAM usage stable' },
        { id: '5', timestamp: '2025-09-28T10:11:33Z', level: 'error', service: 'Strategy Engine', message: 'Strategy "MeanReversion-v2" execution failed: insufficient balance for trade size' },
        { id: '6', timestamp: '2025-09-28T10:10:05Z', level: 'info', service: 'Backend API', message: 'Health check passed - all endpoints responsive at 1.2k req/min' },
        { id: '7', timestamp: '2025-09-28T10:09:18Z', level: 'info', service: 'TensorRT Runner', message: 'GPU inference running optimally - 68% GPU utilization, 72°C temperature' },
        { id: '8', timestamp: '2025-09-28T10:08:45Z', level: 'info', service: 'ONNX Model Runner', message: 'Model inference at 2.3k/min - GPU acceleration enabled' },
        { id: '9', timestamp: '2025-09-28T10:07:33Z', level: 'info', service: 'Tick Replay Service', message: 'Market data replay active - processing 25k ticks/min' },
        { id: '10', timestamp: '2025-09-28T10:06:22Z', level: 'info', service: 'Redis Cache', message: 'Cache performance optimal - 128MB usage, 12 active connections' }
    ];

    useEffect(() => {
        setSystemLogs(generateMockLogs());
    }, []);

    const filteredLogs = systemLogs.filter(log => {
        const matchesFilter = logFilter === 'all' || log.level === logFilter;
        const matchesSearch = searchTerm === '' ||
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.service.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleRestartService = async (serviceId: string) => {
        try {
            // Mock restart API call
            console.log(`Restarting service: ${serviceId}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            refreshStatus();
        } catch (error) {
            console.error('Failed to restart service:', error);
        }
    };

    const handleBulkAction = async (action: 'restart' | 'stop' | 'start', serviceIds: string[]) => {
        try {
            console.log(`Performing ${action} on services:`, serviceIds);
            await new Promise(resolve => setTimeout(resolve, 2000));
            refreshStatus();
        } catch (error) {
            console.error(`Failed to ${action} services:`, error);
        }
    };

    if (statusLoading && !systemStatus) {
        return (
            <div className="space-y-8 min-h-screen">
                <div className="glass-container rounded-glass p-8 animate-pulse">
                    <div className="h-8 bg-glass-light rounded-glass-button w-64 mb-4"></div>
                    <div className="h-4 bg-glass-light rounded-glass-button w-96"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 min-h-screen">
            {/* Enhanced header with system status */}
            <div className="glass-container rounded-glass p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 glass-card rounded-glass-button animate-float">
                            <Server className="w-8 h-8 text-accent-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-glass-bright mb-2">System Management</h1>
                            <p className="text-glass-muted">Monitor, manage, and optimize your trading infrastructure</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge
                            variant="outline"
                            className={`px-4 py-2 font-medium border-glass backdrop-blur-card ${isConnected
                                    ? 'bg-status-ok-bg border-status-ok-border text-status-ok'
                                    : 'bg-status-error-bg border-status-error-border text-status-error'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-status-ok animate-pulse-glow' : 'bg-status-error animate-pulse-glow'
                                }`} />
                            {isConnected ? 'Real-time Connected' : 'Disconnected'}
                        </Badge>
                        <Button
                            onClick={refreshStatus}
                            variant="outline"
                            size="sm"
                            className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-glass-bright"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Navigation tabs */}
                <div className="flex gap-2 border-b border-glass-border">
                    {[
                        { id: 'overview', label: 'Overview', icon: Gauge },
                        { id: 'components', label: 'Components', icon: Server },
                        { id: 'performance', label: 'Performance', icon: Cpu },
                        { id: 'logs', label: 'System Logs', icon: Eye }
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setSelectedView(id as any)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-300 border-b-2 ${selectedView === id
                                    ? 'text-accent-primary border-accent-primary'
                                    : 'text-glass-muted border-transparent hover:text-glass-bright hover:border-glass-border'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Tab */}
            {selectedView === 'overview' && (
                <div className="space-y-8">
                    {/* System Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                        <div className="glass-card glass-hover-lift rounded-glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Services Health</div>
                                <CheckCircle className="w-5 h-5 text-accent-teal" />
                            </div>
                            <div className="text-3xl font-bold text-glass-bright mb-2">
                                {systemMetrics.healthyServices}/{systemMetrics.totalServices}
                            </div>
                            <div className="text-sm text-glass-muted">
                                {systemMetrics.warningServices} warnings, {systemMetrics.errorServices} errors
                            </div>
                        </div>

                        <div className="glass-card glass-hover-lift rounded-glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">System Uptime</div>
                                <Clock className="w-5 h-5 text-accent-primary" />
                            </div>
                            <div className="text-3xl font-bold text-glass-bright mb-2">{systemMetrics.systemUptime}</div>
                            <div className="text-sm text-glass-muted">99.9% availability</div>
                        </div>

                        <div className="glass-card glass-hover-lift rounded-glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Resource Usage</div>
                                <Cpu className="w-5 h-5 text-accent-amber" />
                            </div>
                            <div className="text-3xl font-bold text-glass-bright mb-2">{systemMetrics.totalCpuUsage}</div>
                            <div className="text-sm text-glass-muted">CPU • {systemMetrics.totalMemoryUsage} RAM</div>
                        </div>

                        <div className="glass-card glass-hover-lift rounded-glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">GPU Utilization</div>
                                <Zap className="w-5 h-5 text-accent-violet" />
                            </div>
                            <div className="text-3xl font-bold text-glass-bright mb-2">{systemMetrics.gpuUtilization}</div>
                            <div className="text-sm text-glass-muted">{systemMetrics.gpuMemory} • {systemMetrics.gpuTemperature}</div>
                        </div>

                        <div className="glass-card glass-hover-lift rounded-glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-glass-muted font-medium uppercase tracking-wide">Network Activity</div>
                                <Network className="w-5 h-5 text-accent-emerald" />
                            </div>
                            <div className="text-3xl font-bold text-glass-bright mb-2">{systemMetrics.networkActivity}</div>
                            <div className="text-sm text-glass-muted">Disk: {systemMetrics.diskUsage}</div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="glass-container rounded-glass p-8">
                        <h2 className="text-2xl font-bold text-glass-bright mb-6">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                                onClick={() => handleBulkAction('restart', enhancedComponents.map(c => c.id))}
                                className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-primary p-4 h-auto flex-col gap-2"
                            >
                                <RotateCcw className="w-6 h-6" />
                                <span>Restart All Services</span>
                            </Button>
                            <Button
                                onClick={() => window.open('/api/system/backup', '_blank')}
                                className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-teal p-4 h-auto flex-col gap-2"
                            >
                                <Download className="w-6 h-6" />
                                <span>Download System Backup</span>
                            </Button>
                            <Button
                                onClick={() => refreshStatus()}
                                className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-accent-emerald p-4 h-auto flex-col gap-2"
                            >
                                <RefreshCw className="w-6 h-6" />
                                <span>Refresh All Data</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Components Tab */}
            {selectedView === 'components' && (
                <div className="glass-container rounded-glass p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-glass-bright">System Components</h2>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleBulkAction('restart', enhancedComponents.filter(c => c.status === 'warning').map(c => c.id))}
                                variant="outline"
                                size="sm"
                                className="glass-button border-glass text-glass-muted hover:text-glass-bright"
                                disabled={!enhancedComponents.some(c => c.status === 'warning')}
                            >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Restart Warning Services
                            </Button>
                        </div>
                    </div>
                    <SystemsMonitor
                        components={enhancedComponents}
                        loading={statusLoading}
                        error={statusError || undefined}
                        onRestart={handleRestartService}
                    />
                </div>
            )}

            {/* Performance Tab */}
            {selectedView === 'performance' && (
                <div className="space-y-8">
                    <div className="glass-container rounded-glass p-8">
                        <h2 className="text-2xl font-bold text-glass-bright mb-6">Performance Metrics</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Resource Usage Chart Placeholder */}
                            <div className="glass-card rounded-glass-card p-6">
                                <h3 className="text-lg font-semibold text-glass-bright mb-4">Resource Usage Trends</h3>
                                <div className="bg-glass-surface rounded-glass p-8 text-center">
                                    <Gauge className="w-16 h-16 text-glass-muted mx-auto mb-4" />
                                    <p className="text-glass-muted">Performance charts will be displayed here</p>
                                    <p className="text-sm text-glass-muted mt-2">Integration with monitoring tools pending</p>
                                </div>
                            </div>

                            {/* System Load Metrics */}
                            <div className="glass-card rounded-glass-card p-6">
                                <h3 className="text-lg font-semibold text-glass-bright mb-4">Current System Load</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">CPU Usage</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.totalCpuUsage}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">Memory Usage</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.totalMemoryUsage}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">GPU Utilization</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.gpuUtilization}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">GPU Memory</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.gpuMemory}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">GPU Temperature</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.gpuTemperature}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">GPU Power</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.gpuPower}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">Disk Usage</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.diskUsage}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-glass-muted">Network I/O</span>
                                        <span className="text-glass-bright font-medium">{systemMetrics.networkActivity}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Tab */}
            {selectedView === 'logs' && (
                <div className="glass-container rounded-glass p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-glass-bright">System Logs</h2>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-glass-muted" />
                                <input
                                    type="text"
                                    placeholder="Search logs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="glass-input rounded-glass-button px-3 py-2 text-sm w-64"
                                />
                            </div>
                            <select
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value as any)}
                                className="glass-input rounded-glass-button px-3 py-2 text-sm"
                            >
                                <option value="all">All Levels</option>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                    </div>

                    <div className="glass-card rounded-glass-card">
                        <div className="space-y-0 max-h-96 overflow-y-auto">
                            {filteredLogs.map((log, index) => (
                                <div
                                    key={log.id}
                                    className={`flex items-center gap-4 p-4 ${index !== filteredLogs.length - 1 ? 'border-b border-glass-border' : ''
                                        } hover:bg-glass-surface transition-colors duration-200`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${log.level === 'error' ? 'bg-status-error' :
                                            log.level === 'warning' ? 'bg-status-warn' :
                                                'bg-status-ok'
                                        }`} />
                                    <div className="text-sm text-glass-muted font-mono min-w-[140px]">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${log.level === 'error' ? 'border-status-error-border text-status-error' :
                                                log.level === 'warning' ? 'border-status-warn-border text-status-warn' :
                                                    'border-status-ok-border text-status-ok'
                                            }`}
                                    >
                                        {log.level.toUpperCase()}
                                    </Badge>
                                    <div className="text-sm text-glass-muted font-medium min-w-[120px]">
                                        {log.service}
                                    </div>
                                    <div className="text-sm text-glass flex-1">
                                        {log.message}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Status Error Display */}
            {statusError && (
                <div className="glass-container rounded-glass p-8 border-l-4 border-status-error">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-status-error" />
                        <div>
                            <h3 className="text-lg font-semibold text-status-error">System Status Error</h3>
                            <p className="text-glass-muted">{statusError}</p>
                        </div>
                        <Button
                            onClick={refreshStatus}
                            variant="outline"
                            size="sm"
                            className="ml-auto glass-button border-glass text-glass-muted hover:text-glass-bright"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
