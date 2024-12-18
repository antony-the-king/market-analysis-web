class TechnicalIndicators {
    constructor() {
        this.indicators = new Map();
    }

    // Simple Moving Average (SMA)
    calculateSMA(data, period = 14) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push({ time: data[i].time, value: null });
                continue;
            }

            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            sma.push({
                time: data[i].time,
                value: sum / period
            });
        }
        return sma;
    }

    // Exponential Moving Average (EMA)
    calculateEMA(data, period = 14) {
        const ema = [];
        const multiplier = 2 / (period + 1);

        let initialSum = 0;
        for (let i = 0; i < period; i++) {
            initialSum += data[i].close;
        }
        
        // First EMA is SMA
        let prevEMA = initialSum / period;
        
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                ema.push({ time: data[i].time, value: null });
                continue;
            }

            const currentEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
            ema.push({
                time: data[i].time,
                value: currentEMA
            });
            prevEMA = currentEMA;
        }
        return ema;
    }

    // Relative Strength Index (RSI)
    calculateRSI(data, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];

        // Calculate price changes and separate gains/losses
        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // Calculate initial average gain/loss
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

        // Calculate RSI values
        for (let i = 0; i < data.length; i++) {
            if (i < period) {
                rsi.push({ time: data[i].time, value: null });
                continue;
            }

            if (i > period) {
                avgGain = ((avgGain * (period - 1)) + (gains[i - 1] || 0)) / period;
                avgLoss = ((avgLoss * (period - 1)) + (losses[i - 1] || 0)) / period;
            }

            const rs = avgGain / avgLoss;
            const rsiValue = 100 - (100 / (1 + rs));

            rsi.push({
                time: data[i].time,
                value: rsiValue
            });
        }
        return rsi;
    }

    // Moving Average Convergence Divergence (MACD)
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);
        const macdLine = [];
        const signalLine = [];
        const histogram = [];

        // Calculate MACD line
        for (let i = 0; i < data.length; i++) {
            if (fastEMA[i].value === null || slowEMA[i].value === null) {
                macdLine.push({ time: data[i].time, value: null });
                continue;
            }
            macdLine.push({
                time: data[i].time,
                value: fastEMA[i].value - slowEMA[i].value
            });
        }

        // Calculate Signal line (EMA of MACD line)
        let signalSum = 0;
        let validMacdPoints = 0;
        
        for (let i = 0; i < data.length; i++) {
            if (i < signalPeriod - 1 || macdLine[i].value === null) {
                signalLine.push({ time: data[i].time, value: null });
                histogram.push({ time: data[i].time, value: null });
                continue;
            }

            if (validMacdPoints < signalPeriod) {
                signalSum += macdLine[i].value;
                validMacdPoints++;
                if (validMacdPoints === signalPeriod) {
                    const signalValue = signalSum / signalPeriod;
                    signalLine.push({ time: data[i].time, value: signalValue });
                    histogram.push({
                        time: data[i].time,
                        value: macdLine[i].value - signalValue
                    });
                } else {
                    signalLine.push({ time: data[i].time, value: null });
                    histogram.push({ time: data[i].time, value: null });
                }
                continue;
            }

            const prevSignal = signalLine[i - 1].value;
            const multiplier = 2 / (signalPeriod + 1);
            const signalValue = (macdLine[i].value - prevSignal) * multiplier + prevSignal;
            
            signalLine.push({ time: data[i].time, value: signalValue });
            histogram.push({
                time: data[i].time,
                value: macdLine[i].value - signalValue
            });
        }

        return {
            macdLine,
            signalLine,
            histogram
        };
    }

    // Bollinger Bands
    calculateBollingerBands(data, period = 20, stdDev = 2) {
        const bands = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                bands.push({
                    time: data[i].time,
                    upper: null,
                    middle: null,
                    lower: null
                });
                continue;
            }

            const slice = data.slice(i - period + 1, i + 1);
            const sma = slice.reduce((sum, val) => sum + val.close, 0) / period;
            
            const squaredDiffs = slice.map(val => Math.pow(val.close - sma, 2));
            const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
            const standardDeviation = Math.sqrt(variance);

            bands.push({
                time: data[i].time,
                upper: sma + (standardDeviation * stdDev),
                middle: sma,
                lower: sma - (standardDeviation * stdDev)
            });
        }
        return bands;
    }

    // Add indicator to the collection
    addIndicator(name, data) {
        this.indicators.set(name, data);
    }

    // Get indicator data
    getIndicator(name) {
        return this.indicators.get(name);
    }

    // Remove indicator
    removeIndicator(name) {
        this.indicators.delete(name);
    }
}

// Export as singleton
const technicalIndicators = new TechnicalIndicators();
export default technicalIndicators;
