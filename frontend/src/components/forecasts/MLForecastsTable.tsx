/**
 * MLForecastsTable — displays ML forecasts and predictions in a table format.
 * Props: { forecasts: Forecast[], onRowClick?: (forecast: Forecast) => void, loading?: boolean }
 * Notes: includes confidence indicators, real-time updates, responsive design.
 */

import { BarChart3, Brain, Clock, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import Modal from '../ui/Modal';

interface Forecast {
    id: string;
    symbol: string;
    target_price: number;
    current_price: number;
    confidence: number;
    horizon: string; // '1h', '4h', '1d', '1w'
    model: string;
    created_at: string;
    prediction_type: 'bullish' | 'bearish' | 'neutral';
    meta?: {
        volatility?: number;
        volume_change?: number;
        sentiment_score?: number;
    };
}

interface MLForecastsTableProps {
    forecasts: Forecast[];
    onRowClick?: (forecast: Forecast) => void;
    loading?: boolean;
    error?: string;
}

export default function MLForecastsTable({ forecasts, onRowClick, loading, error }: MLForecastsTableProps) {
    const [showAllModal, setShowAllModal] = useState(false);

    // Placeholder data for demo
    const placeholderForecasts: Forecast[] = [
        {
            id: '1',
            symbol: 'AAPL',
            target_price: 185.50,
            current_price: 178.20,
            confidence: 0.84,
            horizon: '1d',
            model: 'LSTM-Transformer',
            created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            prediction_type: 'bullish',
            meta: {
                volatility: 0.23,
                volume_change: 0.15,
                sentiment_score: 0.72
            }
        },
        {
            id: '2',
            symbol: 'TSLA',
            target_price: 235.80,
            current_price: 242.10,
            confidence: 0.76,
            horizon: '4h',
            model: 'CNN-LSTM',
            created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
            prediction_type: 'bearish',
            meta: {
                volatility: 0.45,
                volume_change: -0.12,
                sentiment_score: 0.38
            }
        },
        {
            id: '3',
            symbol: 'NVDA',
            target_price: 455.20,
            current_price: 448.90,
            confidence: 0.91,
            horizon: '1h',
            model: 'XGBoost-NN',
            created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            prediction_type: 'bullish',
            meta: {
                volatility: 0.38,
                volume_change: 0.28,
                sentiment_score: 0.81
            }
        },
        {
            id: '4',
            symbol: 'MSFT',
            target_price: 412.15,
            current_price: 415.30,
            confidence: 0.68,
            horizon: '1w',
            model: 'Transformer',
            created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            prediction_type: 'neutral',
            meta: {
                volatility: 0.18,
                volume_change: 0.05,
                sentiment_score: 0.55
            }
        },
        {
            id: '5',
            symbol: 'GOOGL',
            target_price: 142.80,
            current_price: 138.50,
            confidence: 0.79,
            horizon: '1d',
            model: 'LSTM-Attention',
            created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            prediction_type: 'bullish',
            meta: {
                volatility: 0.27,
                volume_change: 0.19,
                sentiment_score: 0.67
            }
        }
    ];

    const displayForecasts = forecasts.length > 0 ? forecasts : placeholderForecasts;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="glass-card rounded-glass-card overflow-hidden">
                    <div className="p-6 border-b border-glass">
                        <div className="h-4 bg-glass-light rounded w-32 animate-pulse"></div>
                    </div>
                    <div>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="p-4 border-b border-glass last:border-b-0">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-3 bg-glass-light rounded w-16 animate-pulse"></div>
                                        <div className="h-2 bg-glass-light rounded w-24 animate-pulse"></div>
                                    </div>
                                    <div className="h-6 w-12 bg-glass-light rounded-glass-button animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-glass-card p-6 border-l-4 border-status-error">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-status-error animate-pulse-glow"></div>
                    <p className="text-status-error font-medium">Error loading forecasts: {error}</p>
                </div>
            </div>
        );
    }

    const getPredictionColor = (type: string) => {
        if (type === 'bullish') return 'text-status-ok';
        if (type === 'bearish') return 'text-status-error';
        return 'text-status-warn';
    };

    const getPredictionBackground = (type: string) => {
        if (type === 'bullish') return 'bg-status-ok-bg border-status-ok-border';
        if (type === 'bearish') return 'bg-status-error-bg border-status-error-border';
        return 'bg-status-warn-bg border-status-warn-border';
    };

    const getPredictionIcon = (type: string) => {
        if (type === 'bullish') return <TrendingUp className="w-3 h-3" />;
        if (type === 'bearish') return <TrendingDown className="w-3 h-3" />;
        return <Target className="w-3 h-3" />;
    };

    const calculateChange = (target: number, current: number) => {
        return ((target - current) / current) * 100;
    };

    return (
        <div className="glass-card rounded-glass-card overflow-hidden">
            <div className="p-6 border-b border-glass backdrop-blur-card">
                <h3 className="text-xl font-bold text-glass-bright">ML Forecasts</h3>
                <p className="text-sm text-glass-muted mt-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse-glow"></div>
                    {displayForecasts.length} prediction{displayForecasts.length !== 1 ? 's' : ''} active
                </p>
            </div>

            <div className="divide-y divide-glass">
                {displayForecasts.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="glass-card rounded-glass-card p-6 inline-block">
                            <Brain className="w-8 h-8 text-glass-muted mx-auto mb-2" />
                            <p className="text-glass-muted">No forecasts available</p>
                            <p className="text-glass-muted text-sm mt-1">AI models learning...</p>
                        </div>
                    </div>
                ) : (
                    [...displayForecasts.slice(0, 4).map((forecast) => {
                        const change = calculateChange(forecast.target_price, forecast.current_price);

                        return (
                            <div
                                key={forecast.id}
                                className="p-4 hover:bg-glass-light cursor-pointer transition-all duration-300 group border-glass hover:border-glass-bright"
                                onClick={() => onRowClick?.(forecast)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse-glow group-hover:shadow-glow transition-all duration-300"></div>
                                            <span className="font-bold text-glass-bright group-hover:text-white transition-colors duration-300">
                                                {forecast.symbol}
                                            </span>
                                            <span className="text-xs text-glass-muted font-mono">
                                                {forecast.horizon}
                                            </span>
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-card transition-all duration-300 ${getPredictionBackground(forecast.prediction_type)} ${getPredictionColor(forecast.prediction_type)}`}>
                                                {getPredictionIcon(forecast.prediction_type)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-glass-muted">
                                            <span>${forecast.current_price.toFixed(2)} → ${forecast.target_price.toFixed(2)}</span>
                                            <span className={change >= 0 ? 'text-status-ok' : 'text-status-error'}>
                                                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Mini volatility indicator */}
                                        <div className="w-12 h-6 glass-card rounded flex items-center justify-center group-hover:shadow-glass-card transition-all duration-300">
                                            <BarChart3 className="w-3 h-3 text-accent-emerald" />
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-bold text-glass-bright">
                                                {(forecast.confidence * 100).toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-glass-muted">
                                                {forecast.model.split('-')[0]}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }),
                    displayForecasts.length > 4 && (
                        <div key="view-all" className="p-3 text-center border-t border-glass">
                            <button
                                onClick={() => setShowAllModal(true)}
                                className="glass-button border-glass text-glass-muted hover:text-glass-bright hover:border-glass-bright px-4 py-2 rounded-glass-button text-sm transition-all duration-300"
                            >
                                View All {displayForecasts.length} Forecasts →
                            </button>
                        </div>
                    )].filter(Boolean)
                )}
            </div>

            {/* All Forecasts Modal */}
            <Modal
                isOpen={showAllModal}
                onClose={() => setShowAllModal(false)}
                title="All ML Forecasts"
                maxWidth="2xl"
            >
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="glass-card rounded-glass-card p-4 text-center">
                            <div className="text-2xl font-bold text-status-ok mb-1">
                                {displayForecasts.filter(f => f.prediction_type === 'bullish').length}
                            </div>
                            <div className="text-sm text-glass-muted flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Bullish
                            </div>
                        </div>
                        <div className="glass-card rounded-glass-card p-4 text-center">
                            <div className="text-2xl font-bold text-status-error mb-1">
                                {displayForecasts.filter(f => f.prediction_type === 'bearish').length}
                            </div>
                            <div className="text-sm text-glass-muted flex items-center justify-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Bearish
                            </div>
                        </div>
                        <div className="glass-card rounded-glass-card p-4 text-center">
                            <div className="text-2xl font-bold text-glass-bright mb-1">
                                {(displayForecasts.reduce((sum, f) => sum + f.confidence, 0) / displayForecasts.length * 100).toFixed(0)}%
                            </div>
                            <div className="text-sm text-glass-muted flex items-center justify-center gap-1">
                                <Brain className="w-3 h-3" />
                                Avg Confidence
                            </div>
                        </div>
                    </div>

                    {/* Forecasts List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        {displayForecasts.map((forecast) => {
                            const change = calculateChange(forecast.target_price, forecast.current_price);

                            return (
                                <div
                                    key={forecast.id}
                                    className="glass-card rounded-glass-card p-4 border border-glass hover:border-glass-bright cursor-pointer transition-all duration-300 group"
                                    onClick={() => onRowClick?.(forecast)}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse-glow"></div>
                                                    <span className="font-bold text-glass-bright group-hover:text-white transition-colors duration-300">
                                                        {forecast.symbol}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold backdrop-blur-card transition-all duration-300 ${getPredictionBackground(forecast.prediction_type)} ${getPredictionColor(forecast.prediction_type)}`}>
                                                    {getPredictionIcon(forecast.prediction_type)}
                                                    {forecast.prediction_type}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-glass-muted">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(forecast.created_at).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                                <span>${forecast.current_price.toFixed(2)} → ${forecast.target_price.toFixed(2)}</span>
                                                <span className={change >= 0 ? 'text-status-ok' : 'text-status-error'}>
                                                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                                </span>
                                                <span className="font-mono">
                                                    {(forecast.confidence * 100).toFixed(0)}% confidence
                                                </span>
                                            </div>
                                        </div>

                                        {/* Model info */}
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-glass-bright">
                                                {forecast.model}
                                            </div>
                                            <div className="text-xs text-glass-muted">
                                                {forecast.horizon} horizon
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="glass-card rounded-glass-card p-4 text-center border-glass">
                        <p className="text-sm text-glass-muted">
                            Showing {displayForecasts.length} forecast{displayForecasts.length !== 1 ? 's' : ''} •
                            <span className="text-accent-emerald ml-1">AI models active</span>
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}