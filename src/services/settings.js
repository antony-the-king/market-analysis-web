import { storage } from '../utils/helpers.js';

class SettingsManager {
    constructor() {
        this.settings = new Map();
        this.defaults = {
            theme: 'dark',
            chartType: 'candlestick',
            timeframe: '1m',
            defaultSymbol: 'R_100',
            indicators: {
                sma: { periods: [20, 50, 200], colors: ['#2196f3', '#ff9800', '#4caf50'] },
                ema: { periods: [9, 21], colors: ['#e91e63', '#9c27b0'] },
                rsi: { period: 14, overbought: 70, oversold: 30 },
                macd: { fast: 12, slow: 26, signal: 9 }
            },
            alerts: {
                sound: true,
                notification: true,
                defaultDuration: 'persistent'
            },
            trading: {
                defaultQuantity: 1,
                riskPerTrade: 1, // percentage
                maxDrawdown: 5   // percentage
            },
            layout: {
                showSidebar: true,
                sidebarPosition: 'right',
                showToolbar: true,
                showStatusBar: true
            },
            autoSave: true,
            confirmations: {
                orderSubmit: true,
                orderCancel: true,
                alertDelete: true
            }
        };
        this.subscribers = new Set();
    }

    async initialize() {
        try {
            // Load settings from localStorage
            const savedSettings = storage.get('marketAnalysisSettings');
            if (savedSettings) {
                Object.entries(savedSettings).forEach(([key, value]) => {
                    this.settings.set(key, value);
                });
            }

            // Apply defaults for any missing settings
            this.applyDefaults();

            return true;
        } catch (error) {
            console.error('Error initializing settings:', error);
            return false;
        }
    }

    applyDefaults() {
        const applyDefaultsRecursively = (defaults, current = new Map()) => {
            Object.entries(defaults).forEach(([key, value]) => {
                if (!current.has(key)) {
                    current.set(key, value);
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Recursively apply defaults to nested objects
                    current.set(key, {
                        ...value,
                        ...current.get(key)
                    });
                }
            });
            return current;
        };

        this.settings = applyDefaultsRecursively(this.defaults, this.settings);
    }

    get(key, defaultValue = null) {
        const parts = key.split('.');
        let value = this.settings;

        for (const part of parts) {
            if (value instanceof Map) {
                value = value.get(part);
            } else if (typeof value === 'object' && value !== null) {
                value = value[part];
            } else {
                return defaultValue;
            }

            if (value === undefined) {
                return defaultValue;
            }
        }

        return value;
    }

    set(key, value) {
        const parts = key.split('.');
        const lastPart = parts.pop();
        let current = this.settings;

        // Navigate to the correct nesting level
        for (const part of parts) {
            if (!current.has(part)) {
                current.set(part, new Map());
            }
            current = current.get(part);
        }

        // Set the value
        current.set(lastPart, value);

        // Save settings and notify subscribers
        this.saveSettings();
        this.notifySubscribers({
            type: 'setting_changed',
            key,
            value
        });

        return true;
    }

    update(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    reset(key) {
        if (key) {
            // Reset specific setting to default
            const defaultValue = this.getDefaultValue(key);
            if (defaultValue !== undefined) {
                this.set(key, defaultValue);
            }
        } else {
            // Reset all settings to defaults
            this.settings = new Map(Object.entries(this.defaults));
            this.saveSettings();
            this.notifySubscribers({
                type: 'settings_reset'
            });
        }
    }

    getDefaultValue(key) {
        const parts = key.split('.');
        let value = this.defaults;

        for (const part of parts) {
            if (value === undefined) return undefined;
            value = value[part];
        }

        return value;
    }

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.add(callback);
        }
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers(event) {
        this.subscribers.forEach(subscriber => {
            try {
                subscriber(event);
            } catch (error) {
                console.error('Error in settings subscriber:', error);
            }
        });
    }

    saveSettings() {
        try {
            // Convert Map to plain object for storage
            const settingsObj = {};
            for (const [key, value] of this.settings) {
                if (value instanceof Map) {
                    settingsObj[key] = Object.fromEntries(value);
                } else {
                    settingsObj[key] = value;
                }
            }
            
            storage.set('marketAnalysisSettings', settingsObj);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    export() {
        // Export settings as JSON string
        try {
            const settingsObj = {};
            for (const [key, value] of this.settings) {
                if (value instanceof Map) {
                    settingsObj[key] = Object.fromEntries(value);
                } else {
                    settingsObj[key] = value;
                }
            }
            return JSON.stringify(settingsObj, null, 2);
        } catch (error) {
            console.error('Error exporting settings:', error);
            return null;
        }
    }

    import(settingsJson) {
        try {
            const settings = JSON.parse(settingsJson);
            this.settings = new Map(Object.entries(settings));
            this.applyDefaults(); // Ensure all required settings exist
            this.saveSettings();
            this.notifySubscribers({
                type: 'settings_imported'
            });
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }
}

// Export as singleton
const settingsManager = new SettingsManager();
export default settingsManager;
