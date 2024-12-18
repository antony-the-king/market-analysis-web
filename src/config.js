const config = {
    // WebSocket Configuration
    wsEndpoint: 'wss://ws.binaryws.com/websockets/v3',
    appId: '1089', // Binary.com app ID
    ws: {
        maxReconnectAttempts: 5,
        reconnectInterval: 5000, // 5 seconds
    },

    // Default Settings
    defaultSymbol: 'R_100', // Volatility 100 Index

    // Chart Configuration
    chart: {
        background: '#1a1c24',
        textColor: '#d1d4dc',
        gridColor: '#2a2e39',
        crosshairColor: '#758696',
        watermarkColor: 'rgba(119, 119, 119, 0.5)',
        defaultTimeframe: '1m',
        candlestick: {
            upColor: '#26a69a',
            downColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350'
        },
        overlays: {
            ma: {
                color: '#2196f3',
                lineWidth: 2,
                priceLineVisible: false
            },
            volume: {
                upColor: 'rgba(38, 166, 154, 0.5)',
                downColor: 'rgba(239, 83, 80, 0.5)'
            }
        }
    },

    // Timeframe Mappings (in seconds)
    timeframes: {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '4h': 14400,
        '1d': 86400
    },

    // Technical Analysis Settings
    analysis: {
        sma: {
            periods: [9, 20, 50, 200],
            colors: ['#2196f3', '#9c27b0', '#ff9800', '#4caf50']
        },
        ema: {
            periods: [9, 21, 55, 200],
            colors: ['#2196f3', '#9c27b0', '#ff9800', '#4caf50']
        },
        rsi: {
            period: 14,
            overbought: 70,
            oversold: 30,
            color: '#2196f3'
        },
        macd: {
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            colors: {
                macd: '#2196f3',
                signal: '#ff9800',
                histogram: '#4caf50'
            }
        },
        bollinger: {
            period: 20,
            stdDev: 2,
            colors: {
                upper: '#2196f3',
                middle: '#9c27b0',
                lower: '#2196f3'
            }
        }
    },

    // Pattern Detection Settings
    patterns: {
        candlestick: {
            minSize: {
                doji: 0.1,
                hammer: 0.3,
                engulfing: 0.5
            },
            colors: {
                bullish: 'rgba(38, 166, 154, 0.5)',
                bearish: 'rgba(239, 83, 80, 0.5)'
            }
        },
        harmonic: {
            tolerance: 0.05,
            colors: {
                bullish: '#26a69a',
                bearish: '#ef5350'
            }
        }
    },

    // Drawing Tools Settings
    drawing: {
        line: {
            color: '#2196f3',
            width: 1
        },
        trend: {
            color: '#2196f3',
            width: 1,
            style: 'dashed'
        },
        fibonacci: {
            color: '#9c27b0',
            levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
        },
        rectangle: {
            color: '#2196f3',
            fillColor: 'rgba(33, 150, 243, 0.1)'
        }
    },

    // Alert Settings
    alerts: {
        maxAlerts: 10,
        defaultSound: true,
        defaultNotification: true,
        colors: {
            price: '#2196f3',
            indicator: '#9c27b0',
            pattern: '#ff9800'
        }
    },

    // Learning Mode Settings
    learning: {
        tooltipDelay: 2000,
        highlightDuration: 1500,
        colors: {
            highlight: 'rgba(33, 150, 243, 0.2)',
            tooltip: '#2a2e39'
        }
    }
};

export default config;
