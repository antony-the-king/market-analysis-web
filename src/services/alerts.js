import { config } from '../config.js';
import { MarketAnalysisError } from '../utils/helpers.js';

class AlertService {
    constructor() {
        this.alerts = new Map();
        this.activeAlerts = new Set();
        this.subscribers = new Set();
        this.soundEnabled = true;
        this.notificationPermission = false;
        this.initializeNotifications();
    }

    async initializeNotifications() {
        try {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                this.notificationPermission = permission === 'granted';
            }
        } catch (error) {
            console.warn('Notification initialization failed:', error);
        }
    }

    // Create a new alert
    createAlert({
        id = Date.now().toString(),
        type,
        condition,
        value,
        message,
        sound = true,
        notification = true,
        expiryTime = null,
        callback = null
    }) {
        if (!type || !condition || !value) {
            throw new MarketAnalysisError(
                'Invalid alert parameters',
                'INVALID_ALERT_PARAMS'
            );
        }

        const alert = {
            id,
            type,
            condition,
            value,
            message: message || this.generateDefaultMessage(type, condition, value),
            sound,
            notification,
            expiryTime,
            callback,
            triggered: false,
            createdAt: Date.now()
        };

        this.alerts.set(id, alert);
        return id;
    }

    // Generate default alert message
    generateDefaultMessage(type, condition, value) {
        switch (type) {
            case 'price':
                return `Price ${condition} ${value}`;
            case 'pattern':
                return `Pattern detected: ${value}`;
            case 'indicator':
                return `Indicator ${condition} ${value}`;
            case 'volume':
                return `Volume ${condition} ${value}`;
            default:
                return `Alert triggered: ${condition} ${value}`;
        }
    }

    // Check if alert conditions are met
    checkAlertConditions(data) {
        const triggeredAlerts = [];

        this.alerts.forEach((alert, id) => {
            if (alert.triggered || 
                (alert.expiryTime && Date.now() > alert.expiryTime)) {
                return;
            }

            if (this.evaluateCondition(alert, data)) {
                alert.triggered = true;
                triggeredAlerts.push(alert);
                this.notifyAlert(alert);
            }
        });

        return triggeredAlerts;
    }

    // Evaluate alert condition
    evaluateCondition(alert, data) {
        const { type, condition, value } = alert;

        switch (type) {
            case 'price':
                return this.evaluatePriceCondition(condition, value, data.price);
            
            case 'pattern':
                return this.evaluatePatternCondition(value, data.patterns);
            
            case 'indicator':
                return this.evaluateIndicatorCondition(condition, value, data.indicators);
            
            case 'volume':
                return this.evaluateVolumeCondition(condition, value, data.volume);
            
            case 'custom':
                return typeof value === 'function' ? value(data) : false;
            
            default:
                return false;
        }
    }

    // Evaluate price conditions
    evaluatePriceCondition(condition, value, price) {
        switch (condition) {
            case 'above':
                return price > value;
            case 'below':
                return price < value;
            case 'equals':
                return Math.abs(price - value) < 0.0001;
            default:
                return false;
        }
    }

    // Evaluate pattern conditions
    evaluatePatternCondition(pattern, detectedPatterns) {
        return detectedPatterns.some(p => p.type === pattern);
    }

    // Evaluate indicator conditions
    evaluateIndicatorCondition(condition, value, indicators) {
        const [indicator, parameter] = value.split(':');
        const indicatorValue = indicators[indicator];

        if (!indicatorValue) return false;

        switch (condition) {
            case 'crosses_above':
                return indicatorValue.current > parameter && 
                       indicatorValue.previous <= parameter;
            case 'crosses_below':
                return indicatorValue.current < parameter && 
                       indicatorValue.previous >= parameter;
            case 'above':
                return indicatorValue.current > parameter;
            case 'below':
                return indicatorValue.current < parameter;
            default:
                return false;
        }
    }

    // Evaluate volume conditions
    evaluateVolumeCondition(condition, value, volume) {
        switch (condition) {
            case 'above':
                return volume > value;
            case 'below':
                return volume < value;
            case 'spike':
                return volume > value * 1.5; // 50% increase
            default:
                return false;
        }
    }

    // Notify alert through various channels
    notifyAlert(alert) {
        // Execute callback if provided
        if (alert.callback && typeof alert.callback === 'function') {
            try {
                alert.callback(alert);
            } catch (error) {
                console.error('Alert callback error:', error);
            }
        }

        // Notify subscribers
        this.notifySubscribers(alert);

        // Show browser notification
        if (alert.notification && this.notificationPermission) {
            this.showNotification(alert);
        }

        // Play sound
        if (alert.sound && this.soundEnabled) {
            this.playAlertSound();
        }
    }

    // Show browser notification
    showNotification(alert) {
        try {
            new Notification('Market Alert', {
                body: alert.message,
                icon: '/path/to/icon.png',
                tag: alert.id
            });
        } catch (error) {
            console.warn('Notification failed:', error);
        }
    }

    // Play alert sound
    playAlertSound() {
        try {
            const audio = new Audio('/path/to/alert-sound.mp3');
            audio.play();
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    // Subscribe to alert notifications
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

    // Unsubscribe from alert notifications
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    // Notify all subscribers
    notifySubscribers(alert) {
        this.subscribers.forEach(callback => {
            try {
                callback(alert);
            } catch (error) {
                console.error('Subscriber notification error:', error);
            }
        });
    }

    // Remove an alert
    removeAlert(id) {
        return this.alerts.delete(id);
    }

    // Clear all alerts
    clearAlerts() {
        this.alerts.clear();
    }

    // Get all active alerts
    getActiveAlerts() {
        return Array.from(this.alerts.values())
            .filter(alert => !alert.triggered &&
                (!alert.expiryTime || Date.now() < alert.expiryTime));
    }

    // Get triggered alerts
    getTriggeredAlerts() {
        return Array.from(this.alerts.values())
            .filter(alert => alert.triggered);
    }

    // Enable/disable sound
    toggleSound(enabled) {
        this.soundEnabled = enabled;
    }

    // Create price alert
    createPriceAlert(price, condition = 'above', options = {}) {
        return this.createAlert({
            type: 'price',
            condition,
            value: price,
            ...options
        });
    }

    // Create pattern alert
    createPatternAlert(pattern, options = {}) {
        return this.createAlert({
            type: 'pattern',
            condition: 'equals',
            value: pattern,
            ...options
        });
    }

    // Create indicator alert
    createIndicatorAlert(indicator, condition, value, options = {}) {
        return this.createAlert({
            type: 'indicator',
            condition,
            value: `${indicator}:${value}`,
            ...options
        });
    }

    // Create volume alert
    createVolumeAlert(volume, condition = 'above', options = {}) {
        return this.createAlert({
            type: 'volume',
            condition,
            value: volume,
            ...options
        });
    }
}

// Export as singleton
const alertService = new AlertService();
export default alertService;
