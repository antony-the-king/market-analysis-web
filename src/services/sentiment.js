import { MarketAnalysisError } from '../utils/helpers.js';
import { config } from '../config.js';

class MarketSentiment {
    constructor() {
        this.sentimentData = new Map();
        this.indicators = new Map();
        this.lastUpdate = null;
    }

    // Analyze price action and volume to determine market sentiment
    analyzePriceAction(candles, timeframe = '1h') {
        if (candles.length < 20) {
            throw new MarketAnalysisError('Insufficient data for sentiment analysis', 'INSUFFICIENT_DATA');
        }

        const recentCandles = candles.slice(-20);
        let bullishCount = 0;
        let bearishCount = 0;
        let volumeStrength = 0;
        let trendStrength = 0;

        // Analyze individual candles
        for (let i = 1; i < recentCandles.length; i++) {
            const current = recentCandles[i];
            const previous = recentCandles[i - 1];
            
            // Determine candle direction
            if (current.close > current.open) {
                bullishCount++;
                if (current.volume > previous.volume) {
                    volumeStrength++;
                }
            } else if (current.close < current.open) {
                bearishCount++;
                if (current.volume > previous.volume) {
                    volumeStrength--;
                }
            }

            // Calculate trend strength
            const priceChange = ((current.close - previous.close) / previous.close) * 100;
            trendStrength += priceChange;
        }

        // Calculate overall sentiment scores
        const momentumScore = (bullishCount - bearishCount) / recentCandles.length;
        const volumeScore = volumeStrength / recentCandles.length;
        const trendScore = trendStrength / recentCandles.length;

        return {
            momentum: this.normalizeSentiment(momentumScore),
            volume: this.normalizeSentiment(volumeScore),
            trend: this.normalizeSentiment(trendScore),
            overall: this.calculateOverallSentiment(momentumScore, volumeScore, trendScore)
        };
    }

    // Analyze market volatility
    analyzeVolatility(candles, period = 14) {
        if (candles.length < period) {
            throw new MarketAnalysisError('Insufficient data for volatility analysis', 'INSUFFICIENT_DATA');
        }

        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            const returnVal = Math.log(candles[i].close / candles[i - 1].close);
            returns.push(returnVal);
        }

        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

        return {
            value: volatility,
            level: this.getVolatilityLevel(volatility),
            trend: this.getVolatilityTrend(candles)
        };
    }

    // Analyze market momentum
    analyzeMomentum(candles, period = 14) {
        if (candles.length < period) {
            throw new MarketAnalysisError('Insufficient data for momentum analysis', 'INSUFFICIENT_DATA');
        }

        const rsi = this.calculateRSI(candles, period);
        const momentum = this.calculateMomentum(candles, period);
        const macdSignal = this.calculateMACDSignal(candles);

        return {
            rsi: rsi,
            momentum: momentum,
            macd: macdSignal,
            overall: this.combineMomentumSignals(rsi, momentum, macdSignal)
        };
    }

    // Calculate Relative Strength Index (RSI)
    calculateRSI(candles, period) {
        let gains = 0;
        let losses = 0;

        // Calculate initial average gain/loss
        for (let i = 1; i <= period; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change >= 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Calculate RSI using smoothed averages
        for (let i = period + 1; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change >= 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - change) / period;
            }
        }

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // Calculate Price Momentum
    calculateMomentum(candles, period) {
        const currentPrice = candles[candles.length - 1].close;
        const previousPrice = candles[candles.length - period - 1].close;
        return ((currentPrice - previousPrice) / previousPrice) * 100;
    }

    // Calculate MACD Signal
    calculateMACDSignal(candles) {
        const fastEMA = this.calculateEMA(candles, 12);
        const slowEMA = this.calculateEMA(candles, 26);
        const macd = fastEMA[fastEMA.length - 1] - slowEMA[slowEMA.length - 1];
        const signal = this.calculateEMA(candles.slice(-9), 9);
        
        return {
            macd: macd,
            signal: signal[signal.length - 1],
            histogram: macd - signal[signal.length - 1]
        };
    }

    // Calculate Exponential Moving Average (EMA)
    calculateEMA(candles, period) {
        const multiplier = 2 / (period + 1);
        const ema = [candles[0].close];

        for (let i = 1; i < candles.length; i++) {
            const currentPrice = candles[i].close;
            const previousEMA = ema[i - 1];
            const currentEMA = (currentPrice - previousEMA) * multiplier + previousEMA;
            ema.push(currentEMA);
        }

        return ema;
    }

    // Normalize sentiment scores to range [-1, 1]
    normalizeSentiment(score) {
        return Math.max(-1, Math.min(1, score));
    }

    // Calculate overall sentiment from individual components
    calculateOverallSentiment(momentum, volume, trend) {
        const weights = {
            momentum: 0.4,
            volume: 0.3,
            trend: 0.3
        };

        const weightedScore = (
            momentum * weights.momentum +
            volume * weights.volume +
            trend * weights.trend
        );

        return {
            score: this.normalizeSentiment(weightedScore),
            signal: this.getSentimentSignal(weightedScore),
            strength: Math.abs(weightedScore)
        };
    }

    // Get sentiment signal based on score
    getSentimentSignal(score) {
        if (score > 0.5) return 'STRONG_BULLISH';
        if (score > 0.2) return 'BULLISH';
        if (score < -0.5) return 'STRONG_BEARISH';
        if (score < -0.2) return 'BEARISH';
        return 'NEUTRAL';
    }

    // Get volatility level
    getVolatilityLevel(volatility) {
        const { thresholds } = config.analysis.volatility;
        if (volatility >= thresholds.high) return 'HIGH';
        if (volatility >= thresholds.medium) return 'MEDIUM';
        return 'LOW';
    }

    // Get volatility trend
    getVolatilityTrend(candles) {
        const recentVolatility = this.calculateVolatility(candles.slice(-10));
        const previousVolatility = this.calculateVolatility(candles.slice(-20, -10));
        
        if (recentVolatility > previousVolatility * 1.1) return 'INCREASING';
        if (recentVolatility < previousVolatility * 0.9) return 'DECREASING';
        return 'STABLE';
    }

    // Calculate short-term volatility
    calculateVolatility(candles) {
        const returns = candles.map((candle, i) => 
            i === 0 ? 0 : Math.log(candle.close / candles[i - 1].close)
        );
        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    // Combine momentum signals
    combineMomentumSignals(rsi, momentum, macd) {
        let score = 0;
        
        // RSI contribution
        if (rsi > 70) score -= 1;
        else if (rsi < 30) score += 1;
        else score += (rsi - 50) / 20;

        // Momentum contribution
        score += momentum / 50;

        // MACD contribution
        if (macd.histogram > 0) score += 0.5;
        else if (macd.histogram < 0) score -= 0.5;

        return {
            score: this.normalizeSentiment(score / 3),
            signal: this.getSentimentSignal(score / 3)
        };
    }
}

// Export as singleton
const marketSentiment = new MarketSentiment();
export default marketSentiment;
