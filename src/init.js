import marketWebSocket from './services/websocket.js';
import marketDataService from './services/marketData.js';
import technicalIndicators from './components/Indicators/technical.js';
import patternDetection from './components/Strategies/patterns.js';
import strategyImplementations from './components/Strategies/implementations.js';
import alertService from './services/alerts.js';
import settingsManager from './services/settings.js';
import educationService from './services/education.js';
import themeManager from './services/theme.js';
import shortcutManager from './services/shortcuts.js';
import drawingTools from './services/drawing.js';
import { MarketAnalysisError } from './utils/helpers.js';

class MarketAnalysisInitializer {
    constructor() {
        this.initialized = false;
        this.services = new Map();
    }

    async initialize() {
        try {
            console.log('Initializing Market Analysis Tool...');

            // Initialize core services in order
            await this.initializeServices();

            // Set up event listeners
            this.setupEventListeners();

            // Load user preferences
            await this.loadUserPreferences();

            // Initialize UI
            this.initializeUI();

            this.initialized = true;
            console.log('Market Analysis Tool initialized successfully');

            return true;
        } catch (error) {
            console.error('Initialization failed:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    async initializeServices() {
        // Initialize settings first
        await this.initializeService('settings', settingsManager);

        // Initialize theme
        await this.initializeService('theme', themeManager);

        // Initialize WebSocket connection
        await this.initializeService('websocket', marketWebSocket);

        // Initialize market data service
        await this.initializeService('marketData', marketDataService);

        // Initialize technical analysis
        await this.initializeService('technical', technicalIndicators);

        // Initialize pattern detection
        await this.initializeService('patterns', patternDetection);

        // Initialize strategy implementations
        await this.initializeService('strategies', strategyImplementations);

        // Initialize alerts
        await this.initializeService('alerts', alertService);

        // Initialize education service
        await this.initializeService('education', educationService);

        // Initialize shortcuts
        await this.initializeService('shortcuts', shortcutManager);

        // Initialize drawing tools
        await this.initializeService('drawing', drawingTools);
    }

    async initializeService(name, service) {
        try {
            console.log(`Initializing ${name} service...`);
            
            if (typeof service.initialize === 'function') {
                await service.initialize();
            }
            
            this.services.set(name, service);
            console.log(`${name} service initialized`);
        } catch (error) {
            throw new MarketAnalysisError(
                `Failed to initialize ${name} service`,
                'SERVICE_INIT_FAILED',
                { service: name, error }
            );
        }
    }

    setupEventListeners() {
        // Window events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));

        // WebSocket events
        marketWebSocket.addListener('error', (error) => this.handleWebSocketError(error));
        marketWebSocket.addListener('reconnect', () => this.handleWebSocketReconnect());

        // Market data events
        marketDataService.addListener('update', (data) => this.handleMarketUpdate(data));
        marketDataService.addListener('error', (error) => this.handleMarketDataError(error));

        // Pattern detection events
        patternDetection.subscribe((pattern) => this.handlePatternDetected(pattern));

        // Alert events
        alertService.subscribe((alert) => this.handleAlert(alert));
    }

    async loadUserPreferences() {
        try {
            // Load theme preference
            const theme = settingsManager.get('theme', 'dark');
            await themeManager.setTheme(theme);

            // Load shortcuts
            await shortcutManager.loadCustomShortcuts();

            // Load saved layouts
            const savedLayout = settingsManager.get('chartLayout');
            if (savedLayout) {
                // Apply saved layout
            }
        } catch (error) {
            console.warn('Error loading user preferences:', error);
        }
    }

    initializeUI() {
        // Initialize chart container
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            // Initialize chart
        }

        // Initialize toolbar
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) {
            // Initialize toolbar buttons
        }

        // Initialize sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Initialize sidebar panels
        }
    }

    handleInitializationError(error) {
        // Log error
        console.error('Initialization error:', error);

        // Show error message to user
        this.showErrorMessage(
            'Failed to initialize application',
            error.message
        );

        // Try to gracefully degrade functionality
        this.handleGracefulDegradation(error);
    }

    showErrorMessage(title, message) {
        // Implementation depends on UI framework/library
        console.error(title, message);
    }

    handleGracefulDegradation(error) {
        // Disable features that depend on failed services
        this.services.forEach((service, name) => {
            if (service.hasError) {
                console.warn(`Disabling ${name} due to initialization error`);
                // Disable related UI elements
            }
        });
    }

    // Event handlers
    handleOnline() {
        console.log('Application is online');
        marketWebSocket.reconnect();
    }

    handleOffline() {
        console.log('Application is offline');
        // Show offline indicator
    }

    handleBeforeUnload(event) {
        // Save any unsaved changes
        if (settingsManager.get('autoSave')) {
            // Save current state
        }
    }

    handleWebSocketError(error) {
        console.error('WebSocket error:', error);
        // Show connection error indicator
    }

    handleWebSocketReconnect() {
        console.log('WebSocket reconnected');
        // Hide connection error indicator
    }

    handleMarketUpdate(data) {
        // Update UI with new market data
        // Check for alerts
        alertService.checkAlertConditions(data);
    }

    handleMarketDataError(error) {
        console.error('Market data error:', error);
        // Show error message
    }

    handlePatternDetected(pattern) {
        console.log('Pattern detected:', pattern);
        // Show pattern indicator
        // Trigger alerts if configured
    }

    handleAlert(alert) {
        console.log('Alert triggered:', alert);
        // Show alert notification
    }

    // Cleanup
    async cleanup() {
        try {
            // Disconnect WebSocket
            await marketWebSocket.disconnect();

            // Save user preferences
            await settingsManager.saveSettings();

            // Clear any intervals/timeouts
            // Remove event listeners
            // Release resources

            console.log('Cleanup completed successfully');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Create and export singleton instance
const marketAnalysisInitializer = new MarketAnalysisInitializer();
export default marketAnalysisInitializer;

// Auto-initialize when script is loaded
document.addEventListener('DOMContentLoaded', () => {
    marketAnalysisInitializer.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});
