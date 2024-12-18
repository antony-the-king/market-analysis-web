import { config } from '../config.js';
import settingsManager from './settings.js';

class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.customThemes = new Map();
        this.themeListeners = new Set();
        this.initialize();
    }

    initialize() {
        // Load theme preference from settings
        const savedTheme = settingsManager.get('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }

        // Load custom themes from localStorage
        this.loadCustomThemes();

        // Listen for system theme changes
        this.setupSystemThemeListener();
    }

    setupSystemThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (settingsManager.get('autoTheme')) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    // Set active theme
    setTheme(themeName) {
        const theme = this.getThemeColors(themeName);
        if (!theme) return false;

        // Update CSS variables
        Object.entries(theme).forEach(([property, value]) => {
            document.documentElement.style.setProperty(`--${property}`, value);
        });

        this.currentTheme = themeName;
        this.notifyListeners();
        
        // Save preference
        settingsManager.set('theme', themeName);
        
        return true;
    }

    // Get theme colors
    getThemeColors(themeName) {
        // Check for custom theme first
        if (this.customThemes.has(themeName)) {
            return this.customThemes.get(themeName);
        }

        // Return built-in theme
        return config.ui.theme[themeName];
    }

    // Create custom theme
    createCustomTheme(name, colors) {
        if (!this.validateThemeColors(colors)) {
            throw new Error('Invalid theme colors');
        }

        this.customThemes.set(name, colors);
        this.saveCustomThemes();
        return true;
    }

    // Validate theme colors
    validateThemeColors(colors) {
        const required = [
            'background',
            'surface',
            'primary',
            'secondary',
            'text',
            'border'
        ];

        return required.every(prop => prop in colors) &&
            Object.values(colors).every(color => this.isValidColor(color));
    }

    // Validate color value
    isValidColor(color) {
        const s = new Option().style;
        s.color = color;
        return s.color !== '';
    }

    // Save custom themes to localStorage
    saveCustomThemes() {
        try {
            const themes = Object.fromEntries(this.customThemes);
            localStorage.setItem('customThemes', JSON.stringify(themes));
        } catch (error) {
            console.error('Error saving custom themes:', error);
        }
    }

    // Load custom themes from localStorage
    loadCustomThemes() {
        try {
            const saved = localStorage.getItem('customThemes');
            if (saved) {
                const themes = JSON.parse(saved);
                this.customThemes = new Map(Object.entries(themes));
            }
        } catch (error) {
            console.error('Error loading custom themes:', error);
        }
    }

    // Get all available themes
    getAvailableThemes() {
        return {
            builtin: Object.keys(config.ui.theme),
            custom: Array.from(this.customThemes.keys())
        };
    }

    // Delete custom theme
    deleteCustomTheme(name) {
        const deleted = this.customThemes.delete(name);
        if (deleted) {
            this.saveCustomThemes();
        }
        return deleted;
    }

    // Subscribe to theme changes
    subscribe(callback) {
        this.themeListeners.add(callback);
        return () => this.unsubscribe(callback);
    }

    // Unsubscribe from theme changes
    unsubscribe(callback) {
        this.themeListeners.delete(callback);
    }

    // Notify listeners of theme change
    notifyListeners() {
        const theme = this.getThemeColors(this.currentTheme);
        this.themeListeners.forEach(callback => {
            try {
                callback({
                    name: this.currentTheme,
                    colors: theme
                });
            } catch (error) {
                console.error('Error in theme listener:', error);
            }
        });
    }

    // Generate theme CSS
    generateThemeCSS(theme) {
        const colors = this.getThemeColors(theme);
        if (!colors) return '';

        return `:root[data-theme="${theme}"] {
            ${Object.entries(colors)
                .map(([property, value]) => `--${property}: ${value};`)
                .join('\n')}
        }`;
    }

    // Apply theme to specific element
    applyThemeToElement(element, theme) {
        const colors = this.getThemeColors(theme);
        if (!colors) return false;

        Object.entries(colors).forEach(([property, value]) => {
            element.style.setProperty(`--${property}`, value);
        });

        return true;
    }

    // Get current theme
    getCurrentTheme() {
        return {
            name: this.currentTheme,
            colors: this.getThemeColors(this.currentTheme)
        };
    }

    // Export theme
    exportTheme(name) {
        const theme = this.getThemeColors(name);
        if (!theme) return null;

        return {
            name,
            colors: theme,
            metadata: {
                created: Date.now(),
                version: '1.0'
            }
        };
    }

    // Import theme
    importTheme(themeData) {
        try {
            if (!themeData.name || !themeData.colors) {
                throw new Error('Invalid theme data');
            }

            if (!this.validateThemeColors(themeData.colors)) {
                throw new Error('Invalid theme colors');
            }

            this.createCustomTheme(themeData.name, themeData.colors);
            return true;
        } catch (error) {
            console.error('Error importing theme:', error);
            return false;
        }
    }

    // Generate color variations
    generateColorVariations(baseColor, count = 5) {
        const variations = [];
        const hsl = this.hexToHSL(baseColor);

        // Generate lighter and darker variations
        for (let i = 0; i < count; i++) {
            const lightness = hsl.l + (20 * (i - Math.floor(count / 2))) / 100;
            variations.push(this.HSLToHex(hsl.h, hsl.s, Math.max(0, Math.min(1, lightness))));
        }

        return variations;
    }

    // Convert hex to HSL
    hexToHSL(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;

        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h, s, l };
    }

    // Convert HSL to hex
    HSLToHex(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}

// Export as singleton
const themeManager = new ThemeManager();
export default themeManager;
