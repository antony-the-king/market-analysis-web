import technicalIndicators from '../Indicators/technical.js';
import patternDetection from './patterns.js';
import { config } from '../../config.js';

class StrategyImplementations {
    constructor() {
        this.strategies = new Map();
        this.initializeStrategies();
    }

    initializeStrategies() {
        // Moving Average Crossover Strategy
        this.strategies.set('MA_CROSSOVER', {
            name: 'Moving Average Crossover',
            description: 'Generates signals based on crossovers between fast and slow moving averages',
            defaultParams: {
                fastPeriod: 9,
                slowPeriod: 21
            },
            analyze: async (candles, params = {}) => {
                const { fastPeriod = 9, slowPeriod = 21 } = params;
                const fastMA = technicalIndicators.calculateSMA(candles, fastPeriod);
                const slowMA = technicalIndicators.calculateSMA(candles, slowPeriod);

                const current = candles.length - 1;
                const previous = current - 1;

                // Check for crossover
                if (fastMA[previous].value < slowMA[previous].value &&
                    fastMA[current].value > slowMA[current].value) {
                    return 'buy';
                }
                
                if (fastMA[previous].value > slowMA[previous].value &&
                    fastMA[current].value < slowMA[current].value) {
                    return 'sell';
                }

                return null;
            }
        });

        // RSI Strategy
        this.strategies.set('RSI_REVERSAL', {
            name: 'RSI Reversal',
            description: 'Generates signals based on RSI oversold/overbought conditions',
            defaultParams: {
                period: 14,
                oversold: 30,
                overbought: 70
            },
            analyze: async (candles, params = {}) => {
                const { period = 14, oversold = 30, overbought = 70 } = params;
                const rsi = technicalIndicators.calculateRSI(candles, period);
                const current = rsi[rsi.length - 1].value;
                const previous = rsi[rsi.length - 2].value;

                if (previous < oversold && current > oversold) {
                    return 'buy';
                }
                
                if (previous > overbought && current < overbought) {
                    return 'sell';
                }

                return null;
            }
        });

        // Pattern Recognition Strategy
        this.strategies.set('PATTERN_TRADING', {
            name: 'Pattern Trading',
            description: 'Generates signals based on candlestick patterns',
            defaultParams: {
                confirmationPeriod: 3,
                patternTypes: ['hammer', 'engulfing', 'doji']
            },
            analyze: async (candles, params = {}) => {
                const { confirmationPeriod = 3, patternTypes = ['hammer', 'engulfing', 'doji'] } = params;
                const patterns = patternDetection.analyzeCandlestick(candles.slice(-confirmationPeriod));

                for (const pattern of patterns) {
                    if (!patternTypes.includes(pattern.type)) continue;

                    if (pattern.significance === 'bullish') {
                        return 'buy';
                    }
                    if (pattern.significance === 'bearish') {
                        return 'sell';
                    }
                }

                return null;
            }
        });

        // MACD Strategy
        this.strategies.set('MACD_CROSSOVER', {
            name: 'MACD Crossover',
            description: 'Generates signals based on MACD line crossing signal line',
            defaultParams: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            },
            analyze: async (candles, params = {}) => {
                const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = params;
                const macd = technicalIndicators.calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);
                
                const current = macd.histogram[macd.histogram.length - 1];
                const previous = macd.histogram[macd.histogram.length - 2];

                if (previous < 0 && current > 0) {
                    return 'buy';
                }
                
                if (previous > 0 && current < 0) {
                    return 'sell';
                }

                return null;
            }
        });

        // Support/Resistance Strategy
        this.strategies.set('SUPPORT_RESISTANCE', {
            name: 'Support/Resistance Breakout',
            description: 'Generates signals based on price breaking support/resistance levels',
            defaultParams: {
                lookbackPeriod: 20,
                breakoutThreshold: 0.002
            },
            analyze: async (candles, params = {}) => {
                const { lookbackPeriod = 20, breakoutThreshold = 0.002 } = params;
                const levels = patternDetection.findSupportResistance(candles, lookbackPeriod);
                const currentPrice = candles[candles.length - 1].close;
                const previousPrice = candles[candles.length - 2].close;

                // Check resistance breakout
                for (const level of levels.resistance) {
                    if (previousPrice < level.price && 
                        currentPrice > level.price * (1 + breakoutThreshold)) {
                        return 'buy';
                    }
                }

                // Check support breakdown
                for (const level of levels.support) {
                    if (previousPrice > level.price && 
                        currentPrice < level.price * (1 - breakoutThreshold)) {
                        return 'sell';
                    }
                }

                return null;
            }
        });

        // Trend Following Strategy
        this.strategies.set('TREND_FOLLOWING', {
            name: 'Trend Following',
            description: 'Combines multiple indicators to identify and follow trends',
            defaultParams: {
                emaPeriod: 20,
                adxPeriod: 14,
                adxThreshold: 25
            },
            analyze: async (candles, params = {}) => {
                const { emaPeriod = 20, adxPeriod = 14, adxThreshold = 25 } = params;
                
                // Calculate EMA trend
                const ema = technicalIndicators.calculateEMA(candles, emaPeriod);
                const currentPrice = candles[candles.length - 1].close;
                const currentEMA = ema[ema.length - 1].value;
                
                // Calculate ADX for trend strength
                const adx = technicalIndicators.calculateADX(candles, adxPeriod);
                const currentADX = adx[adx.length - 1].value;

                if (currentADX > adxThreshold) {
                    if (currentPrice > currentEMA) {
                        return 'buy';
                    }
                    if (currentPrice < currentEMA) {
                        return 'sell';
                    }
                }

                return null;
            }
        });
    }

    getStrategy(name) {
        return this.strategies.get(name);
    }

    getAllStrategies() {
        return Array.from(this.strategies.entries()).map(([id, strategy]) => ({
            id,
            ...strategy
        }));
    }

    async executeStrategy(name, candles, params = {}) {
        const strategy = this.strategies.get(name);
        if (!strategy) {
            throw new Error(`Strategy ${name} not found`);
        }

        return await strategy.analyze(candles, {
            ...strategy.defaultParams,
            ...params
        });
    }
}

// Export as singleton
const strategyImplementations = new StrategyImplementations();
export default strategyImplementations;
