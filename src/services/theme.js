import { storage } from '../utils/helpers.js';
import settingsManager from './settings.js';

class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.themes = {
            dark: {
                name: 'Dark Theme',
                colors: {
                    background: '#1e222d',
                    text: '#d1d4dc',
                    primary: '#2196f3',
                    secondary: '#4caf50',
                    accent: '#ff9800',
                    error: '#f44336',
                    success: '#4caf50',
                    warning: '#ff9800',
                    info: '#2196f3',
                    border: '#363c4e',
                    chart: {
                        background: '#1e222d',
                        text: '#d1d4dc',
                        grid: 'rgba(42, 46, 57, 0.5)',
                        upColor: '#26a69a',
                        downColor: '#ef5350',
                        volumeUp: 'rgba(38, 166, 154, 0.5)',
                        volumeDown: 'rgba(239, 83, 80, 0.5)'
                    }
                },
                fonts: {
                    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                    monospace: 'Monaco, Consolas, "Lucida Console", monospace'
                }
            },
            light: {
                name: 'Light Theme',
                colors: {
                    background: '#ffffff',
                    text: '#131722',
                    primary: '#2196f3',
                    secondary: '#4caf50',
                    accent: '#ff9800',
                    error: '#f44336',
                    success: '#4caf50',
                    warning: '#ff9800',
                    info: '#2196f3',
                    border: '#e0e3eb',
                    chart: {
                        background: '#ffffff',
                        text: '#131722',
                        grid: 'rgba(42, 46, 57, 0.1)',
                        upColor: '#26a69a',
                        downColor: '#ef5350',
                        volumeUp: 'rgba(38, 166, 154, 0.5)',
                        volumeDown: 'rgba(239, 83, 80, 0.5)'
                    }
                },
                fonts: {
                    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                    monospace: 'Monaco, Consolas, "Lucida Console", monospace'
                }
            }
        };
        this.subscribers = new Set();
    }

    async initialize() {
        try {
            // Load theme preference from settings
            const savedTheme = settingsManager.get('theme');
            if (savedTheme && this.themes[savedTheme]) {
                await this.setTheme(savedTheme);
            }
            return true;
        } catch (error) {
            console.error('Error initializing theme:', error);
            return false;
        }
    }

    async setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`Theme '${themeName}' not found`);
            return false;
        }

        this.currentTheme = themeName;
        const theme = this.themes[themeName];

        // Apply theme to document
        document.documentElement.style.setProperty('--background-color', theme.colors.background);
        document.documentElement.style.setProperty('--text-color', theme.colors.text);
        document.documentElement.style.setProperty('--primary-color', theme.colors.primary);
        document.documentElement.style.setProperty('--secondary-color', theme.colors.secondary);
        document.documentElement.style.setProperty('--accent-color', theme.colors.accent);
        document.documentElement.style.setProperty('--error-color', theme.colors.error);
        document.documentElement.style.setProperty('--success-color', theme.colors.success);
        document.documentElement.style.setProperty('--warning-color', theme.colors.warning);
        document.documentElement.style.setProperty('--info-color', theme.colors.info);
        document.documentElement.style.setProperty('--border-color', theme.colors.border);
        document.documentElement.style.setProperty('--font-family', theme.fonts.primary);
        document.documentElement.style.setProperty('--monospace-font', theme.fonts.monospace);

        // Apply chart-specific colors
        document.documentElement.style.setProperty('--chart-background', theme.colors.chart.background);
        document.documentElement.style.setProperty('--chart-text', theme.colors.chart.text);
        document.documentElement.style.setProperty('--chart-grid', theme.colors.chart.grid);
        document.documentElement.style.setProperty('--chart-up-color', theme.colors.chart.upColor);
        document.documentElement.style.setProperty('--chart-down-color', theme.colors.chart.downColor);
        document.documentElement.style.setProperty('--chart-volume-up', theme.colors.chart.volumeUp);
        document.documentElement.style.setProperty('--chart-volume-down', theme.colors.chart.volumeDown);

        // Update body class
        document.body.className = `theme-${themeName}`;

        // Save theme preference
        settingsManager.set('theme', themeName);

        // Notify subscribers
        this.notifySubscribers({
            type: 'theme_changed',
            theme: themeName
        });

        return true;
    }

    getTheme(themeName = null) {
        if (themeName) {
            return this.themes[themeName];
        }
        return this.themes[this.currentTheme];
    }

    getCurrentTheme() {
        return {
            name: this.currentTheme,
            ...this.themes[this.currentTheme]
        };
    }

    getAllThemes() {
        return Object.entries(this.themes).map(([name, theme]) => ({
            name,
            ...theme
        }));
    }

    addCustomTheme(name, theme) {
        if (this.themes[name]) {
            console.error(`Theme '${name}' already exists`);
            return false;
        }

        this.themes[name] = {
            name: theme.name || name,
            colors: {
                ...this.themes.dark.colors, // Use dark theme as base
                ...theme.colors
            },
            fonts: {
                ...this.themes.dark.fonts, // Use dark theme as base
                ...theme.fonts
            }
        };

        // Save custom themes
        this.saveCustomThemes();

        return true;
    }

    removeCustomTheme(name) {
        if (name === 'dark' || name === 'light') {
            console.error('Cannot remove default themes');
            return false;
        }

        if (!this.themes[name]) {
            console.error(`Theme '${name}' not found`);
            return false;
        }

        delete this.themes[name];
        this.saveCustomThemes();

        return true;
    }

    saveCustomThemes() {
        const customThemes = {};
        Object.entries(this.themes).forEach(([name, theme]) => {
            if (name !== 'dark' && name !== 'light') {
                customThemes[name] = theme;
            }
        });
        storage.set('customThemes', customThemes);
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
                console.error('Error in theme subscriber:', error);
            }
        });
    }
}

// Export as singleton
const themeManager = new ThemeManager();
export default themeManager;
