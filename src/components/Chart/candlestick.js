class CandlestickChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.candleSeries = null;
        this.indicators = new Map();
        this.timeframe = '1m';
        this.init();
    }

    init() {
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
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        // Create candlestick series
        this.candleSeries = this.chart.addCandlestickSeries({
            upColor: '#4caf50',
            downColor: '#ef5350',
            borderUpColor: '#4caf50',
            borderDownColor: '#ef5350',
            wickUpColor: '#4caf50',
            wickDownColor: '#ef5350',
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.chart.applyOptions({
                width: this.container.clientWidth,
                height: this.container.clientHeight,
            });
        });

        // Initialize with default size
        this.chart.applyOptions({
            width: this.container.clientWidth,
            height: this.container.clientHeight,
        });

        // Add event listeners for chart interactions
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.chart.subscribeClick((param) => {
            if (param.time) {
                const price = param.point.y;
                const timestamp = param.time;
                this.handleChartClick(timestamp, price);
            }
        });

        this.chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                this.updateTooltip(param);
            }
        });
    }

    updateTooltip(param) {
        const price = param.point?.y;
        if (!price) return;

        // Update price tooltip
        const tooltipEl = document.getElementById('priceTooltip') || this.createTooltip();
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = `${param.point.x}px`;
        tooltipEl.style.top = `${param.point.y}px`;
        tooltipEl.textContent = price.toFixed(5);
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'priceTooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '1000';
        this.container.appendChild(tooltip);
        return tooltip;
    }

    handleChartClick(timestamp, price) {
        // Implement click handling (e.g., adding markers, annotations)
        console.log('Chart clicked:', { timestamp, price });
    }

    updateData(candleData) {
        this.candleSeries.update(candleData);
    }

    setData(candleData) {
        this.candleSeries.setData(candleData);
    }

    addIndicator(type, options = {}) {
        let indicator;
        switch (type) {
            case 'sma':
                indicator = this.chart.addLineSeries({
                    color: options.color || 'rgba(4, 111, 232, 1)',
                    lineWidth: 2,
                });
                break;
            case 'ema':
                indicator = this.chart.addLineSeries({
                    color: options.color || 'rgba(255, 82, 82, 1)',
                    lineWidth: 2,
                });
                break;
            case 'volume':
                indicator = this.chart.addHistogramSeries({
                    color: '#26a69a',
                    priceFormat: {
                        type: 'volume',
                    },
                    priceScaleId: '', // Create a separate scale
                });
                break;
            default:
                throw new Error(`Unsupported indicator type: ${type}`);
        }

        this.indicators.set(type, indicator);
        return indicator;
    }

    removeIndicator(type) {
        const indicator = this.indicators.get(type);
        if (indicator) {
            this.chart.removeSeries(indicator);
            this.indicators.delete(type);
        }
    }

    setTimeframe(timeframe) {
        this.timeframe = timeframe;
        // Implement timeframe change logic
    }

    addPattern(pattern) {
        // Implement pattern visualization
        const { startTime, endTime, type } = pattern;
        const markers = [{
            time: endTime,
            position: 'aboveBar',
            color: type === 'bullish' ? '#4caf50' : '#ef5350',
            shape: 'arrowDown',
            text: type === 'bullish' ? '🔺' : '🔻'
        }];
        this.candleSeries.setMarkers(markers);
    }

    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
    }
}

// Export the class
export default CandlestickChart;
