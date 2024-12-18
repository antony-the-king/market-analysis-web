import { config } from '../config.js';

// Time and Date Utilities
export const timestampToDate = (timestamp) => {
    return new Date(timestamp * 1000);
};

export const formatTimeframe = (timestamp, timeframe) => {
    const date = timestampToDate(timestamp);
    switch (timeframe) {
        case '1m':
        case '5m':
        case '15m':
            return date.toLocaleTimeString();
        case '1h':
            return `${date.getHours()}:00`;
        case '1d':
            return date.toLocaleDateString();
        default:
            return date.toLocaleString();
    }
};

// Number Formatting
export const formatNumber = (number, decimals = 2) => {
    return Number(number).toFixed(decimals);
};

export const formatPercentage = (number) => {
    return `${(number * 100).toFixed(2)}%`;
};

export const formatVolume = (volume) => {
    if (volume >= 1_000_000) {
        return `${(volume / 1_000_000).toFixed(2)}M`;
    }
    if (volume >= 1_000) {
        return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toString();
};

// Candlestick Analysis
export const getCandleColor = (candle) => {
    return candle.close >= candle.open ? 
        config.chart.candleColors.up : 
        config.chart.candleColors.down;
};

export const getCandleBody = (candle) => {
    return Math.abs(candle.close - candle.open);
};

export const getCandleWick = (candle) => {
    return candle.high - candle.low;
};

export const isBullish = (candle) => {
    return candle.close > candle.open;
};

export const isBearish = (candle) => {
    return candle.close < candle.open;
};

export const isDoji = (candle) => {
    const bodySize = Math.abs(candle.close - candle.open);
    const wickSize = candle.high - candle.low;
    return bodySize <= (wickSize * 0.1);
};

// Technical Analysis
export const calculateChange = (current, previous) => {
    return {
        absolute: current - previous,
        percentage: ((current - previous) / previous) * 100
    };
};

export const calculateAverage = (data, key = null) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + (key ? val[key] : val), 0);
    return sum / data.length;
};

export const calculateStandardDeviation = (data, mean, key = null) => {
    if (data.length === 0) return 0;
    const squaredDiffs = data.map(val => {
        const value = key ? val[key] : val;
        return Math.pow(value - mean, 2);
    });
    return Math.sqrt(calculateAverage(squaredDiffs));
};

// Pattern Detection Helpers
export const findPivots = (data, lookback = 5) => {
    const pivots = {
        highs: [],
        lows: []
    };

    for (let i = lookback; i < data.length - lookback; i++) {
        const current = data[i];
        const leftBars = data.slice(i - lookback, i);
        const rightBars = data.slice(i + 1, i + lookback + 1);

        // Check for pivot high
        if (leftBars.every(bar => bar.high <= current.high) &&
            rightBars.every(bar => bar.high <= current.high)) {
            pivots.highs.push({
                price: current.high,
                time: current.time,
                index: i
            });
        }

        // Check for pivot low
        if (leftBars.every(bar => bar.low >= current.low) &&
            rightBars.every(bar => bar.low >= current.low)) {
            pivots.lows.push({
                price: current.low,
                time: current.time,
                index: i
            });
        }
    }

    return pivots;
};

// DOM Utilities
export const createElement = (tag, className = '', attributes = {}) => {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    return element;
};

export const createTooltip = (content, options = {}) => {
    const tooltip = createElement('div', 'tooltip');
    if (options.className) {
        tooltip.classList.add(options.className);
    }
    tooltip.innerHTML = content;
    return tooltip;
};

// Error Handling
export class MarketAnalysisError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'MarketAnalysisError';
        this.code = code;
        this.details = details;
    }
}

export const handleError = (error) => {
    console.error('Market Analysis Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
    });
    
    // You can implement custom error handling logic here
    // For example, showing a notification to the user
};

// Performance Optimization
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Data Validation
export const validateCandle = (candle) => {
    const required = ['time', 'open', 'high', 'low', 'close'];
    const missing = required.filter(prop => !(prop in candle));
    
    if (missing.length > 0) {
        throw new MarketAnalysisError(
            'Invalid candle data',
            'INVALID_CANDLE',
            { missing }
        );
    }

    if (candle.high < candle.low ||
        candle.open < candle.low ||
        candle.close < candle.low ||
        candle.open > candle.high ||
        candle.close > candle.high) {
        throw new MarketAnalysisError(
            'Invalid candle values',
            'INVALID_CANDLE_VALUES',
            { candle }
        );
    }

    return true;
};

// Export commonly used constants
export const constants = {
    MILLISECONDS_IN_DAY: 86400000,
    MILLISECONDS_IN_HOUR: 3600000,
    MILLISECONDS_IN_MINUTE: 60000,
    PRICE_DECIMALS: 5,
    VOLUME_DECIMALS: 2,
    PERCENTAGE_DECIMALS: 2
};
