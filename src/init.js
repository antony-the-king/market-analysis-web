import config from './config.js';
import marketWebSocket from './services/websocket.js';
import marketDataService from './services/marketData.js';
import technicalIndicators from './components/Indicators/technical.js';
import patternDetection from './components/Strategies/patterns.js';
import strategyImplementations from './components/Strategies/implementations.js';
import alertService from './services/alerts.js';
import settingsManager from './services/settings.js';
import themeManager from './services/theme.js';
import tooltipManager from './components/Learning/tooltips.js';

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
        try {
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

            // Initialize tooltips
            await this.initializeService('tooltips', tooltipManager);

            console.log('All services initialized successfully');
        } catch (error) {
            console.error('Service initialization failed:', error);
            throw error;
        }
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
            console.error(`Failed to initialize ${name} service:`, error);
            throw error;
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
        marketDataService.addListener((data) => this.handleMarketUpdate(data));

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

            // Load saved layouts and settings
            const savedLayout = settingsManager.get('chartLayout');
            if (savedLayout) {
                // Apply saved layout
                console.log('Applying saved layout');
            }
        } catch (error) {
            console.warn('Error loading user preferences:', error);
        }
    }

    handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        // Show error message to user
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = 'Failed to initialize application. Please refresh the page.';
        document.body.appendChild(errorContainer);
    }

    // Event handlers
    handleOnline() {
        console.log('Application is online');
        marketWebSocket.reconnect();
    }

    handleOffline() {
        console.log('Application is offline');
    }

    handleBeforeUnload(event) {
        // Save any unsaved changes
        if (settingsManager.get('autoSave')) {
            settingsManager.saveSettings();
        }
    }

    handleWebSocketError(error) {
        console.error('WebSocket error:', error);
    }

    handleWebSocketReconnect() {
        console.log('WebSocket reconnected');
    }

    handleMarketUpdate(data) {
        // Update UI with new market data
        // Check for alerts
        alertService.checkAlertConditions(data);
    }

    handlePatternDetected(pattern) {
        console.log('Pattern detected:', pattern);
    }

    handleAlert(alert) {
        console.log('Alert triggered:', alert);
    }

    // Cleanup
    async cleanup() {
        try {
            // Disconnect WebSocket
            await marketWebSocket.disconnect();

            // Save user preferences
            await settingsManager.saveSettings();

            console.log('Cleanup completed successfully');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Create and export singleton instance
const marketAnalysisInitializer = new MarketAnalysisInitializer();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    marketAnalysisInitializer.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});

export default marketAnalysisInitializer;
