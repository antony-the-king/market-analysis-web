import settingsManager from './settings.js';

class HotkeysManager {
    constructor() {
        this.shortcuts = new Map();
        this.activeModifiers = new Set();
        this.enabled = true;
        this.initializeDefaultShortcuts();
        this.setupEventListeners();
    }

    initializeDefaultShortcuts() {
        // Chart Navigation
        this.registerShortcut('zoomIn', {
            key: '+',
            modifiers: ['ctrl'],
            description: 'Zoom in chart',
            category: 'Chart Navigation',
            action: () => window.marketApp.chart.zoomIn()
        });

        this.registerShortcut('zoomOut', {
            key: '-',
            modifiers: ['ctrl'],
            description: 'Zoom out chart',
            category: 'Chart Navigation',
            action: () => window.marketApp.chart.zoomOut()
        });

        this.registerShortcut('resetZoom', {
            key: '0',
            modifiers: ['ctrl'],
            description: 'Reset chart zoom',
            category: 'Chart Navigation',
            action: () => window.marketApp.chart.resetZoom()
        });

        // Timeframes
        this.registerShortcut('timeframe1m', {
            key: '1',
            description: '1 minute timeframe',
            category: 'Timeframes',
            action: () => window.marketApp.changeTimeframe('1m')
        });

        this.registerShortcut('timeframe5m', {
            key: '2',
            description: '5 minute timeframe',
            category: 'Timeframes',
            action: () => window.marketApp.changeTimeframe('5m')
        });

        this.registerShortcut('timeframe15m', {
            key: '3',
            description: '15 minute timeframe',
            category: 'Timeframes',
            action: () => window.marketApp.changeTimeframe('15m')
        });

        this.registerShortcut('timeframe1h', {
            key: '4',
            description: '1 hour timeframe',
            category: 'Timeframes',
            action: () => window.marketApp.changeTimeframe('1h')
        });

        // Drawing Tools
        this.registerShortcut('drawLine', {
            key: 'l',
            description: 'Line drawing tool',
            category: 'Drawing Tools',
            action: () => window.marketApp.activateDrawingTool('line')
        });

        this.registerShortcut('drawFib', {
            key: 'f',
            description: 'Fibonacci tool',
            category: 'Drawing Tools',
            action: () => window.marketApp.activateDrawingTool('fibonacci')
        });

        this.registerShortcut('drawTrend', {
            key: 't',
            description: 'Trend line tool',
            category: 'Drawing Tools',
            action: () => window.marketApp.activateDrawingTool('trend')
        });

        // Technical Indicators
        this.registerShortcut('toggleSMA', {
            key: 's',
            modifiers: ['ctrl'],
            description: 'Toggle SMA indicator',
            category: 'Indicators',
            action: () => window.marketApp.toggleIndicator('sma')
        });

        this.registerShortcut('toggleRSI', {
            key: 'r',
            modifiers: ['ctrl'],
            description: 'Toggle RSI indicator',
            category: 'Indicators',
            action: () => window.marketApp.toggleIndicator('rsi')
        });

        // UI Controls
        this.registerShortcut('toggleSidebar', {
            key: 'b',
            modifiers: ['ctrl'],
            description: 'Toggle sidebar',
            category: 'UI Controls',
            action: () => window.marketApp.toggleSidebar()
        });

        this.registerShortcut('toggleFullscreen', {
            key: 'f11',
            description: 'Toggle fullscreen',
            category: 'UI Controls',
            action: () => window.marketApp.toggleFullscreen()
        });

        // Learning Mode
        this.registerShortcut('toggleLearning', {
            key: 'l',
            modifiers: ['ctrl'],
            description: 'Toggle learning mode',
            category: 'Learning',
            action: () => window.marketApp.toggleLearningMode()
        });

        // Quick Actions
        this.registerShortcut('createAlert', {
            key: 'a',
            modifiers: ['ctrl'],
            description: 'Create new alert',
            category: 'Quick Actions',
            action: () => window.marketApp.showAlertModal()
        });

        this.registerShortcut('clearDrawings', {
            key: 'Delete',
            modifiers: ['ctrl'],
            description: 'Clear all drawings',
            category: 'Quick Actions',
            action: () => window.marketApp.clearDrawings()
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('blur', () => this.activeModifiers.clear());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.activeModifiers.clear();
        });
    }

    registerShortcut(id, config) {
        if (!config.key || !config.action || typeof config.action !== 'function') {
            throw new Error('Invalid shortcut configuration');
        }

        this.shortcuts.set(id, {
            ...config,
            modifiers: new Set(config.modifiers || []),
            enabled: true
        });
    }

    handleKeyDown(event) {
        if (!this.enabled) return;
        if (this.isInputElement(event.target)) return;

        // Update modifier state
        if (this.isModifierKey(event.key)) {
            this.activeModifiers.add(event.key.toLowerCase());
            return;
        }

        // Find and execute matching shortcut
        const shortcut = this.findMatchingShortcut(event.key);
        if (shortcut && shortcut.enabled) {
            event.preventDefault();
            try {
                shortcut.action();
            } catch (error) {
                console.error('Error executing shortcut:', error);
            }
        }
    }

    handleKeyUp(event) {
        if (this.isModifierKey(event.key)) {
            this.activeModifiers.delete(event.key.toLowerCase());
        }
    }

    isModifierKey(key) {
        return ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
    }

    isInputElement(element) {
        return element.tagName === 'INPUT' || 
               element.tagName === 'TEXTAREA' || 
               element.isContentEditable;
    }

    findMatchingShortcut(key) {
        const activeModifiers = new Set(this.activeModifiers);
        
        for (const [id, shortcut] of this.shortcuts) {
            if (shortcut.key.toLowerCase() === key.toLowerCase() &&
                this.modifiersMatch(shortcut.modifiers, activeModifiers)) {
                return shortcut;
            }
        }
        
        return null;
    }

    modifiersMatch(required, active) {
        if (required.size !== active.size) return false;
        for (const modifier of required) {
            if (!active.has(modifier.toLowerCase())) return false;
        }
        return true;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    enableShortcut(id) {
        const shortcut = this.shortcuts.get(id);
        if (shortcut) {
            shortcut.enabled = true;
        }
    }

    disableShortcut(id) {
        const shortcut = this.shortcuts.get(id);
        if (shortcut) {
            shortcut.enabled = false;
        }
    }

    getShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
            id,
            ...shortcut,
            modifiers: Array.from(shortcut.modifiers)
        }));
    }

    getShortcutsByCategory() {
        const categories = new Map();
        
        for (const [id, shortcut] of this.shortcuts) {
            const category = shortcut.category || 'Uncategorized';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push({
                id,
                ...shortcut,
                modifiers: Array.from(shortcut.modifiers)
            });
        }
        
        return Object.fromEntries(categories);
    }

    getShortcutString(shortcut) {
        const modifiers = Array.from(shortcut.modifiers)
            .map(m => m.charAt(0).toUpperCase() + m.slice(1))
            .join('+');
        
        const key = shortcut.key.length === 1 ? 
            shortcut.key.toUpperCase() : 
            shortcut.key;
        
        return modifiers ? `${modifiers}+${key}` : key;
    }

    saveCustomShortcuts() {
        const customShortcuts = Array.from(this.shortcuts.entries())
            .filter(([id]) => id.startsWith('custom_'))
            .map(([id, shortcut]) => ({
                id,
                key: shortcut.key,
                modifiers: Array.from(shortcut.modifiers),
                description: shortcut.description,
                category: shortcut.category
            }));

        settingsManager.set('customShortcuts', customShortcuts);
    }

    loadCustomShortcuts() {
        const customShortcuts = settingsManager.get('customShortcuts', []);
        customShortcuts.forEach(shortcut => {
            this.registerShortcut(shortcut.id, {
                ...shortcut,
                modifiers: new Set(shortcut.modifiers)
            });
        });
    }
}

// Export as singleton
const hotkeysManager = new HotkeysManager();
export default hotkeysManager;
