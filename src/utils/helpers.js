// Custom error class for Market Analysis Tool
export class MarketAnalysisError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'MarketAnalysisError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }
}

// Time formatting utilities
export const formatTime = {
    toUTC: (timestamp) => {
        return new Date(timestamp * 1000).toUTCString();
    },
    
    toLocal: (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString();
    },
    
    toISO: (timestamp) => {
        return new Date(timestamp * 1000).toISOString();
    }
};

// Price formatting utilities
export const formatPrice = {
    standard: (price) => {
        return parseFloat(price).toFixed(5);
    },
    
    withCommas: (price) => {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    toCurrency: (price, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    }
};

// Calculation utilities
export const calculate = {
    percentageChange: (oldValue, newValue) => {
        return ((newValue - oldValue) / oldValue) * 100;
    },
    
    movingAverage: (data, period) => {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    },
    
    standardDeviation: (data) => {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squareDiffs = data.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }
};

// DOM utilities
export const dom = {
    createElement: (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        return element;
    },
    
    removeElement: (element) => {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },
    
    addStyles: (styles) => {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        return styleSheet;
    }
};

// Event handling utilities
export const events = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle: (func, limit) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Data validation utilities
export const validate = {
    isNumber: (value) => {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },
    
    isPositive: (value) => {
        return validate.isNumber(value) && value > 0;
    },
    
    isInRange: (value, min, max) => {
        return validate.isNumber(value) && value >= min && value <= max;
    },
    
    isValidTimestamp: (timestamp) => {
        return validate.isNumber(timestamp) && timestamp > 0;
    }
};

// Local storage utilities
export const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
};

// Array utilities
export const arrays = {
    last: (arr) => arr[arr.length - 1],
    
    groupBy: (arr, key) => {
        return arr.reduce((result, item) => {
            (result[item[key]] = result[item[key]] || []).push(item);
            return result;
        }, {});
    },
    
    unique: (arr) => [...new Set(arr)],
    
    chunk: (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
};
