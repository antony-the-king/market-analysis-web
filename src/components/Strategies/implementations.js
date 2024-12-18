import { calculate } from '../../utils/helpers.js';
import technicalIndicators from '../Indicators/technical.js';
import patternDetection from './patterns.js';

class StrategyImplementations {
    constructor() {
        this.strategies = new Map();
        this.activeStrategies = new Set();
        this.subscribers = new Set();
    }

    async initialize() {
        // Initialize default strategies
        this.addStrategy('trendFollowing', this.trendFollowingStrategy);
        this.addStrategy('meanReversion', this.meanReversionStrategy);
        this.addStrategy('breakout', this.breakoutStrategy);
        this.addStrategy('patternBased', this.patternBasedStrategy);
        return true;
    }

    addStrategy(name, strategy) {
        this.strategies.set(name, strategy);
    }

    activateStrategy(name) {
        if (this.strategies.has(name)) {
            this.activeStrategies.add(name);
        }
    }

    deactivateStrategy(name) {
        this.activeStrategies.delete(name);
    }

    async analyzeMarket(data) {
        const signals = [];
        
        for (const strategyName of this.activeStrategies) {
            const strategy = this.strategies.get(strategyName);
            if (strategy) {
                try {
                    const signal = await strategy.call(this, data);
                    if (signal) {
                        signals.push({
                            strategy: strategyName,
                            ...signal
                        });
                    }
                } catch (error) {
                    console.error(`Error in strategy ${strategyName}:`, error);
                }
            }
        }
        
        if (signals.length > 0) {
            this.notifySubscribers(signals);
        }
        
        return signals;
    }

    async trendFollowingStrategy(data) {
        if (data.length < 50) return null;
        
        // Calculate EMAs
        const ema20 = technicalIndicators.calculateEMA(data, 20);
        const ema50 = technicalIndicators.calculateEMA(data, 50);
        
        const lastEma20 = ema20[ema20.length - 1].value;
        const lastEma50 = ema50[ema50.length - 1].value;
        const prevEma20 = ema20[ema20.length - 2].value;
        const prevEma50 = ema50[ema50.length - 2].value;
        
        // Check for crossovers
        const crossedAbove = prevEma20 <= prevEma50 && lastEma20 > lastEma50;
        const crossedBelow = prevEma20 >= prevEma50 && lastEma20 < lastEma50;
        
        if (crossedAbove) {
            return {
                type: 'buy',
                reason: 'EMA crossover (bullish)',
                confidence: this.calculateConfidence(data, 'bullish'),
                time: data[data.length - 1].time
            };
        } else if (crossedBelow) {
            return {
                type: 'sell',
                reason: 'EMA crossover (bearish)',
                confidence: this.calculateConfidence(data, 'bearish'),
                time: data[data.length - 1].time
            };
        }
        
        return null;
    }

    async meanReversionStrategy(data) {
        if (data.length < 20) return null;
        
        // Calculate Bollinger Bands
        const bands = technicalIndicators.calculateBollingerBands(data, 20, 2);
        const lastBand = bands[bands.length - 1];
        const lastPrice = data[data.length - 1].close;
        
        // Check for price near bands
        if (lastPrice <= lastBand.lower) {
            return {
                type: 'buy',
                reason: 'Price at lower Bollinger Band',
                confidence: this.calculateConfidence(data, 'bullish'),
                time: data[data.length - 1].time
            };
        } else if (lastPrice >= lastBand.upper) {
            return {
                type: 'sell',
                reason: 'Price at upper Bollinger Band',
                confidence: this.calculateConfidence(data, 'bearish'),
                time: data[data.length - 1].time
            };
        }
        
        return null;
    }

    async breakoutStrategy(data) {
        if (data.length < 20) return null;
        
        // Calculate recent high and low
        const period = 20;
        const recentData = data.slice(-period);
        const highestHigh = Math.max(...recentData.map(d => d.high));
        const lowestLow = Math.min(...recentData.map(d => d.low));
        
        const lastPrice = data[data.length - 1].close;
        const lastVolume = data[data.length - 1].volume;
        const avgVolume = calculate.movingAverage(data.slice(-period).map(d => d.volume), period)[0];
        
        // Check for breakouts with volume confirmation
        if (lastPrice > highestHigh && lastVolume > avgVolume * 1.5) {
            return {
                type: 'buy',
                reason: 'Bullish breakout with volume confirmation',
                confidence: this.calculateConfidence(data, 'bullish'),
                time: data[data.length - 1].time
            };
        } else if (lastPrice < lowestLow && lastVolume > avgVolume * 1.5) {
            return {
                type: 'sell',
                reason: 'Bearish breakdown with volume confirmation',
                confidence: this.calculateConfidence(data, 'bearish'),
                time: data[data.length - 1].time
            };
        }
        
        return null;
    }

    async patternBasedStrategy(data) {
        if (data.length < 10) return null;
        
        // Detect patterns
        const patterns = patternDetection.detectCandlestickPatterns(data);
        
        if (patterns.length > 0) {
            const lastPattern = patterns[patterns.length - 1];
            const trend = this.calculateTrend(data);
            
            // Generate signal based on pattern and trend
            if (['hammer', 'morning_star', 'bullish_engulfing'].includes(lastPattern.type) && trend < 0) {
                return {
                    type: 'buy',
                    reason: `Bullish pattern (${lastPattern.type}) in downtrend`,
                    confidence: lastPattern.significance,
                    time: data[data.length - 1].time
                };
            } else if (['shooting_star', 'evening_star', 'bearish_engulfing'].includes(lastPattern.type) && trend > 0) {
                return {
                    type: 'sell',
                    reason: `Bearish pattern (${lastPattern.type}) in uptrend`,
                    confidence: lastPattern.significance,
                    time: data[data.length - 1].time
                };
            }
        }
        
        return null;
    }

    calculateConfidence(data, direction) {
        // Calculate confidence based on multiple factors
        let confidence = 0;
        
        // 1. Trend strength
        const trend = this.calculateTrend(data);
        if ((direction === 'bullish' && trend > 0) || (direction === 'bearish' && trend < 0)) {
            confidence += 0.3;
        }
        
        // 2. Volume confirmation
        const lastVolume = data[data.length - 1].volume;
        const avgVolume = calculate.movingAverage(data.slice(-20).map(d => d.volume), 20)[0];
        if (lastVolume > avgVolume * 1.2) {
            confidence += 0.2;
        }
        
        // 3. RSI confirmation
        const rsi = technicalIndicators.calculateRSI(data, 14);
        const lastRSI = rsi[rsi.length - 1].value;
        if ((direction === 'bullish' && lastRSI < 30) || (direction === 'bearish' && lastRSI > 70)) {
            confidence += 0.3;
        }
        
        // 4. Pattern confirmation
        const patterns = patternDetection.detectCandlestickPatterns(data);
        if (patterns.length > 0) {
            const lastPattern = patterns[patterns.length - 1];
            if ((direction === 'bullish' && ['hammer', 'morning_star'].includes(lastPattern.type)) ||
                (direction === 'bearish' && ['shooting_star', 'evening_star'].includes(lastPattern.type))) {
                confidence += 0.2;
            }
        }
        
        return Math.min(confidence, 1);
    }

    calculateTrend(data) {
        const period = Math.min(20, data.length);
        const prices = data.slice(-period).map(d => d.close);
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        return (lastPrice - firstPrice) / firstPrice;
    }

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.add(callback);
        }
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers(signals) {
        this.subscribers.forEach(subscriber => {
            try {
                subscriber(signals);
            } catch (error) {
                console.error('Error in strategy subscriber:', error);
            }
        });
    }
}

// Export as singleton
const strategyImplementations = new StrategyImplementations();
export default strategyImplementations;
