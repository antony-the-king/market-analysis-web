import Chart from './src/components/Chart/candlestick.js';
import ChartCrosshair from './src/components/Chart/crosshair.js';
import ChartGrid from './src/components/Chart/grid.js';
import ChartScale from './src/components/Chart/scale.js';
import ChartIndicators from './src/components/Chart/indicators.js';
import ChartLegend from './src/components/Chart/legend.js';
import WebSocketService from './src/services/websocket.js';

const chartContainer = document.querySelector('.chart-container');
const chart = new Chart(chartContainer);
const crosshair = new ChartCrosshair(chart);
const grid = new ChartGrid(chart);
const scale = new ChartScale(chart);
const indicators = new ChartIndicators(chart);
const legend = new ChartLegend(chart);
const websocketService = new WebSocketService(chart);

// Initialize chart
function init() {
    chart.initialize();
    grid.updateDimensions(chartContainer.clientWidth, chartContainer.clientHeight);
    crosshair.setEnabled(true);
    websocketService.connect();
}

// Handle window resize
window.addEventListener('resize', () => {
    grid.updateDimensions(chartContainer.clientWidth, chartContainer.clientHeight);
});

// Start the application
init();
