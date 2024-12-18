class MarketWebSocket {
    constructor() {
        this.ws = null;
        this.subscribers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 2 seconds
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=3738');

                this.ws.onopen = () => {
                    console.log('WebSocket connection established');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket connection closed');
                    this.handleReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    subscribe(symbol, callback) {
        if (!this.subscribers.has(symbol)) {
            this.subscribers.set(symbol, new Set());
            this.sendMessage({
                ticks: symbol,
                subscribe: 1
            });
        }
        this.subscribers.get(symbol).add(callback);
    }

    unsubscribe(symbol, callback) {
        if (this.subscribers.has(symbol)) {
            this.subscribers.get(symbol).delete(callback);
            if (this.subscribers.get(symbol).size === 0) {
                this.subscribers.delete(symbol);
                this.sendMessage({
                    forget_all: 'ticks'
                });
            }
        }
    }

    handleMessage(data) {
        if (data.tick) {
            const { symbol, quote, epoch } = data.tick;
            const callbacks = this.subscribers.get(symbol);
            if (callbacks) {
                callbacks.forEach(callback => {
                    callback({
                        symbol,
                        price: quote,
                        timestamp: epoch,
                        type: 'tick'
                    });
                });
            }
        } else if (data.ohlc) {
            const { symbol, open, high, low, close, epoch } = data.ohlc;
            const callbacks = this.subscribers.get(symbol);
            if (callbacks) {
                callbacks.forEach(callback => {
                    callback({
                        symbol,
                        open,
                        high,
                        low,
                        close,
                        timestamp: epoch,
                        type: 'candle'
                    });
                });
            }
        }
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    requestHistory(symbol, interval = '1m', count = 1000) {
        return new Promise((resolve, reject) => {
            const request = {
                ticks_history: symbol,
                end: 'latest',
                start: Math.floor(Date.now() / 1000) - (interval * count),
                style: 'candles',
                granularity: this.getGranularity(interval),
                count: count
            };

            const messageHandler = (event) => {
                const data = JSON.parse(event.data);
                if (data.history) {
                    this.ws.removeEventListener('message', messageHandler);
                    resolve(data.history);
                } else if (data.error) {
                    this.ws.removeEventListener('message', messageHandler);
                    reject(data.error);
                }
            };

            this.ws.addEventListener('message', messageHandler);
            this.sendMessage(request);
        });
    }

    getGranularity(interval) {
        const intervals = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '1d': 86400
        };
        return intervals[interval] || 60;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Export as singleton
const marketWebSocket = new MarketWebSocket();
export default marketWebSocket;

// Subscribe to a symbol and update the chart
const subscribeToSymbol = (symbol, chart) => {
    marketWebSocket.subscribe(symbol, (data) => {
        if (data.type === 'candle') {
            chart.updateData({
                time: data.timestamp,
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close
            });
        }
    });
};

// Example usage
// subscribeToSymbol('R_100', chart);
