import { config } from '../config.js';
import { MarketAnalysisError } from '../utils/helpers.js';

class SettingsManager {
    constructor() {
        this.settings = new Map();
        this.defaults = {
            theme: 'dark',
            timeframe: '1m',
            indicators: ['sma', 'volume'],
            chartType: 'candlestick',
            alertSound: true,
            notifications: true,
            autoSave: true,
            learningMode: false,
            language: 'en',
            decimalPlaces: 5,
            defaultSymbol: 'R_100',
            layout: {
                showSidebar: true,
                showToolbar: true,
                chartHeight: 600
            },
            indicators: {
                sma: {
                    periods: [9, 20, 50],
                    colors: ['#2962FF', '#2E7D32', '#6200EA']
                },
                rsi: {
                    period: 14,
                    overbought: 70,
                    oversold: 30
                },
                macd: {
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9
                }
            },
            trading: {
                defaultQuantity: 1,
                riskPerTrade: 2, // percentage
                stopLossMultiplier: 2,
                takeProfitMultiplier: 3,
                trailingStop: false
            }
        };
        this.subscribers = new Set();
        this.initialize();
    }

    // Initialize settings
    initialize() {
        try {
            // Load saved settings from localStorage
            const savedSettings = localStorage.getItem('marketAnalysisSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = new Map(Object.entries(parsed));
            } else {
                // Use defaults if no saved settings exist
                this.settings = new Map(Object.entries(this.defaults));
                this.saveSettings();
            }
        } catch (error) {
            console.error('Error initializing settings:', error);
            // Fallback to defaults on error
            this.settings = new Map(Object.entries(this.defaults));
        }
    }

    // Get a setting value
    get(key, defaultValue = null) {
        const value = this.settings.get(key);
        return value !== undefined ? value : (defaultValue || this.defaults[key]);
    }

    // Set a setting value
    set(key, value) {
        // Validate setting if validation exists
        this.validateSetting(key, value);

        const oldValue = this.settings.get(key);
        this.settings.set(key, value);

        // Notify subscribers of change
        if (oldValue !== value) {
            this.notifySubscribers(key, value, oldValue);
        }

        // Auto-save if enabled
        if (this.get('autoSave')) {
            this.saveSettings();
        }

        return true;
    }

    // Validate setting value
    validateSetting(key, value) {
        switch (key) {
            case 'theme':
                if (!['dark', 'light'].includes(value)) {
                    throw new MarketAnalysisError(
                        'Invalid theme value',
                        'INVALID_SETTING',
                        { key, value }
                    );
                }
                break;

            case 'timeframe':
                if (!config.chart.timeframes.includes(value)) {
                    throw new MarketAnalysisError(
                        'Invalid timeframe value',
                        'INVALID_SETTING',
                        { key, value }
                    );
                }
                break;

            case 'decimalPlaces':
                if (!Number.isInteger(value) || value < 0 || value > 8) {
                    throw new MarketAnalysisError(
                        'Invalid decimal places value',
                        'INVALID_SETTING',
                        { key, value }
                    );
                }
                break;

            case 'trading.riskPerTrade':
                if (typeof value !== 'number' || value <= 0 || value > 100) {
                    throw new MarketAnalysisError(
                        'Invalid risk per trade value',
                        'INVALID_SETTING',
                        { key, value }
                    );
                }
                break;
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            const settingsObj = Object.fromEntries(this.settings);
            localStorage.setItem('marketAnalysisSettings', JSON.stringify(settingsObj));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    // Reset settings to defaults
    resetToDefaults() {
        this.settings = new Map(Object.entries(this.defaults));
        this.saveSettings();
        this.notifySubscribers('reset', this.defaults, null);
        return true;
    }

    // Reset specific setting to default
    resetSetting(key) {
        const defaultValue = this.defaults[key];
        if (defaultValue !== undefined) {
            return this.set(key, defaultValue);
        }
        return false;
    }

    // Subscribe to settings changes
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new MarketAnalysisError(
                'Invalid callback',
                'INVALID_CALLBACK'
            );
        }
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    // Unsubscribe from settings changes
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    // Notify subscribers of changes
    notifySubscribers(key, newValue, oldValue) {
        this.subscribers.forEach(callback => {
            try {
                callback({
                    key,
                    newValue,
                    oldValue,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error in settings subscriber:', error);
            }
        });
    }

    // Import settings from JSON
    importSettings(jsonSettings) {
        try {
            const settings = JSON.parse(jsonSettings);
            Object.entries(settings).forEach(([key, value]) => {
                this.set(key, value);
            });
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    // Export settings to JSON
    exportSettings() {
        try {
            const settingsObj = Object.fromEntries(this.settings);
            return JSON.stringify(settingsObj, null, 2);
        } catch (error) {
            console.error('Error exporting settings:', error);
            return null;
        }
    }

    // Get all settings
    getAllSettings() {
        return Object.fromEntries(this.settings);
    }

    // Update multiple settings at once
    updateMultiple(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    // Check if a setting exists
    has(key) {
        return this.settings.has(key) || key in this.defaults;
    }

    // Delete a setting
    delete(key) {
        const oldValue = this.settings.get(key);
        const deleted = this.settings.delete(key);
        
        if (deleted) {
            this.notifySubscribers(key, undefined, oldValue);
            if (this.get('autoSave')) {
                this.saveSettings();
            }
        }
        
        return deleted;
    }

    // Get settings schema (for validation and UI generation)
    getSchema() {
        return {
            theme: {
                type: 'string',
                enum: ['dark', 'light'],
                default: 'dark'
            },
            timeframe: {
                type: 'string',
                enum: config.chart.timeframes,
                default: '1m'
            },
            decimalPlaces: {
                type: 'number',
                minimum: 0,
                maximum: 8,
                default: 5
            },
            trading: {
                type: 'object',
                properties: {
                    riskPerTrade: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        default: 2
                    }
                }
            }
        };
    }
}

// Export as singleton
const settingsManager = new SettingsManager();
export default settingsManager;
