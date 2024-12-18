class MarketDataService {
    constructor() {
        this.data = new Map();
        this.listeners = new Set();
        this.currentSymbol = null;
        this.currentTimeframe = '1m';
    }

    setData(symbol, timeframe, data) {
        const key = this.getKey(symbol, timeframe);
        this.data.set(key, data);
        this.notifyListeners({
            type: 'data',
            symbol,
            timeframe,
            data
        });
    }

    getData(symbol, timeframe) {
        const key = this.getKey(symbol, timeframe);
        return this.data.get(key) || [];
    }

    updateLastCandle(symbol, timeframe, candle) {
        const key = this.getKey(symbol, timeframe);
        const data = this.getData(symbol, timeframe);
        
        if (data.length > 0) {
            const lastCandle = data[data.length - 1];
            
            // Update existing candle if in same timeframe
            if (this.isSameTimeframe(lastCandle.time, candle.time, timeframe)) {
                data[data.length - 1] = {
                    ...lastCandle,
                    high: Math.max(lastCandle.high, candle.high),
                    low: Math.min(lastCandle.low, candle.low),
                    close: candle.close,
                    volume: (lastCandle.volume || 0) + (candle.volume || 0)
                };
            } else {
                // Add new candle
                data.push(candle);
            }
            
            this.setData(symbol, timeframe, data);
        }
    }

    isSameTimeframe(time1, time2, timeframe) {
        const interval = this.getTimeframeInSeconds(timeframe);
        return Math.floor(time1 / interval) === Math.floor(time2 / interval);
    }

    getTimeframeInSeconds(timeframe) {
        const units = {
            'm': 60,
            'h': 3600,
            'd': 86400
        };
        
        const value = parseInt(timeframe);
        const unit = timeframe.slice(-1);
        return value * (units[unit] || 60);
    }

    calculateStats(symbol, timeframe) {
        const data = this.getData(symbol, timeframe);
        if (data.length === 0) return null;

        const last = data[data.length - 1];
        const previousClose = data.length > 1 ? data[data.length - 2].close : last.open;
        const change = last.close - previousClose;
        const changePercent = (change / previousClose) * 100;

        // Calculate 24h high/low
        const last24h = data.filter(candle => 
            candle.time >= last.time - 86400
        );
        
        const high24h = Math.max(...last24h.map(c => c.high));
        const low24h = Math.min(...last24h.map(c => c.low));
        const volume24h = last24h.reduce((sum, c) => sum + (c.volume || 0), 0);

        return {
            price: last.close,
            change,
            changePercent,
            high24h,
            low24h,
            volume24h,
            timestamp: last.time
        };
    }

    calculateVWAP(symbol, timeframe) {
        const data = this.getData(symbol, timeframe);
        if (data.length === 0) return [];

        let cumulativeTPV = 0; // Total Price * Volume
        let cumulativeVolume = 0;
        
        return data.map(candle => {
            const typicalPrice = (candle.high + candle.low + candle.close) / 3;
            const volume = candle.volume || 0;
            
            cumulativeTPV += typicalPrice * volume;
            cumulativeVolume += volume;
            
            return {
                time: candle.time,
                value: cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : null
            };
        });
    }

    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in market data listener:', error);
            }
        });
    }

    getKey(symbol, timeframe) {
        return `${symbol}-${timeframe}`;
    }

    // Market Analysis Methods
    calculateVolatility(symbol, timeframe, period = 14) {
        const data = this.getData(symbol, timeframe);
        if (data.length < period) return null;

        const returns = [];
        for (let i = 1; i < data.length; i++) {
            const returnVal = Math.log(data[i].close / data[i - 1].close);
            returns.push(returnVal);
        }

        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

        return volatility;
    }

    calculateMarketStrength(symbol, timeframe) {
        const data = this.getData(symbol, timeframe);
        if (data.length < 14) return null;

        let upMoves = 0;
        let downMoves = 0;
        let volume = 0;

        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) {
                upMoves += Math.abs(change) * (data[i].volume || 1);
            } else {
                downMoves += Math.abs(change) * (data[i].volume || 1);
            }
            volume += data[i].volume || 0;
        }

        return {
            strength: (upMoves - downMoves) / (upMoves + downMoves),
            volumeStrength: volume / data.length,
            trend: upMoves > downMoves ? 'bullish' : 'bearish'
        };
    }

    findKeyLevels(symbol, timeframe) {
        const data = this.getData(symbol, timeframe);
        if (data.length < 20) return null;

        const levels = {
            support: [],
            resistance: []
        };

        // Find potential support/resistance levels
        for (let i = 10; i < data.length - 10; i++) {
            const current = data[i];
            const leftBars = data.slice(i - 10, i);
            const rightBars = data.slice(i + 1, i + 11);

            // Check for support
            if (leftBars.every(bar => bar.low >= current.low) &&
                rightBars.every(bar => bar.low >= current.low)) {
                levels.support.push({
                    price: current.low,
                    time: current.time,
                    strength: this.calculateLevelStrength(current.low, data)
                });
            }

            // Check for resistance
            if (leftBars.every(bar => bar.high <= current.high) &&
                rightBars.every(bar => bar.high <= current.high)) {
                levels.resistance.push({
                    price: current.high,
                    time: current.time,
                    strength: this.calculateLevelStrength(current.high, data)
                });
            }
        }

        return levels;
    }

    calculateLevelStrength(price, data, tolerance = 0.001) {
        let touches = 0;
        let bounces = 0;

        for (const candle of data) {
            const priceRange = price * tolerance;
            if (Math.abs(candle.high - price) <= priceRange ||
                Math.abs(candle.low - price) <= priceRange) {
                touches++;
                if (Math.abs(candle.close - price) > priceRange) {
                    bounces++;
                }
            }
        }

        return {
            touches,
            bounces,
            reliability: bounces / touches
        };
    }
}

// Export as singleton
const marketDataService = new MarketDataService();
export default marketDataService;
