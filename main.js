import config from './src/config.js';
import binaryWebSocket from './src/services/websocket.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize chart container
        const chartContainer = document.getElementById('chartContainer');
        if (!chartContainer) {
            throw new Error('Chart container not found');
        }

        // Set initial container size
        chartContainer.style.width = '100%';
        chartContainer.style.height = '500px';

        // Create chart instance
        const chart = LightweightCharts.createChart(chartContainer, {
            layout: {
                background: { color: config.chart.background },
                textColor: config.chart.textColor,
            },
            grid: {
                vertLines: { color: config.chart.gridColor },
                horzLines: { color: config.chart.gridColor },
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
            },
        });

        // Create candlestick series
        const candleSeries = chart.addCandlestickSeries({
            upColor: config.chart.candlestick.upColor,
            downColor: config.chart.candlestick.downColor,
            borderUpColor: config.chart.candlestick.upColor,
            borderDownColor: config.chart.candlestick.downColor,
            wickUpColor: config.chart.candlestick.wickUpColor,
            wickDownColor: config.chart.candlestick.wickDownColor,
        });

        // Initialize WebSocket connection
        await binaryWebSocket.initialize();
        console.log('WebSocket initialized');

        // Get initial symbol from select element
        const symbolSelect = document.getElementById('symbolSelect');
        let currentSymbol = symbolSelect.value || config.defaultSymbol;
        let currentTimeframe = config.chart.defaultTimeframe;
        let lastCandleTime = null;

        // Handle WebSocket updates
        function handleWebSocketUpdate(update) {
            if (update.type === 'history') {
                candleSeries.setData(update.data);
                lastCandleTime = update.data[update.data.length - 1].time;
                chart.timeScale().fitContent();
            } 
            else if (update.type === 'candle') {
                // Always update candle data regardless of time
                candleSeries.update(update.data);
                lastCandleTime = update.data.time;
                updatePriceInfo(update.data);
                
                // If it's a new minute, update the chart view
                const now = Math.floor(Date.now() / 1000);
                const currentMinute = Math.floor(now / 60) * 60;
                if (update.data.time === currentMinute) {
                    chart.timeScale().scrollToRealTime();
                }
            }
            else if (update.type === 'tick') {
                // Always update the current candle
                candleSeries.update(update.data);
                updatePriceInfo(update.data);
            }
        }

        async function loadSymbolData(symbol, timeframe) {
            try {
                // Show loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.textContent = 'Loading market data...';
                chartContainer.appendChild(loadingIndicator);

                // Unsubscribe from previous symbol if exists
                if (currentSymbol && currentSymbol !== symbol) {
                    binaryWebSocket.unsubscribe(currentSymbol, handleWebSocketUpdate);
                }

                // Get historical data
                const historicalData = await binaryWebSocket.requestHistory(symbol, timeframe);
                console.log('Historical data received:', historicalData.length, 'candles');
                
                // Set historical data to chart
                candleSeries.setData(historicalData);
                lastCandleTime = historicalData[historicalData.length - 1].time;

                // Subscribe to real-time updates
                binaryWebSocket.subscribe(symbol, handleWebSocketUpdate);

                // Remove loading indicator
                chartContainer.removeChild(loadingIndicator);

            } catch (error) {
                console.error('Failed to load symbol data:', error);
                showError('Failed to load market data');
            }
        }

        // Load initial data
        await loadSymbolData(currentSymbol, currentTimeframe);

        // Handle symbol change
        symbolSelect.addEventListener('change', async (event) => {
            const newSymbol = event.target.value;
            currentSymbol = newSymbol;
            await loadSymbolData(currentSymbol, currentTimeframe);
        });

        // Handle timeframe buttons
        const timeframeButtons = document.querySelectorAll('.timeframe-controls button');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                // Remove active class from all buttons
                timeframeButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                event.target.classList.add('active');
                
                const newTimeframe = event.target.dataset.timeframe;
                if (newTimeframe !== currentTimeframe) {
                    currentTimeframe = newTimeframe;
                    await loadSymbolData(currentSymbol, currentTimeframe);
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            chart.applyOptions({
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight
            });
        });

        // Handle zoom controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                const timeScale = chart.timeScale();
                const currentSpacing = timeScale.options().barSpacing;
                timeScale.applyOptions({
                    barSpacing: currentSpacing * 1.2
                });
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                const timeScale = chart.timeScale();
                const currentSpacing = timeScale.options().barSpacing;
                timeScale.applyOptions({
                    barSpacing: currentSpacing / 1.2
                });
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                chart.timeScale().fitContent();
            });
        }

        // Handle fullscreen
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    chartContainer.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            });
        }

        console.log('Chart initialized successfully');
    } catch (error) {
        console.error('Failed to initialize chart:', error);
        showError('Failed to initialize application');
    }
});

// Helper function to update price information
function updatePriceInfo(candle) {
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
        priceChange.style.color = change >= 0 ? config.chart.candlestick.upColor : config.chart.candlestick.downColor;
    }
}

// Helper function to show error messages
function showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ef5350;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        z-index: 1000;
    `;
    errorContainer.textContent = message;
    document.body.appendChild(errorContainer);

    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorContainer.parentNode) {
            errorContainer.parentNode.removeChild(errorContainer);
        }
    }, 5000);
}
