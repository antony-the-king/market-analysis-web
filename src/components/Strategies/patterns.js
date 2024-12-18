import { validate } from '../../utils/helpers.js';

class PatternDetection {
    constructor() {
        this.patterns = new Map();
        this.subscribers = new Set();
    }

    async initialize() {
        // Initialize pattern detection
        return true;
    }

    detectCandlestickPatterns(data) {
        const patterns = [];
        
        // Ensure we have enough data
        if (data.length < 5) return patterns;
        
        // Check last 3 candles for patterns
        const last3 = data.slice(-3);
        
        // Doji
        if (this.isDoji(last3[2])) {
            patterns.push({
                type: 'doji',
                position: 'current',
                time: last3[2].time,
                significance: this.calculateSignificance(last3)
            });
        }
        
        // Hammer
        if (this.isHammer(last3[2])) {
            patterns.push({
                type: 'hammer',
                position: 'current',
                time: last3[2].time,
                significance: this.calculateSignificance(last3)
            });
        }
        
        // Engulfing
        if (this.isEngulfing(last3[1], last3[2])) {
            patterns.push({
                type: 'engulfing',
                position: 'current',
                time: last3[2].time,
                significance: this.calculateSignificance(last3)
            });
        }
        
        // Morning/Evening Star
        if (this.isMorningStar(last3) || this.isEveningStar(last3)) {
            patterns.push({
                type: last3[2].close > last3[0].open ? 'morning_star' : 'evening_star',
                position: 'current',
                time: last3[2].time,
                significance: this.calculateSignificance(last3)
            });
        }
        
        return patterns;
    }

    isDoji(candle) {
        const bodySize = Math.abs(candle.open - candle.close);
        const totalSize = candle.high - candle.low;
        return bodySize / totalSize < 0.1; // Body is less than 10% of total size
    }

    isHammer(candle) {
        const bodySize = Math.abs(candle.open - candle.close);
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        
        // Lower wick should be at least 2x the body
        return lowerWick > bodySize * 2 && upperWick < bodySize;
    }

    isEngulfing(prev, current) {
        const prevBody = Math.abs(prev.open - prev.close);
        const currentBody = Math.abs(current.open - current.close);
        
        const isBullish = current.close > current.open && prev.close < prev.open;
        const isBearish = current.close < current.open && prev.close > prev.open;
        
        return (isBullish || isBearish) && currentBody > prevBody * 1.5;
    }

    isMorningStar(candles) {
        const [first, second, third] = candles;
        
        // First candle should be bearish
        const firstBearish = first.close < first.open;
        
        // Second candle should be small
        const secondSmall = Math.abs(second.open - second.close) < 
                          Math.abs(first.open - first.close) * 0.3;
        
        // Third candle should be bullish
        const thirdBullish = third.close > third.open;
        
        // Gap down between first and second
        const gapDown = second.high < first.low;
        
        // Gap up between second and third
        const gapUp = third.low > second.high;
        
        return firstBearish && secondSmall && thirdBullish && gapDown && gapUp;
    }

    isEveningStar(candles) {
        const [first, second, third] = candles;
        
        // First candle should be bullish
        const firstBullish = first.close > first.open;
        
        // Second candle should be small
        const secondSmall = Math.abs(second.open - second.close) < 
                          Math.abs(first.open - first.close) * 0.3;
        
        // Third candle should be bearish
        const thirdBearish = third.close < third.open;
        
        // Gap up between first and second
        const gapUp = second.low > first.high;
        
        // Gap down between second and third
        const gapDown = third.high < second.low;
        
        return firstBullish && secondSmall && thirdBearish && gapUp && gapDown;
    }

    calculateSignificance(candles) {
        // Calculate pattern significance based on:
        // 1. Volume
        // 2. Size of candles
        // 3. Previous trend
        
        let significance = 0;
        
        // Volume analysis
        const avgVolume = candles.reduce((sum, candle) => sum + (candle.volume || 0), 0) / candles.length;
        const lastVolume = candles[candles.length - 1].volume || 0;
        if (lastVolume > avgVolume * 1.5) significance += 0.3;
        
        // Candle size analysis
        const lastCandle = candles[candles.length - 1];
        const bodySize = Math.abs(lastCandle.open - lastCandle.close);
        const totalSize = lastCandle.high - lastCandle.low;
        if (bodySize / totalSize > 0.7) significance += 0.3;
        
        // Trend analysis
        const trend = this.calculateTrend(candles);
        if (Math.abs(trend) > 0.7) significance += 0.4;
        
        return Math.min(significance, 1);
    }

    calculateTrend(candles) {
        const closes = candles.map(c => c.close);
        const firstClose = closes[0];
        const lastClose = closes[closes.length - 1];
        return (lastClose - firstClose) / firstClose;
    }

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.add(callback);
        }
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers(patterns) {
        this.subscribers.forEach(subscriber => {
            try {
                subscriber(patterns);
            } catch (error) {
                console.error('Error in pattern detection subscriber:', error);
            }
        });
    }
}

// Export as singleton
const patternDetection = new PatternDetection();
export default patternDetection;
