class CandlestickChart {
    constructor(container) {
        if (!(container instanceof HTMLElement)) {
            throw new Error('Container must be a valid HTML element');
        }
        
        this.container = container;
        this.chart = null;
        this.candleSeries = null;
        this.indicators = new Map();
        this.timeframe = '1m';
        this.init();
    }

    init() {
        try {
            // Create chart instance
            this.chart = LightweightCharts.createChart(this.container, {
                layout: {
                    background: { color: '#1e222d' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: 'rgba(197, 203, 206, 0.8)',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                    },
                },
                timeScale: {
                    borderColor: 'rgba(197, 203, 206, 0.8)',
                    timeVisible: true,
                    secondsVisible: false,
                    barSpacing: 12,
                    rightOffset: 12,
                    fixLeftEdge: true,
                    fixRightEdge: true,
                    lockVisibleTimeRangeOnResize: true,
                    rightBarStaysOnScroll: true,
                    keepVisibleOnResize: true
                },
            });

            // Create candlestick series
            this.candleSeries = this.chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderUpColor: '#26a69a',
                borderDownColor: '#ef5350',
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            // Set initial size
            this.resize();

            // Add event listeners
            this.setupEventListeners();

            console.log('Chart initialized successfully');
        } catch (error) {
            console.error('Failed to initialize chart:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.resize());

        // Handle crosshair move for tooltip
        this.chart.subscribeCrosshairMove(param => {
            if (!param.time || !param.point) {
                return;
            }

            const price = param.seriesPrices.get(this.candleSeries);
            if (!price) {
                return;
            }

            // Only update price info on hover, not during real-time updates
            if (param.time !== Math.floor(Date.now() / 1000)) {
                this.updatePriceInfo(price);
            }
        });
    }

    updatePriceInfo(candle) {
        const currentPrice = document.getElementById('currentPrice');
        const priceChange = document.getElementById('priceChange');
        
        if (currentPrice) {
            currentPrice.textContent = `Price: ${candle.close.toFixed(5)}`;
        }
        
        if (priceChange && candle.open) {
            const change = candle.close - candle.open;
            const changePercent = (change / candle.open) * 100;
            const sign = change >= 0 ? '+' : '';
            priceChange.textContent = `Change: ${sign}${change.toFixed(5)} (${sign}${changePercent.toFixed(2)}%)`;
            priceChange.style.color = change >= 0 ? '#26a69a' : '#ef5350';
        }
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.chart.applyOptions({
            width,
            height
        });
    }

    updateData(candleData) {
        if (!this.candleSeries) return;

        try {
            // Ensure time is in seconds
            const time = typeof candleData.time === 'number' ? 
                candleData.time : Math.floor(candleData.time / 1000);

            // Get the current time in seconds
            const now = Math.floor(Date.now() / 1000);
            const currentMinute = Math.floor(now / 60) * 60;

            // Update the candle
            this.candleSeries.update({
                time,
                open: candleData.open,
                high: candleData.high,
                low: candleData.low,
                close: candleData.close
            });

            // If this is a new minute, ensure we're showing the latest data
            if (time === currentMinute) {
                const timeScale = this.chart.timeScale();
                const visibleRange = timeScale.getVisibleRange();
                const lastTime = Math.floor(Date.now() / 1000);
                
                // If we're not showing the latest candle, scroll to it
                if (!visibleRange || visibleRange.to < lastTime) {
                    timeScale.scrollToPosition(0, true);
                }
            }

            // Update price info for real-time data
            this.updatePriceInfo(candleData);

        } catch (error) {
            console.error('Failed to update chart data:', error);
        }
    }

    setData(candleData) {
        if (!this.candleSeries) return;

        try {
            // Format data
            const formattedData = candleData.map(candle => ({
                time: typeof candle.time === 'number' ? 
                    candle.time : Math.floor(candle.time / 1000),
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close
            }));

            // Set data
            this.candleSeries.setData(formattedData);

            // Fit content
            this.chart.timeScale().fitContent();
        } catch (error) {
            console.error('Failed to set chart data:', error);
        }
    }

    addIndicator(type, options = {}) {
        try {
            let indicator;
            switch (type) {
                case 'sma':
                    indicator = this.chart.addLineSeries({
                        color: options.color || '#2196f3',
                        lineWidth: 2,
                        priceLineVisible: false,
                    });
                    break;
                case 'ema':
                    indicator = this.chart.addLineSeries({
                        color: options.color || '#f44336',
                        lineWidth: 2,
                        priceLineVisible: false,
                    });
                    break;
                default:
                    throw new Error(`Unsupported indicator type: ${type}`);
            }
            this.indicators.set(type, indicator);
            return indicator;
        } catch (error) {
            console.error('Failed to add indicator:', error);
            throw error;
        }
    }

    removeIndicator(type) {
        try {
            const indicator = this.indicators.get(type);
            if (indicator) {
                this.chart.removeSeries(indicator);
                this.indicators.delete(type);
            }
        } catch (error) {
            console.error('Failed to remove indicator:', error);
        }
    }

    zoomIn() {
        const timeScale = this.chart.timeScale();
        const currentSpacing = timeScale.options().barSpacing;
        timeScale.applyOptions({
            barSpacing: currentSpacing * 1.2
        });
    }

    zoomOut() {
        const timeScale = this.chart.timeScale();
        const currentSpacing = timeScale.options().barSpacing;
        timeScale.applyOptions({
            barSpacing: currentSpacing / 1.2
        });
    }

    resetZoom() {
        this.chart.timeScale().fitContent();
    }

    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
            this.candleSeries = null;
            this.indicators.clear();
        }
    }
}

export default CandlestickChart;
