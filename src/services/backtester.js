import { MarketAnalysisError } from '../utils/helpers.js';
import technicalIndicators from '../components/Indicators/technical.js';
import patternDetection from '../components/Strategies/patterns.js';

class Backtester {
    constructor() {
        this.results = new Map();
        this.strategies = new Map();
        this.optimizationResults = new Map();
    }

    // Register a trading strategy
    registerStrategy(name, strategy) {
        if (typeof strategy.analyze !== 'function') {
            throw new MarketAnalysisError(
                'Invalid strategy implementation',
                'INVALID_STRATEGY',
                { name }
            );
        }
        this.strategies.set(name, strategy);
    }

    // Run backtest for a specific strategy
    async runBacktest(strategyName, data, options = {}) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new MarketAnalysisError(
                'Strategy not found',
                'STRATEGY_NOT_FOUND',
                { strategyName }
            );
        }

        const {
            initialCapital = 10000,
            positionSize = 0.02,
            stopLoss = 0.02,
            takeProfit = 0.03,
            commission = 0.001,
            slippage = 0.001
        } = options;

        const results = {
            trades: [],
            metrics: {},
            equity: [initialCapital],
            positions: [],
            signals: []
        };

        let capital = initialCapital;
        let position = null;

        // Process each candle
        for (let i = 50; i < data.length; i++) {
            const candles = data.slice(0, i + 1);
            const currentCandle = candles[i];
            
            // Get strategy signals
            const signal = await strategy.analyze(candles, options);
            results.signals.push({
                time: currentCandle.time,
                signal,
                price: currentCandle.close
            });

            // Handle open position
            if (position) {
                // Check stop loss
                if (currentCandle.low <= position.stopPrice) {
                    this.closePosition(position, position.stopPrice, 'stop_loss', results, capital);
                    position = null;
                }
                // Check take profit
                else if (currentCandle.high >= position.targetPrice) {
                    this.closePosition(position, position.targetPrice, 'take_profit', results, capital);
                    position = null;
                }
            }

            // Handle new signals
            if (!position && signal) {
                const riskAmount = capital * positionSize;
                const shares = Math.floor(riskAmount / currentCandle.close);
                
                if (signal === 'buy') {
                    position = {
                        type: 'long',
                        entry: currentCandle.close,
                        shares,
                        stopPrice: currentCandle.close * (1 - stopLoss),
                        targetPrice: currentCandle.close * (1 + takeProfit),
                        entryTime: currentCandle.time,
                        cost: shares * currentCandle.close * (1 + commission)
                    };
                } else if (signal === 'sell') {
                    position = {
                        type: 'short',
                        entry: currentCandle.close,
                        shares,
                        stopPrice: currentCandle.close * (1 + stopLoss),
                        targetPrice: currentCandle.close * (1 - takeProfit),
                        entryTime: currentCandle.time,
                        cost: shares * currentCandle.close * (1 + commission)
                    };
                }

                if (position) {
                    results.positions.push(position);
                    capital -= position.cost;
                }
            }

            // Update equity curve
            results.equity.push(this.calculateEquity(capital, position, currentCandle.close));
        }

        // Close any remaining position
        if (position) {
            const lastCandle = data[data.length - 1];
            this.closePosition(position, lastCandle.close, 'exit', results, capital);
        }

        // Calculate performance metrics
        results.metrics = this.calculateMetrics(results, initialCapital);
        
        this.results.set(strategyName, results);
        return results;
    }

    // Close a position and update results
    closePosition(position, price, reason, results, capital) {
        const exitValue = position.shares * price;
        const commission = exitValue * 0.001;
        const pnl = position.type === 'long' ?
            exitValue - position.cost - commission :
            position.cost - exitValue - commission;

        results.trades.push({
            type: position.type,
            entry: position.entry,
            exit: price,
            shares: position.shares,
            pnl,
            returnPct: (pnl / position.cost) * 100,
            entryTime: position.entryTime,
            exitTime: Date.now(),
            reason
        });

        capital += exitValue - commission;
    }

    // Calculate current equity
    calculateEquity(capital, position, currentPrice) {
        if (!position) return capital;

        const marketValue = position.shares * currentPrice;
        return position.type === 'long' ?
            capital + marketValue :
            capital + (position.cost - marketValue);
    }

    // Calculate performance metrics
    calculateMetrics(results, initialCapital) {
        const trades = results.trades;
        const equity = results.equity;

        // Basic metrics
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const losingTrades = trades.filter(t => t.pnl < 0).length;
        const winRate = (winningTrades / totalTrades) * 100;

        // Profit metrics
        const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
        const finalEquity = equity[equity.length - 1];
        const returns = ((finalEquity - initialCapital) / initialCapital) * 100;

        // Risk metrics
        const returns_series = equity.map((e, i) => 
            i === 0 ? 0 : (e - equity[i-1]) / equity[i-1]
        );
        const volatility = Math.sqrt(
            returns_series.reduce((sum, r) => sum + Math.pow(r, 0), 0) / returns_series.length
        ) * Math.sqrt(252);

        const drawdowns = this.calculateDrawdowns(equity);
        const sharpeRatio = this.calculateSharpeRatio(returns_series);

        return {
            totalTrades,
            winningTrades,
            losingTrades,
            winRate,
            totalPnL,
            returns,
            volatility,
            maxDrawdown: drawdowns.maxDrawdown,
            sharpeRatio,
            profitFactor: this.calculateProfitFactor(trades),
            averageTrade: totalPnL / totalTrades,
            averageWinner: trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades,
            averageLoser: trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades,
            largestWinner: Math.max(...trades.map(t => t.pnl)),
            largestLoser: Math.min(...trades.map(t => t.pnl)),
            recoveryFactor: totalPnL / drawdowns.maxDrawdown,
            expectancy: this.calculateExpectancy(trades)
        };
    }

    // Calculate drawdowns
    calculateDrawdowns(equity) {
        let peak = equity[0];
        let maxDrawdown = 0;
        let currentDrawdown = 0;
        let drawdownPeriods = [];

        for (let i = 1; i < equity.length; i++) {
            if (equity[i] > peak) {
                peak = equity[i];
                if (currentDrawdown !== 0) {
                    drawdownPeriods.push(currentDrawdown);
                    currentDrawdown = 0;
                }
            } else {
                currentDrawdown = (peak - equity[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
            }
        }

        return {
            maxDrawdown,
            drawdownPeriods,
            averageDrawdown: drawdownPeriods.reduce((sum, d) => sum + d, 0) / drawdownPeriods.length
        };
    }

    // Calculate Sharpe Ratio
    calculateSharpeRatio(returns, riskFreeRate = 0.02) {
        const excessReturns = returns.map(r => r - (riskFreeRate / 252));
        const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
        const stdDev = Math.sqrt(
            excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / excessReturns.length
        );
        return (meanExcessReturn / stdDev) * Math.sqrt(252);
    }

    // Calculate Profit Factor
    calculateProfitFactor(trades) {
        const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
        return grossProfit / grossLoss;
    }

    // Calculate Expectancy
    calculateExpectancy(trades) {
        const winRate = trades.filter(t => t.pnl > 0).length / trades.length;
        const avgWin = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / trades.filter(t => t.pnl > 0).length;
        const avgLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / trades.filter(t => t.pnl < 0).length);
        return (winRate * avgWin) - ((1 - winRate) * avgLoss);
    }

    // Optimize strategy parameters
    async optimizeStrategy(strategyName, data, parameterSpace, options = {}) {
        const results = [];
        const strategy = this.strategies.get(strategyName);

        if (!strategy) {
            throw new MarketAnalysisError('Strategy not found', 'STRATEGY_NOT_FOUND');
        }

        // Generate parameter combinations
        const combinations = this.generateParameterCombinations(parameterSpace);

        // Test each combination
        for (const params of combinations) {
            const testResult = await this.runBacktest(strategyName, data, {
                ...options,
                ...params
            });

            results.push({
                parameters: params,
                metrics: testResult.metrics
            });
        }

        // Sort results by specified metric
        const sortMetric = options.optimizeFor || 'sharpeRatio';
        results.sort((a, b) => b.metrics[sortMetric] - a.metrics[sortMetric]);

        this.optimizationResults.set(strategyName, results);
        return results;
    }

    // Generate all possible parameter combinations
    generateParameterCombinations(parameterSpace) {
        const keys = Object.keys(parameterSpace);
        const combinations = [{}];

        for (const key of keys) {
            const values = parameterSpace[key];
            const newCombinations = [];

            for (const combination of combinations) {
                for (const value of values) {
                    newCombinations.push({
                        ...combination,
                        [key]: value
                    });
                }
            }

            combinations.length = 0;
            combinations.push(...newCombinations);
        }

        return combinations;
    }
}

// Export as singleton
const backtester = new Backtester();
export default backtester;
