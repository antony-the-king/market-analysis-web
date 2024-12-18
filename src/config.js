export const config = {
    // WebSocket Configuration
    ws: {
        baseUrl: 'wss://ws.binaryws.com/websockets/v3',
        appId: '3738',
        reconnectAttempts: 5,
        reconnectDelay: 2000, // 2 seconds
    },

    // Chart Configuration
    chart: {
        defaultTimeframe: '1m',
        timeframes: ['1m', '5m', '15m', '1h', '1d'],
        candleColors: {
            up: '#4caf50',
            down: '#ef5350',
            wick: {
                up: '#4caf50',
                down: '#ef5350'
            }
        },
        gridLines: {
            color: 'rgba(42, 46, 57, 0.5)'
        },
        defaultIndicators: ['sma', 'volume'],
    },

    // Technical Indicators
    indicators: {
        sma: {
            periods: [9, 20, 50, 200],
            colors: ['#2962FF', '#2E7D32', '#6200EA', '#FF6D00']
        },
        rsi: {
            period: 14,
            overbought: 70,
            oversold: 30,
            color: '#2962FF'
        },
        macd: {
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            colors: {
                macd: '#2962FF',
                signal: '#FF6D00',
                histogram: {
                    positive: '#4CAF50',
                    negative: '#F44336'
                }
            }
        },
        bollingerBands: {
            period: 20,
            standardDeviations: 2,
            colors: {
                upper: '#2962FF',
                middle: '#757575',
                lower: '#2962FF'
            }
        }
    },

    // Pattern Detection
    patterns: {
        minCandles: 5,
        significance: {
            veryStrong: 0.9,
            strong: 0.7,
            moderate: 0.5,
            weak: 0.3
        },
        colors: {
            bullish: '#4CAF50',
            bearish: '#F44336',
            neutral: '#757575'
        }
    },

    // Support/Resistance Levels
    levels: {
        sensitivity: 0.001, // 0.1% tolerance
        minTouches: 3,
        maxLevels: 5, // Maximum number of levels to display
        colors: {
            support: 'rgba(76, 175, 80, 0.3)',
            resistance: 'rgba(244, 67, 54, 0.3)'
        }
    },

    // Learning Mode
    learning: {
        defaultEnabled: false,
        tooltipDelay: 500, // milliseconds
        categories: {
            patterns: {
                title: 'Chart Patterns',
                icon: '📊'
            },
            indicators: {
                title: 'Technical Indicators',
                icon: '📈'
            },
            strategies: {
                title: 'Trading Strategies',
                icon: '🎯'
            }
        }
    },

    // Market Analysis
    analysis: {
        volatility: {
            period: 14,
            thresholds: {
                high: 0.3,
                medium: 0.15,
                low: 0.05
            }
        },
        volume: {
            averagePeriod: 20,
            significantChange: 2.0 // 200% of average
        },
        trend: {
            shortTerm: 20,
            mediumTerm: 50,
            longTerm: 200
        }
    },

    // UI Configuration
    ui: {
        theme: {
            dark: {
                background: '#1e222d',
                surface: '#262b37',
                primary: '#2962ff',
                secondary: '#666666',
                success: '#4caf50',
                danger: '#f44336',
                text: '#ffffff',
                border: '#363c4e'
            },
            light: {
                background: '#ffffff',
                surface: '#f5f5f5',
                primary: '#1976d2',
                secondary: '#757575',
                success: '#43a047',
                danger: '#e53935',
                text: '#000000',
                border: '#e0e0e0'
            }
        },
        animations: {
            duration: 200,
            easing: 'ease-in-out'
        },
        responsiveBreakpoints: {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            wide: 1200
        }
    },

    // Default Trading Pairs
    tradingPairs: [
        { symbol: 'R_100', name: 'Volatility 100 Index' },
        { symbol: 'R_75', name: 'Volatility 75 Index' },
        { symbol: 'R_50', name: 'Volatility 50 Index' },
        { symbol: 'R_25', name: 'Volatility 25 Index' },
        { symbol: 'R_10', name: 'Volatility 10 Index' }
    ],

    // Performance Optimization
    performance: {
        maxCandlesInMemory: 10000,
        maxPatternsToDisplay: 50,
        chartUpdateInterval: 100, // milliseconds
        dataCleanupInterval: 3600000 // 1 hour
    }
};

// Helper functions
export const getTimeframeInSeconds = (timeframe) => {
    const units = {
        'm': 60,
        'h': 3600,
        'd': 86400
    };
    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);
    return value * (units[unit] || 60);
};

export const formatPrice = (price, decimals = 2) => {
    return Number(price).toFixed(decimals);
};

export const formatVolume = (volume) => {
    if (volume >= 1000000) {
        return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toString();
};

export const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
};

export default config;
