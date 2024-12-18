class ChartIndicators {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.indicators = new Map();
        this.activeIndicators = new Set();
        this.defaultColors = [
            '#2196F3', // Blue
            '#4CAF50', // Green
            '#FFC107', // Amber
            '#9C27B0', // Purple
            '#FF5722', // Deep Orange
            '#00BCD4'  // Cyan
        ];
        this.colorIndex = 0;
        
        this.initializeIndicators();
    }

    initializeIndicators() {
        // Moving Averages
        this.registerIndicator('sma', {
            name: 'Simple Moving Average',
            category: 'Trend',
            overlaying: true,
            defaultParams: {
                period: 20,
                source: 'close'
            },
            calculate: (data, params) => this.calculateSMA(data, params),
            getNextColor: () => this.getNextColor()
        });

        this.registerIndicator('ema', {
            name: 'Exponential Moving Average',
            category: 'Trend',
            overlaying: true,
            defaultParams: {
                period: 20,
                source: 'close'
            },
            calculate: (data, params) => this.calculateEMA(data, params),
            getNextColor: () => this.getNextColor()
        });

        // Oscillators
        this.registerIndicator('rsi', {
            name: 'Relative Strength Index',
            category: 'Momentum',
            overlaying: false,
            defaultParams: {
                period: 14,
                overbought: 70,
                oversold: 30
            },
            calculate: (data, params) => this.calculateRSI(data, params),
            getNextColor: () => '#2196F3'
        });

        this.registerIndicator('macd', {
            name: 'MACD',
            category: 'Momentum',
            overlaying: false,
            defaultParams: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            },
            calculate: (data, params) => this.calculateMACD(data, params),
            getNextColor: () => '#4CAF50'
        });

        // Volatility
        this.registerIndicator('bollinger', {
            name: 'Bollinger Bands',
            category: 'Volatility',
            overlaying: true,
            defaultParams: {
                period: 20,
                stdDev: 2,
                source: 'close'
            },
            calculate: (data, params) => this.calculateBollingerBands(data, params),
            getNextColor: () => '#9C27B0'
        });

        // Volume
        this.registerIndicator('volume', {
            name: 'Volume',
            category: 'Volume',
            overlaying: false,
            defaultParams: {},
            calculate: (data) => this.calculateVolume(data),
            getNextColor: () => '#607D8B'
        });
    }

    registerIndicator(id, config) {
        this.indicators.set(id, {
            id,
            ...config,
            instances: new Map()
        });
    }

    addIndicator(id, params = {}) {
        const indicator = this.indicators.get(id);
        if (!indicator) return null;

        const instanceId = `${id}_${Date.now()}`;
        const instanceParams = { ...indicator.defaultParams, ...params };
        const color = indicator.getNextColor();

        const instance = {
            id: instanceId,
            params: instanceParams,
            color,
            visible: true
        };

        indicator.instances.set(instanceId, instance);
        this.activeIndicators.add(instanceId);
        this.updateIndicator(instanceId);

        return instanceId;
    }

    removeIndicator(instanceId) {
        for (const [id, indicator] of this.indicators) {
            if (indicator.instances.has(instanceId)) {
                indicator.instances.delete(instanceId);
                this.activeIndicators.delete(instanceId);
                this.chart.removeIndicator(instanceId);
                return true;
            }
        }
        return false;
    }

    updateIndicator(instanceId) {
        for (const [id, indicator] of this.indicators) {
            const instance = indicator.instances.get(instanceId);
            if (instance) {
                const data = this.chart.getData();
                const result = indicator.calculate(data, instance.params);
                this.chart.updateIndicator(instanceId, result, {
                    color: instance.color,
                    overlaying: indicator.overlaying
                });
                return true;
            }
        }
        return false;
    }

    updateAllIndicators() {
        this.activeIndicators.forEach(instanceId => {
            this.updateIndicator(instanceId);
        });
    }

    // Calculation Methods
    calculateSMA(data, params) {
        const { period, source } = params;
        const result = [];
        let sum = 0;

        for (let i = 0; i < data.length; i++) {
            const value = data[i][source];
            sum += value;

            if (i >= period) {
                sum -= data[i - period][source];
                result.push({
                    time: data[i].time,
                    value: sum / period
                });
            } else if (i === period - 1) {
                result.push({
                    time: data[i].time,
                    value: sum / period
                });
            }
        }

        return result;
    }

    calculateEMA(data, params) {
        const { period, source } = params;
        const result = [];
        const multiplier = 2 / (period + 1);
        let ema = null;

        for (let i = 0; i < data.length; i++) {
            const value = data[i][source];
            
            if (ema === null) {
                ema = value;
            } else {
                ema = (value - ema) * multiplier + ema;
            }

            if (i >= period - 1) {
                result.push({
                    time: data[i].time,
                    value: ema
                });
            }
        }

        return result;
    }

    calculateRSI(data, params) {
        const { period } = params;
        const result = [];
        let gains = 0;
        let losses = 0;

        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            
            if (i <= period) {
                gains += change > 0 ? change : 0;
                losses += change < 0 ? -change : 0;
                
                if (i === period) {
                    const avgGain = gains / period;
                    const avgLoss = losses / period;
                    const rs = avgGain / avgLoss;
                    result.push({
                        time: data[i].time,
                        value: 100 - (100 / (1 + rs))
                    });
                }
            } else {
                const avgGain = ((gains * (period - 1)) + (change > 0 ? change : 0)) / period;
                const avgLoss = ((losses * (period - 1)) + (change < 0 ? -change : 0)) / period;
                gains = avgGain;
                losses = avgLoss;
                
                const rs = avgGain / avgLoss;
                result.push({
                    time: data[i].time,
                    value: 100 - (100 / (1 + rs))
                });
            }
        }

        return result;
    }

    calculateMACD(data, params) {
        const { fastPeriod, slowPeriod, signalPeriod } = params;
        const fastEMA = this.calculateEMA(data, { period: fastPeriod, source: 'close' });
        const slowEMA = this.calculateEMA(data, { period: slowPeriod, source: 'close' });
        const macdLine = [];
        const signalLine = [];
        const histogram = [];

        // Calculate MACD Line
        for (let i = 0; i < slowEMA.length; i++) {
            const macd = fastEMA[i + (slowPeriod - fastPeriod)].value - slowEMA[i].value;
            macdLine.push({
                time: slowEMA[i].time,
                value: macd
            });
        }

        // Calculate Signal Line (EMA of MACD Line)
        const signal = this.calculateEMA(macdLine, { period: signalPeriod, source: 'value' });

        // Calculate Histogram
        for (let i = 0; i < signal.length; i++) {
            histogram.push({
                time: signal[i].time,
                value: macdLine[i + signalPeriod - 1].value - signal[i].value
            });
        }

        return {
            macdLine,
            signalLine: signal,
            histogram
        };
    }

    calculateBollingerBands(data, params) {
        const { period, stdDev, source } = params;
        const sma = this.calculateSMA(data, { period, source });
        const bands = {
            middle: sma,
            upper: [],
            lower: []
        };

        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                const deviation = data[i - j][source] - sma[i - period + 1].value;
                sum += deviation * deviation;
            }
            const standardDeviation = Math.sqrt(sum / period);
            
            bands.upper.push({
                time: data[i].time,
                value: sma[i - period + 1].value + (standardDeviation * stdDev)
            });
            
            bands.lower.push({
                time: data[i].time,
                value: sma[i - period + 1].value - (standardDeviation * stdDev)
            });
        }

        return bands;
    }

    calculateVolume(data) {
        return data.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? '#4CAF50' : '#F44336'
        }));
    }

    getNextColor() {
        const color = this.defaultColors[this.colorIndex];
        this.colorIndex = (this.colorIndex + 1) % this.defaultColors.length;
        return color;
    }

    getIndicatorInfo(id) {
        return this.indicators.get(id);
    }

    getActiveIndicators() {
        return Array.from(this.activeIndicators).map(instanceId => {
            for (const [id, indicator] of this.indicators) {
                const instance = indicator.instances.get(instanceId);
                if (instance) {
                    return {
                        id,
                        instanceId,
                        name: indicator.name,
                        category: indicator.category,
                        params: instance.params,
                        color: instance.color,
                        visible: instance.visible
                    };
                }
            }
        }).filter(Boolean);
    }
}

export default ChartIndicators;
