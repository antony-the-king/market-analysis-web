class ChartCrosshair {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.canvas = null;
        this.ctx = null;
        this.enabled = true;
        this.position = { x: 0, y: 0 };
        this.visible = false;
        this.config = {
            color: 'rgba(255, 255, 255, 0.3)',
            lineWidth: 1,
            labelBackgroundColor: 'rgba(42, 46, 57, 0.9)',
            labelTextColor: 'rgba(255, 255, 255, 0.9)',
            labelFont: '12px Arial',
            labelPadding: 6,
            snapToPoint: true,
            snapThreshold: 5
        };

        this.initializeCrosshair();
    }

    initializeCrosshair() {
        this.createCanvas();
        this.setupEventListeners();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'chart-crosshair-canvas';
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

    setupEventListeners() {
        const container = document.querySelector('.chart-container');
        
        container.addEventListener('mousemove', (e) => {
            if (!this.enabled) return;
            
            const rect = container.getBoundingClientRect();
            this.position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            if (this.config.snapToPoint) {
                this.snapToNearestPoint();
            }
            
            this.visible = true;
            this.draw();
        });

        container.addEventListener('mouseleave', () => {
            this.visible = false;
            this.draw();
        });

        // Handle window resize
        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
            this.draw();
        });
        resizeObserver.observe(container);
    }

    resizeCanvas() {
        const container = document.querySelector('.chart-container');
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    snapToNearestPoint() {
        const points = this.chart.getVisiblePoints();
        let nearestPoint = null;
        let minDistance = Infinity;

        points.forEach(point => {
            const dx = point.x - this.position.x;
            const dy = point.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance && distance < this.config.snapThreshold) {
                minDistance = distance;
                nearestPoint = point;
            }
        });

        if (nearestPoint) {
            this.position = { ...nearestPoint };
        }
    }

    draw() {
        if (!this.ctx || !this.visible) {
            this.clear();
            return;
        }

        this.clear();
        this.drawCrosshair();
        this.drawLabels();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawCrosshair() {
        const { width, height } = this.canvas;
        const { x, y } = this.position;

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.config.color;
        this.ctx.lineWidth = this.config.lineWidth;

        // Vertical line
        this.ctx.moveTo(x + 0.5, 0);
        this.ctx.lineTo(x + 0.5, height);

        // Horizontal line
        this.ctx.moveTo(0, y + 0.5);
        this.ctx.lineTo(width, y + 0.5);

        this.ctx.stroke();
    }

    drawLabels() {
        const { width, height } = this.canvas;
        const { x, y } = this.position;
        const { labelPadding: padding } = this.config;

        this.ctx.font = this.config.labelFont;
        this.ctx.textBaseline = 'middle';

        // Price label (right)
        const price = this.chart.coordinateToPrice(y);
        const priceText = this.formatPrice(price);
        const priceMetrics = this.ctx.measureText(priceText);
        const priceHeight = parseInt(this.config.labelFont) + padding * 2;

        this.ctx.fillStyle = this.config.labelBackgroundColor;
        this.ctx.fillRect(
            width - priceMetrics.width - padding * 2,
            y - priceHeight / 2,
            priceMetrics.width + padding * 2,
            priceHeight
        );

        this.ctx.fillStyle = this.config.labelTextColor;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(priceText, width - padding, y);

        // Time label (bottom)
        const time = this.chart.coordinateToTime(x);
        const timeText = this.formatTime(time);
        const timeMetrics = this.ctx.measureText(timeText);
        const timeWidth = timeMetrics.width + padding * 2;

        this.ctx.fillStyle = this.config.labelBackgroundColor;
        this.ctx.fillRect(
            x - timeWidth / 2,
            height - priceHeight,
            timeWidth,
            priceHeight
        );

        this.ctx.fillStyle = this.config.labelTextColor;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(timeText, x, height - priceHeight / 2);

        // Value label (floating)
        const point = this.chart.getPointAt(x, y);
        if (point) {
            this.drawValueLabel(point);
        }
    }

    drawValueLabel(point) {
        const { x, y } = this.position;
        const { labelPadding: padding } = this.config;

        const text = this.formatValue(point);
        const metrics = this.ctx.measureText(text);
        const labelHeight = parseInt(this.config.labelFont) + padding * 2;
        const labelWidth = metrics.width + padding * 2;

        // Position label to avoid chart edges
        let labelX = x + 10;
        let labelY = y - labelHeight - 10;

        if (labelX + labelWidth > this.canvas.width) {
            labelX = x - labelWidth - 10;
        }
        if (labelY < 0) {
            labelY = y + 10;
        }

        // Draw background
        this.ctx.fillStyle = this.config.labelBackgroundColor;
        this.ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Draw text
        this.ctx.fillStyle = this.config.labelTextColor;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(text, labelX + padding, labelY + labelHeight / 2);
    }

    formatPrice(price) {
        return price.toFixed(this.chart.getPriceDecimals());
    }

    formatTime(time) {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(time);
    }

    formatValue(point) {
        const { open, high, low, close, volume } = point;
        return `O: ${open.toFixed(2)} H: ${high.toFixed(2)} L: ${low.toFixed(2)} C: ${close.toFixed(2)} V: ${volume}`;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.visible = false;
            this.draw();
        }
    }

    setConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
        this.draw();
    }

    setSnapToPoint(enabled) {
        this.config.snapToPoint = enabled;
    }

    setSnapThreshold(threshold) {
        this.config.snapThreshold = threshold;
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export default ChartCrosshair;
