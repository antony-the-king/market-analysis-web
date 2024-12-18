import { MarketAnalysisError } from '../utils/helpers.js';

class AlertService {
    constructor() {
        this.alerts = new Map();
        this.subscribers = new Set();
        this.nextAlertId = 1;
    }

    async initialize() {
        // Load saved alerts from localStorage
        try {
            const savedAlerts = localStorage.getItem('marketAlerts');
            if (savedAlerts) {
                const alerts = JSON.parse(savedAlerts);
                alerts.forEach(alert => this.alerts.set(alert.id, alert));
                this.nextAlertId = Math.max(...Array.from(this.alerts.keys())) + 1;
            }
            return true;
        } catch (error) {
            console.error('Error initializing alerts:', error);
            return false;
        }
    }

    createAlert(options) {
        const {
            symbol,
            condition,
            value,
            message,
            type = 'price', // price, indicator, pattern
            duration = 'persistent', // persistent, oneTime
            sound = true,
            notification = true
        } = options;

        if (!symbol || !condition || !value) {
            throw new MarketAnalysisError(
                'Invalid alert parameters',
                'INVALID_ALERT_PARAMS',
                { options }
            );
        }

        const alert = {
            id: this.nextAlertId++,
            symbol,
            condition,
            value,
            message: message || `Alert for ${symbol}: ${condition} ${value}`,
            type,
            duration,
            sound,
            notification,
            createdAt: Date.now(),
            triggered: false,
            lastTriggered: null
        };

        this.alerts.set(alert.id, alert);
        this.saveAlerts();
        
        return alert;
    }

    removeAlert(id) {
        const removed = this.alerts.delete(id);
        if (removed) {
            this.saveAlerts();
        }
        return removed;
    }

    getAlert(id) {
        return this.alerts.get(id);
    }

    getAllAlerts() {
        return Array.from(this.alerts.values());
    }

    getAlertsBySymbol(symbol) {
        return Array.from(this.alerts.values())
            .filter(alert => alert.symbol === symbol);
    }

    checkAlertConditions(marketData) {
        const { symbol, price, indicators } = marketData;
        const triggeredAlerts = [];

        this.alerts.forEach(alert => {
            if (alert.symbol !== symbol || alert.triggered) return;

            let isTriggered = false;
            let currentValue;

            switch (alert.type) {
                case 'price':
                    currentValue = price;
                    isTriggered = this.evaluateCondition(currentValue, alert.condition, alert.value);
                    break;

                case 'indicator':
                    if (indicators && indicators[alert.indicator]) {
                        currentValue = indicators[alert.indicator].value;
                        isTriggered = this.evaluateCondition(currentValue, alert.condition, alert.value);
                    }
                    break;

                case 'pattern':
                    if (marketData.patterns && marketData.patterns.includes(alert.value)) {
                        isTriggered = true;
                    }
                    break;
            }

            if (isTriggered) {
                alert.lastTriggered = Date.now();
                if (alert.duration === 'oneTime') {
                    alert.triggered = true;
                }
                triggeredAlerts.push(alert);
            }
        });

        if (triggeredAlerts.length > 0) {
            this.notifyAlerts(triggeredAlerts);
            this.saveAlerts();
        }

        return triggeredAlerts;
    }

    evaluateCondition(current, condition, target) {
        switch (condition) {
            case 'above':
                return current > target;
            case 'below':
                return current < target;
            case 'equals':
                return Math.abs(current - target) < 0.00001;
            case 'crosses_above':
                return this.previousValue < target && current > target;
            case 'crosses_below':
                return this.previousValue > target && current < target;
            default:
                return false;
        }
    }

    notifyAlerts(triggeredAlerts) {
        triggeredAlerts.forEach(alert => {
            // Play sound if enabled
            if (alert.sound) {
                this.playAlertSound();
            }

            // Show notification if enabled
            if (alert.notification) {
                this.showNotification(alert);
            }

            // Notify subscribers
            this.notifySubscribers({
                type: 'alert_triggered',
                alert
            });
        });
    }

    playAlertSound() {
        try {
            const audio = new Audio('/assets/alert-sound.mp3');
            audio.play();
        } catch (error) {
            console.error('Error playing alert sound:', error);
        }
    }

    showNotification(alert) {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Market Alert', {
                        body: alert.message,
                        icon: '/assets/alert-icon.png'
                    });
                }
            });
        }
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
                console.error('Error in alert subscriber:', error);
            }
        });
    }

    saveAlerts() {
        try {
            const alertsData = Array.from(this.alerts.values());
            localStorage.setItem('marketAlerts', JSON.stringify(alertsData));
        } catch (error) {
            console.error('Error saving alerts:', error);
        }
    }

    clearAllAlerts() {
        this.alerts.clear();
        this.saveAlerts();
    }

    resetTriggeredAlerts() {
        let updated = false;
        this.alerts.forEach(alert => {
            if (alert.triggered) {
                alert.triggered = false;
                alert.lastTriggered = null;
                updated = true;
            }
        });

        if (updated) {
            this.saveAlerts();
        }
    }
}

// Export as singleton
const alertService = new AlertService();
export default alertService;
