class ChartOverlays {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.overlays = new Map();
        this.activeOverlays = new Set();
        this.canvas = null;
        this.ctx = null;
        this.initializeCanvas();
    }

    initializeCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'chart-overlay-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to match chart
        this.resizeCanvas();
        
        // Add canvas to chart container
        const container = document.querySelector('.chart-container');
        container.appendChild(this.canvas);
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = document.querySelector('.chart-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.redraw();
    }

    registerOverlay(name, config) {
        this.overlays.set(name, {
            ...config,
            visible: false,
            data: [],
            style: {
                lineWidth: 1,
                strokeStyle: '#ffffff',
                fillStyle: 'rgba(255, 255, 255, 0.1)',
                ...config.style
            }
        });
    }

    initializeDefaultOverlays() {
        // Support/Resistance Levels
        this.registerOverlay('supportResistance', {
            type: 'horizontalLines',
            style: {
                lineWidth: 1,
                strokeStyle: '#4CAF50',
                dashArray: [5, 5]
            },
            render: (ctx, data, style) => {
                data.forEach(level => {
                    this.drawHorizontalLine(ctx, level.price, style);
                    this.drawLabel(ctx, level.price, `S/R ${level.price}`, style);
                });
            }
        });

        // Trend Lines
        this.registerOverlay('trendLines', {
            type: 'lines',
            style: {
                lineWidth: 2,
                strokeStyle: '#2196F3'
            },
            render: (ctx, data, style) => {
                data.forEach(line => {
                    this.drawLine(ctx, line.start, line.end, style);
                });
            }
        });

        // Fibonacci Retracements
        this.registerOverlay('fibonacci', {
            type: 'fibonacciLevels',
            style: {
                lineWidth: 1,
                strokeStyle: '#9C27B0',
                textColor: '#ffffff'
            },
            render: (ctx, data, style) => {
                this.drawFibonacciLevels(ctx, data.start, data.end, style);
            }
        });

        // Pattern Annotations
        this.registerOverlay('patterns', {
            type: 'annotations',
            style: {
                font: '12px Arial',
                fillStyle: '#ffffff',
                backgroundColor: 'rgba(33, 150, 243, 0.3)'
            },
            render: (ctx, data, style) => {
                data.forEach(pattern => {
                    this.drawPatternAnnotation(ctx, pattern, style);
                });
            }
        });

        // Volume Profile
        this.registerOverlay('volumeProfile', {
            type: 'histogram',
            style: {
                fillStyle: 'rgba(76, 175, 80, 0.3)',
                strokeStyle: '#4CAF50'
            },
            render: (ctx, data, style) => {
                this.drawVolumeProfile(ctx, data, style);
            }
        });
    }

    showOverlay(name) {
        const overlay = this.overlays.get(name);
        if (overlay) {
            overlay.visible = true;
            this.activeOverlays.add(name);
            this.redraw();
        }
    }

    hideOverlay(name) {
        const overlay = this.overlays.get(name);
        if (overlay) {
            overlay.visible = false;
            this.activeOverlays.delete(name);
            this.redraw();
        }
    }

    updateOverlayData(name, data) {
        const overlay = this.overlays.get(name);
        if (overlay) {
            overlay.data = data;
            if (overlay.visible) {
                this.redraw();
            }
        }
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const name of this.activeOverlays) {
            const overlay = this.overlays.get(name);
            if (overlay && overlay.visible) {
                this.ctx.save();
                Object.assign(this.ctx, overlay.style);
                overlay.render(this.ctx, overlay.data, overlay.style);
                this.ctx.restore();
            }
        }
    }

    // Drawing Utilities
    drawHorizontalLine(ctx, y, style) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvas.width, y);
        ctx.stroke();
    }

    drawLine(ctx, start, end, style) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    drawLabel(ctx, y, text, style) {
        const padding = 5;
        const metrics = ctx.measureText(text);
        const height = parseInt(ctx.font);
        
        ctx.fillStyle = style.backgroundColor || 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, y - height/2 - padding, metrics.width + padding*2, height + padding*2);
        
        ctx.fillStyle = style.textColor || '#ffffff';
        ctx.fillText(text, padding, y + height/2);
    }

    drawFibonacciLevels(ctx, start, end, style) {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const height = end.y - start.y;
        
        levels.forEach(level => {
            const y = start.y + height * level;
            this.drawHorizontalLine(ctx, y, style);
            this.drawLabel(ctx, y, `${(level * 100).toFixed(1)}%`, style);
        });
    }

    drawPatternAnnotation(ctx, pattern, style) {
        const { x, y, type, significance } = pattern;
        const text = `${type} (${significance})`;
        const padding = 5;
        const metrics = ctx.measureText(text);
        const height = parseInt(ctx.font);
        
        // Background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(x - metrics.width/2 - padding, y - height/2 - padding,
                    metrics.width + padding*2, height + padding*2);
        
        // Text
        ctx.fillStyle = style.fillStyle;
        ctx.fillText(text, x - metrics.width/2, y + height/2);
    }

    drawVolumeProfile(ctx, data, style) {
        const maxVolume = Math.max(...data.map(d => d.volume));
        const width = this.canvas.width * 0.1; // 10% of chart width
        
        data.forEach(bar => {
            const height = (bar.volume / maxVolume) * width;
            ctx.fillStyle = bar.bullish ? style.fillStyle : style.bearishFillStyle || style.fillStyle;
            ctx.fillRect(this.canvas.width - width, bar.price, height, bar.thickness);
        });
    }

    // Coordinate Transformations
    priceToY(price) {
        return this.chart.priceToCoordinate(price);
    }

    timeToX(timestamp) {
        return this.chart.timeToCoordinate(timestamp);
    }

    // Event Handlers
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Handle hover effects for interactive overlays
        this.activeOverlays.forEach(name => {
            const overlay = this.overlays.get(name);
            if (overlay.onHover) {
                overlay.onHover(x, y);
            }
        });
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Handle click events for interactive overlays
        this.activeOverlays.forEach(name => {
            const overlay = this.overlays.get(name);
            if (overlay.onClick) {
                overlay.onClick(x, y);
            }
        });
    }

    destroy() {
        window.removeEventListener('resize', this.resizeCanvas);
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export default ChartOverlays;
