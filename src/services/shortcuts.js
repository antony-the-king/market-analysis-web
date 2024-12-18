import { config } from '../config.js';
import settingsManager from './settings.js';

class ShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.activeModifiers = new Set();
        this.enabled = true;
        this.contextStack = ['global'];
        this.initialize();
    }

    initialize() {
        // Register default shortcuts
        this.registerDefaultShortcuts();

        // Set up event listeners
        this.setupEventListeners();

        // Load custom shortcuts
        this.loadCustomShortcuts();
    }

    setupEventListeners() {
        // Key events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Track modifier keys
        window.addEventListener('blur', () => this.activeModifiers.clear());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.activeModifiers.clear();
        });
    }

    registerDefaultShortcuts() {
        // Chart Controls
        this.register('zoom-in', {
            key: '+',
            modifiers: ['ctrl'],
            context: 'chart',
            description: 'Zoom in chart',
            action: () => window.marketAnalysisTool.chart.zoomIn()
        });

        this.register('zoom-out', {
            key: '-',
            modifiers: ['ctrl'],
            context: 'chart',
            description: 'Zoom out chart',
            action: () => window.marketAnalysisTool.chart.zoomOut()
        });

        // Timeframe Controls
        this.register('timeframe-1m', {
            key: '1',
            context: 'chart',
            description: 'Switch to 1-minute timeframe',
            action: () => window.marketAnalysisTool.setTimeframe('1m')
        });

        this.register('timeframe-5m', {
            key: '2',
            context: 'chart',
            description: 'Switch to 5-minute timeframe',
            action: () => window.marketAnalysisTool.setTimeframe('5m')
        });

        // Tool Controls
        this.register('toggle-crosshair', {
            key: 'c',
            context: 'chart',
            description: 'Toggle crosshair',
            action: () => window.marketAnalysisTool.chart.toggleCrosshair()
        });

        this.register('toggle-drawing', {
            key: 'd',
            context: 'chart',
            description: 'Toggle drawing mode',
            action: () => window.marketAnalysisTool.chart.toggleDrawingMode()
        });

        // Learning Mode
        this.register('toggle-learning', {
            key: 'l',
            modifiers: ['ctrl'],
            context: 'global',
            description: 'Toggle learning mode',
            action: () => window.marketAnalysisTool.toggleLearningMode()
        });

        // General Controls
        this.register('toggle-sidebar', {
            key: 'b',
            modifiers: ['ctrl'],
            context: 'global',
            description: 'Toggle sidebar',
            action: () => window.marketAnalysisTool.toggleSidebar()
        });

        this.register('save-layout', {
            key: 's',
            modifiers: ['ctrl'],
            context: 'global',
            description: 'Save current layout',
            action: () => window.marketAnalysisTool.saveLayout()
        });
    }

    // Register a new shortcut
    register(id, {
        key,
        modifiers = [],
        context = 'global',
        description = '',
        action,
        allowRepeat = false
    }) {
        if (typeof action !== 'function') {
            throw new Error('Shortcut action must be a function');
        }

        this.shortcuts.set(id, {
            key: key.toLowerCase(),
            modifiers: new Set(modifiers.map(m => m.toLowerCase())),
            context,
            description,
            action,
            allowRepeat,
            lastTriggered: 0
        });
    }

    // Handle keydown events
    handleKeyDown(event) {
        if (!this.enabled) return;

        // Update modifier state
        if (this.isModifierKey(event.key)) {
            this.activeModifiers.add(event.key.toLowerCase());
            return;
        }

        // Find matching shortcut
        const shortcut = this.findMatchingShortcut(event.key);
        if (shortcut) {
            event.preventDefault();
            this.executeShortcut(shortcut);
        }
    }

    // Handle keyup events
    handleKeyUp(event) {
        if (this.isModifierKey(event.key)) {
            this.activeModifiers.delete(event.key.toLowerCase());
        }
    }

    // Check if key is a modifier
    isModifierKey(key) {
        return ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
    }

    // Find matching shortcut for key combination
    findMatchingShortcut(key) {
        const activeModifiers = new Set(this.activeModifiers);
        const currentContext = this.getCurrentContext();

        for (const [id, shortcut] of this.shortcuts) {
            if (shortcut.key === key.toLowerCase() &&
                this.modifiersMatch(shortcut.modifiers, activeModifiers) &&
                (shortcut.context === 'global' || shortcut.context === currentContext)) {
                return shortcut;
            }
        }

        return null;
    }

    // Check if modifier keys match
    modifiersMatch(required, active) {
        if (required.size !== active.size) return false;
        for (const modifier of required) {
            if (!active.has(modifier)) return false;
        }
        return true;
    }

    // Execute shortcut action
    executeShortcut(shortcut) {
        const now = Date.now();
        
        // Check for repeat rate limiting
        if (!shortcut.allowRepeat && 
            now - shortcut.lastTriggered < 200) { // 200ms debounce
            return;
        }

        try {
            shortcut.action();
            shortcut.lastTriggered = now;
        } catch (error) {
            console.error('Error executing shortcut:', error);
        }
    }

    // Get current context
    getCurrentContext() {
        return this.contextStack[this.contextStack.length - 1];
    }

    // Push new context
    pushContext(context) {
        this.contextStack.push(context);
    }

    // Pop current context
    popContext() {
        if (this.contextStack.length > 1) {
            return this.contextStack.pop();
        }
        return null;
    }

    // Enable/disable shortcuts
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Get all shortcuts
    getAllShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
            id,
            ...shortcut,
            modifiers: Array.from(shortcut.modifiers)
        }));
    }

    // Get shortcuts for context
    getContextShortcuts(context) {
        return this.getAllShortcuts()
            .filter(s => s.context === context || s.context === 'global');
    }

    // Save custom shortcuts
    saveCustomShortcuts() {
        try {
            const shortcuts = Array.from(this.shortcuts.entries())
                .filter(([id]) => id.startsWith('custom-'));
            
            localStorage.setItem('customShortcuts', JSON.stringify(shortcuts));
        } catch (error) {
            console.error('Error saving custom shortcuts:', error);
        }
    }

    // Load custom shortcuts
    loadCustomShortcuts() {
        try {
            const saved = localStorage.getItem('customShortcuts');
            if (saved) {
                const shortcuts = JSON.parse(saved);
                shortcuts.forEach(([id, shortcut]) => {
                    this.register(id, shortcut);
                });
            }
        } catch (error) {
            console.error('Error loading custom shortcuts:', error);
        }
    }

    // Register custom shortcut
    registerCustomShortcut(key, modifiers, action, description = '') {
        const id = `custom-${Date.now()}`;
        this.register(id, {
            key,
            modifiers,
            action,
            description,
            context: 'global'
        });
        this.saveCustomShortcuts();
        return id;
    }

    // Remove shortcut
    removeShortcut(id) {
        const removed = this.shortcuts.delete(id);
        if (removed && id.startsWith('custom-')) {
            this.saveCustomShortcuts();
        }
        return removed;
    }

    // Generate shortcut combination string
    getShortcutString(shortcut) {
        const modifiers = Array.from(shortcut.modifiers)
            .map(m => m.charAt(0).toUpperCase() + m.slice(1))
            .join('+');
        
        const key = shortcut.key.toUpperCase();
        
        return modifiers ? `${modifiers}+${key}` : key;
    }
}

// Export as singleton
const shortcutManager = new ShortcutManager();
export default shortcutManager;
