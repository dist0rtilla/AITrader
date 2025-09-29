import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import TopNav from './components/layout/TopNav'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import useSystemStatus from './hooks/useSystemStatus'
import useWebSocket from './hooks/useWebSocket'
import DBExplorerPage from './pages/DBExplorerPage'
import ExecutionsPage from './pages/ExecutionsPage'
import MetricsPage from './pages/MetricsPage'
import MonitorPage from './pages/MonitorPage'
import PredictionsPage from './pages/PredictionsPage'
import SentimentPage from './pages/SentimentPage'
import SignalsPage from './pages/SignalsPage'
import SystemsPage from './pages/SystemsPage'
import TrainingPage from './pages/TrainingPage'
import './styles.css'
import { WebSocketEvent } from './types'

function App() {
    // Add console error logging to catch issues
    React.useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error('Global JavaScript error:', event.error, event);
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('Unhandled promise rejection:', event.reason, event);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    const { status: systemStatus } = useSystemStatus();
    const { isConnected } = useWebSocket('/api/ws/monitor', {
        onEvent: (event: WebSocketEvent) => {
            console.log('WebSocket event:', event);
            // Handle real-time events here
        },
        autoConnect: true
    });

    const overallStatus = systemStatus?.components ? (
        systemStatus.components.some((c: any) => c.status === 'error') ? 'error'
            : systemStatus.components.some((c: any) => c.status === 'warn') ? 'warn'
                : 'ok'
    ) : 'ok';

    return (
        <ThemeProvider>
            <BrowserRouter>
                <div className="min-h-screen bg-glass-bg text-glass">
                    <TopNav
                        isConnected={isConnected}
                        systemStatus={overallStatus}
                    />
                    {/* Enhanced main content area with glass styling */}
                    <main className="pt-24 lg:pt-28">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-7xl">
                            <Routes>
                                <Route path="/" element={<MonitorPage />} />
                                <Route path="/systems" element={<SystemsPage />} />
                                <Route path="/signals" element={<SignalsPage />} />
                                <Route path="/predictions" element={<PredictionsPage />} />
                                <Route path="/sentiment" element={<SentimentPage />} />
                                <Route path="/executions" element={<ExecutionsPage />} />
                                <Route path="/training" element={<TrainingPage />} />
                                <Route path="/metrics" element={<MetricsPage />} />
                                <Route path="/db" element={<DBExplorerPage />} />
                            </Routes>
                        </div>
                    </main>
                </div>
            </BrowserRouter>
        </ThemeProvider>
    )
}

createRoot(document.getElementById('root') as HTMLElement).render(
    <ErrorBoundary showDetails={true}>
        <App />
    </ErrorBoundary>
)
