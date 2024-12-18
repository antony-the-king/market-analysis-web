class PatternDetection {
    constructor() {
        this.patterns = new Map();
        this.callbacks = new Set();
    }

    // Candlestick Pattern Detection
    analyzeCandlestick(candles) {
        const patterns = [];
        
        // Ensure we have enough candles for pattern detection
        if (candles.length < 5) return patterns;

        // Analyze each candle for patterns
        for (let i = 4; i < candles.length; i++) {
            const currentCandles = candles.slice(i - 4, i + 1);
            
            // Check for various patterns
            const detectedPatterns = [
                this.checkDoji(currentCandles),
                this.checkHammer(currentCandles),
                this.checkEngulfing(currentCandles),
                this.checkMorningStar(currentCandles),
                this.checkEveningStar(currentCandles)
            ].filter(pattern => pattern !== null);

            patterns.push(...detectedPatterns);
        }

        return patterns;
    }

    // Doji Pattern
    checkDoji(candles) {
        const current = candles[candles.length - 1];
        const bodySize = Math.abs(current.open - current.close);
        const wickSize = current.high - current.low;
        
        // Check if the body is very small compared to the total range
        if (bodySize <= wickSize * 0.1) {
            return {
                type: 'doji',
                time: current.time,
                price: current.close,
                significance: 'neutral',
                description: 'Doji pattern indicates market indecision'
            };
        }
        return null;
    }

    // Hammer Pattern
    checkHammer(candles) {
        const current = candles[candles.length - 1];
        const body = Math.abs(current.open - current.close);
        const upperWick = current.high - Math.max(current.open, current.close);
        const lowerWick = Math.min(current.open, current.close) - current.low;
        
        // Check for hammer properties
        if (lowerWick > body * 2 && upperWick < body * 0.5) {
            return {
                type: 'hammer',
                time: current.time,
                price: current.close,
                significance: 'bullish',
                description: 'Hammer pattern indicates potential trend reversal'
            };
        }
        return null;
    }

    // Engulfing Pattern
    checkEngulfing(candles) {
        const previous = candles[candles.length - 2];
        const current = candles[candles.length - 1];
        
        // Bullish Engulfing
        if (previous.close < previous.open && // Previous red candle
            current.close > current.open && // Current green candle
            current.open < previous.close && // Current opens below previous close
            current.close > previous.open) { // Current closes above previous open
            return {
                type: 'bullishEngulfing',
                time: current.time,
                price: current.close,
                significance: 'bullish',
                description: 'Bullish engulfing pattern suggests trend reversal'
            };
        }
        
        // Bearish Engulfing
        if (previous.close > previous.open && // Previous green candle
            current.close < current.open && // Current red candle
            current.open > previous.close && // Current opens above previous close
            current.close < previous.open) { // Current closes below previous open
            return {
                type: 'bearishEngulfing',
                time: current.time,
                price: current.close,
                significance: 'bearish',
                description: 'Bearish engulfing pattern suggests trend reversal'
            };
        }
        
        return null;
    }

    // Morning Star Pattern
    checkMorningStar(candles) {
        if (candles.length < 3) return null;
        
        const [first, second, third] = candles.slice(-3);
        
        if (first.close < first.open && // First day is bearish
            Math.abs(second.open - second.close) < Math.abs(first.open - first.close) * 0.3 && // Second day has small body
            third.close > third.open && // Third day is bullish
            third.close > (first.open + first.close) / 2) { // Third day closes above first day midpoint
            return {
                type: 'morningStar',
                time: third.time,
                price: third.close,
                significance: 'bullish',
                description: 'Morning star pattern indicates potential upward reversal'
            };
        }
        return null;
    }

    // Evening Star Pattern
    checkEveningStar(candles) {
        if (candles.length < 3) return null;
        
        const [first, second, third] = candles.slice(-3);
        
        if (first.close > first.open && // First day is bullish
            Math.abs(second.open - second.close) < Math.abs(first.open - first.close) * 0.3 && // Second day has small body
            third.close < third.open && // Third day is bearish
            third.close < (first.open + first.close) / 2) { // Third day closes below first day midpoint
            return {
                type: 'eveningStar',
                time: third.time,
                price: third.close,
                significance: 'bearish',
                description: 'Evening star pattern indicates potential downward reversal'
            };
        }
        return null;
    }

    // Support and Resistance Levels
    findSupportResistance(candles, periods = 20) {
        const levels = {
            support: [],
            resistance: []
        };

        for (let i = periods; i < candles.length - periods; i++) {
            const currentCandle = candles[i];
            const leftCandles = candles.slice(i - periods, i);
            const rightCandles = candles.slice(i + 1, i + periods + 1);

            // Check for support
            if (this.isLowestPoint(currentCandle.low, leftCandles, rightCandles)) {
                levels.support.push({
                    price: currentCandle.low,
                    time: currentCandle.time,
                    strength: this.calculateLevelStrength(currentCandle.low, candles)
                });
            }

            // Check for resistance
            if (this.isHighestPoint(currentCandle.high, leftCandles, rightCandles)) {
                levels.resistance.push({
                    price: currentCandle.high,
                    time: currentCandle.time,
                    strength: this.calculateLevelStrength(currentCandle.high, candles)
                });
            }
        }

        return levels;
    }

    isLowestPoint(price, leftCandles, rightCandles) {
        return leftCandles.every(c => c.low > price) && 
               rightCandles.every(c => c.low > price);
    }

    isHighestPoint(price, leftCandles, rightCandles) {
        return leftCandles.every(c => c.high < price) && 
               rightCandles.every(c => c.high < price);
    }

    calculateLevelStrength(price, candles, tolerance = 0.001) {
        let touches = 0;
        for (const candle of candles) {
            if (Math.abs(candle.low - price) <= price * tolerance || 
                Math.abs(candle.high - price) <= price * tolerance) {
                touches++;
            }
        }
        return touches;
    }

    // Subscribe to pattern notifications
    subscribe(callback) {
        this.callbacks.add(callback);
    }

    // Unsubscribe from pattern notifications
    unsubscribe(callback) {
        this.callbacks.delete(callback);
    }

    // Notify subscribers of new patterns
    notifySubscribers(pattern) {
        this.callbacks.forEach(callback => callback(pattern));
    }
}

// Export as singleton
const patternDetection = new PatternDetection();
export default patternDetection;
