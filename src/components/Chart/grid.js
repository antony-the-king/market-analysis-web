class ChartGrid {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.canvas = null;
        this.ctx = null;
        this.config = {
            showGrid: true,
            showAxes: true,
            gridColor: 'rgba(42, 46, 57, 0.5)',
            axisColor: 'rgba(42, 46, 57, 0.8)',
            textColor: 'rgba(255, 255, 255, 0.7)',
            font: '11px Arial',
            padding: 10,
            priceDecimals: 2,
            timeFormat: 'HH:mm',
            verticalGridLines: 8,
            horizontalGridLines: 6
        };

        this.initializeGrid();
    }

    initializeGrid() {
        this.createCanvas();
        this.setupResizeHandler();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'chart-grid-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Position canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        
        // Add to chart container
        const container = document.querySelector('.chart-container');
        container.appendChild(this.canvas);
        
        this.resizeCanvas();
    }

    setupResizeHandler() {
        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
            this.draw();
        });
        resizeObserver.observe(document.querySelector('.chart-container'));
    }

    resizeCanvas() {
        const container = document.querySelector('.chart-container');
        const rect = container.getBoundingClientRect();
        
        // Set canvas size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Update canvas style
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
        this.draw();
    }

    draw() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.config.showGrid) {
            this.drawGrid();
        }
        
        if (this.config.showAxes) {
            this.drawAxes();
        }
    }

    drawGrid() {
        const { width, height } = this.canvas;
        const { verticalGridLines, horizontalGridLines, gridColor } = this.config;

        this.ctx.beginPath();
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;

        // Vertical grid lines
        const verticalSpacing = width / (verticalGridLines + 1);
        for (let i = 1; i <= verticalGridLines; i++) {
            const x = Math.floor(i * verticalSpacing) + 0.5;
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
        }

        // Horizontal grid lines
        const horizontalSpacing = height / (horizontalGridLines + 1);
        for (let i = 1; i <= horizontalGridLines; i++) {
            const y = Math.floor(i * horizontalSpacing) + 0.5;
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }

        this.ctx.stroke();
    }

    drawAxes() {
        const { width, height } = this.canvas;
        const { padding, axisColor, textColor, font, priceDecimals } = this.config;

        this.ctx.strokeStyle = axisColor;
        this.ctx.fillStyle = textColor;
        this.ctx.font = font;
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';

        // Price axis (right)
        const priceRange = this.chart.getPriceRange();
        const priceStep = (priceRange.max - priceRange.min) / (this.config.horizontalGridLines + 1);
        const horizontalSpacing = height / (this.config.horizontalGridLines + 1);

        for (let i = 0; i <= this.config.horizontalGridLines + 1; i++) {
            const y = Math.floor(i * horizontalSpacing) + 0.5;
            const price = priceRange.max - (i * priceStep);
            
            // Draw price label
            this.ctx.fillText(
                price.toFixed(priceDecimals),
                width - padding,
                y
            );
        }

        // Time axis (bottom)
        const timeRange = this.chart.getTimeRange();
        const timeStep = (timeRange.max - timeRange.min) / (this.config.verticalGridLines + 1);
        const verticalSpacing = width / (this.config.verticalGridLines + 1);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        for (let i = 0; i <= this.config.verticalGridLines + 1; i++) {
            const x = Math.floor(i * verticalSpacing) + 0.5;
            const time = new Date(timeRange.min + (i * timeStep));
            
            // Draw time label
            this.ctx.fillText(
                this.formatTime(time),
                x,
                height - padding
            );
        }
    }

    formatTime(date) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return formatter.format(date);
    }

    setGridVisibility(visible) {
        this.config.showGrid = visible;
        this.draw();
    }

    setAxesVisibility(visible) {
        this.config.showAxes = visible;
        this.draw();
    }

    setColors(colors) {
        Object.assign(this.config, colors);
        this.draw();
    }

    setGridLines(vertical, horizontal) {
        this.config.verticalGridLines = vertical;
        this.config.horizontalGridLines = horizontal;
        this.draw();
    }

    setPriceDecimals(decimals) {
        this.config.priceDecimals = decimals;
        this.draw();
    }

    setTimeFormat(format) {
        this.config.timeFormat = format;
        this.draw();
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export default ChartGrid;
