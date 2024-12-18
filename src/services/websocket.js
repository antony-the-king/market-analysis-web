import config from '../config.js';

class BinaryWebSocket {
    constructor() {
        this.ws = null;
        this.subscribers = new Map();
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.activeSubscriptions = new Set();
        this.candleBuffer = new Map(); // Store candles by symbol
        this.lastUpdate = new Map(); // Track last update time by symbol
    }

    async initialize() {
        try {
            console.log('Initializing WebSocket connection...');
            await this.connect();
            return true;
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            return false;
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${config.wsEndpoint}?app_id=${config.appId}`;
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket connection established');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket connection closed');
                    this.isConnected = false;
                    this.handleReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts < config.ws.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${config.ws.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect().then(() => {
                    // Resubscribe to active symbols
                    this.activeSubscriptions.forEach(symbol => {
                        this.subscribeToSymbol(symbol);
                    });
                }).catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, config.ws.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    handleMessage(data) {
        if (data.ohlc) {
            const { symbol, open, high, low, close, epoch } = data.ohlc;
            const currentMinute = Math.floor(epoch / 60) * 60;
            
            if (!this.candleBuffer.has(symbol)) {
                this.candleBuffer.set(symbol, new Map());
            }
            
            const symbolBuffer = this.candleBuffer.get(symbol);
            const lastUpdate = this.lastUpdate.get(symbol);
            
            // Check if we need to create a new candle
            if (!symbolBuffer.has(currentMinute)) {
                // If there's a previous candle, finalize it
                if (lastUpdate && lastUpdate !== currentMinute) {
                    const lastCandle = symbolBuffer.get(lastUpdate);
                    if (lastCandle) {
                        // Send the completed candle
                        this.notifySubscribers(symbol, 'candle', { ...lastCandle });
                        
                        // Create new candle using last candle's close as open
                        const newCandle = {
                            time: currentMinute,
                            open: lastCandle.close,
                            high: parseFloat(high),
                            low: parseFloat(low),
                            close: parseFloat(close)
                        };
                        symbolBuffer.set(currentMinute, newCandle);
                        
                        // Notify of new candle creation
                        this.notifySubscribers(symbol, 'candle', { ...newCandle });
                    }
                } else {
                    // First candle or non-consecutive candle
                    const newCandle = {
                        time: currentMinute,
                        open: parseFloat(open),
                        high: parseFloat(high),
                        low: parseFloat(low),
                        close: parseFloat(close)
                    };
                    symbolBuffer.set(currentMinute, newCandle);
                    this.notifySubscribers(symbol, 'candle', { ...newCandle });
                }
                
                // Clean up old candles (keep last 100)
                const times = Array.from(symbolBuffer.keys()).sort();
                while (times.length > 100) {
                    symbolBuffer.delete(times.shift());
                }
            } else {
                // Update existing candle
                const currentCandle = symbolBuffer.get(currentMinute);
                currentCandle.high = Math.max(currentCandle.high, parseFloat(high));
                currentCandle.low = Math.min(currentCandle.low, parseFloat(low));
                currentCandle.close = parseFloat(close);
                
                // Send tick update
                this.notifySubscribers(symbol, 'tick', { ...currentCandle });
            }
            
            this.lastUpdate.set(symbol, currentMinute);
            
        } else if (data.candles) {
            // Handle historical data
            const candles = data.candles.map(candle => ({
                time: candle.epoch,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close)
            }));

            this.notifySubscribers(data.echo_req.ticks_history, 'history', candles);
        } else if (data.error) {
            console.error('Binary.com API error:', data.error);
        }
    }

    notifySubscribers(symbol, type, data) {
        const callbacks = this.subscribers.get(symbol);
        if (callbacks) {
            callbacks.forEach(callback => {
                callback({ type, symbol, data });
            });
        }
    }

    subscribeToSymbol(symbol) {
        if (!this.isConnected) {
            console.error('WebSocket is not connected');
            return;
        }

        const request = {
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 1000,
            end: 'latest',
            start: 1,
            style: 'candles',
            subscribe: 1,
            granularity: 60 // 1-minute candles
        };

        this.sendMessage(request);
        this.activeSubscriptions.add(symbol);
    }

    unsubscribeFromSymbol(symbol) {
        if (!this.isConnected) {
            console.error('WebSocket is not connected');
            return;
        }

        const request = {
            forget_all: ['candles'],
            passthrough: { symbol }
        };

        this.sendMessage(request);
        this.activeSubscriptions.delete(symbol);
        this.candleBuffer.delete(symbol);
        this.lastUpdate.delete(symbol);
    }

    subscribe(symbol, callback) {
        if (!this.subscribers.has(symbol)) {
            this.subscribers.set(symbol, new Set());
            this.subscribeToSymbol(symbol);
        }
        this.subscribers.get(symbol).add(callback);
    }

    unsubscribe(symbol, callback) {
        if (this.subscribers.has(symbol)) {
            const callbacks = this.subscribers.get(symbol);
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.subscribers.delete(symbol);
                this.unsubscribeFromSymbol(symbol);
            }
        }
    }

    async requestHistory(symbol, timeframe = '1m', count = 1000) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('WebSocket is not connected'));
                return;
            }

            const request = {
                ticks_history: symbol,
                adjust_start_time: 1,
                count: count,
                end: 'latest',
                start: 1,
                style: 'candles',
                granularity: config.timeframes[timeframe]
            };

            const messageHandler = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.error) {
                        this.ws.removeEventListener('message', messageHandler);
                        reject(data.error);
                    } else if (data.candles) {
                        this.ws.removeEventListener('message', messageHandler);
                        const candles = data.candles.map(candle => ({
                            time: candle.epoch,
                            open: parseFloat(candle.open),
                            high: parseFloat(candle.high),
                            low: parseFloat(candle.low),
                            close: parseFloat(candle.close)
                        }));
                        resolve(candles);
                    }
                } catch (error) {
                    this.ws.removeEventListener('message', messageHandler);
                    reject(error);
                }
            };

            this.ws.addEventListener('message', messageHandler);
            this.sendMessage(request);
        });
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
            this.activeSubscriptions.clear();
            this.candleBuffer.clear();
            this.lastUpdate.clear();
        }
    }
}

// Create and export singleton instance
const binaryWebSocket = new BinaryWebSocket();
export default binaryWebSocket;
