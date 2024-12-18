import { calculate } from '../../utils/helpers.js';

class TechnicalIndicators {
    constructor() {
        this.indicators = new Map();
    }

    async initialize() {
        // Initialize any required resources
        return true;
    }

    calculateSMA(data, period = 14) {
        const prices = data.map(candle => candle.close);
        const sma = calculate.movingAverage(prices, period);
        
        return data.slice(period - 1).map((candle, index) => ({
            time: candle.time,
            value: sma[index]
        }));
    }

    calculateEMA(data, period = 14) {
        const prices = data.map(candle => candle.close);
        const multiplier = 2 / (period + 1);
        const ema = [];
        
        // First EMA is SMA
        let prevEMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        ema.push(prevEMA);
        
        // Calculate EMA for remaining prices
        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] - prevEMA) * multiplier + prevEMA;
            ema.push(currentEMA);
            prevEMA = currentEMA;
        }
        
        return data.slice(period - 1).map((candle, index) => ({
            time: candle.time,
            value: ema[index]
        }));
    }

    calculateRSI(data, period = 14) {
        const changes = [];
        for (let i = 1; i < data.length; i++) {
            changes.push(data[i].close - data[i - 1].close);
        }
        
        const gains = changes.map(change => change > 0 ? change : 0);
        const losses = changes.map(change => change < 0 ? -change : 0);
        
        const avgGain = calculate.movingAverage(gains, period);
        const avgLoss = calculate.movingAverage(losses, period);
        
        const rsi = avgGain.map((gain, index) => {
            const loss = avgLoss[index];
            if (loss === 0) return 100;
            const rs = gain / loss;
            return 100 - (100 / (1 + rs));
        });
        
        return data.slice(period).map((candle, index) => ({
            time: candle.time,
            value: rsi[index]
        }));
    }

    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const prices = data.map(candle => candle.close);
        
        // Calculate fast and slow EMAs
        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);
        
        // Calculate MACD line
        const macdLine = fastEMA.map((fast, index) => ({
            time: fast.time,
            value: fast.value - slowEMA[index].value
        }));
        
        // Calculate signal line (EMA of MACD line)
        const signalLine = calculate.movingAverage(
            macdLine.map(item => item.value),
            signalPeriod
        );
        
        // Calculate histogram
        return macdLine.slice(signalPeriod - 1).map((macd, index) => ({
            time: macd.time,
            macd: macd.value,
            signal: signalLine[index],
            histogram: macd.value - signalLine[index]
        }));
    }

    calculateBollingerBands(data, period = 20, stdDev = 2) {
        const prices = data.map(candle => candle.close);
        const sma = calculate.movingAverage(prices, period);
        
        const bands = sma.map((middle, index) => {
            const slice = prices.slice(index, index + period);
            const std = calculate.standardDeviation(slice);
            return {
                time: data[index + period - 1].time,
                middle,
                upper: middle + (stdDev * std),
                lower: middle - (stdDev * std)
            };
        });
        
        return bands;
    }

    addIndicator(type, options = {}) {
        this.indicators.set(type, options);
    }

    removeIndicator(type) {
        this.indicators.delete(type);
    }

    getIndicator(type) {
        return this.indicators.get(type);
    }
}

// Export as singleton
const technicalIndicators = new TechnicalIndicators();
export default technicalIndicators;
