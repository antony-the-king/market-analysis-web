import { MarketAnalysisError } from '../utils/helpers.js';

class DrawingTools {
    constructor() {
        this.tools = new Map();
        this.activeDrawings = new Map();
        this.activeToolType = null;
        this.isDrawing = false;
        this.currentDrawing = null;
        this.drawingHistory = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.initializeTools();
    }

    initializeTools() {
        // Line Tool
        this.registerTool('line', {
            name: 'Line',
            icon: '↗',
            draw: (ctx, points, style) => {
                if (points.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                ctx.lineTo(points[1].x, points[1].y);
                ctx.stroke();
            },
            hitTest: (point, points, tolerance) => {
                if (points.length < 2) return false;
                return this.lineHitTest(point, points[0], points[1], tolerance);
            }
        });

        // Horizontal Line Tool
        this.registerTool('horizontalLine', {
            name: 'Horizontal Line',
            icon: '→',
            draw: (ctx, points, style) => {
                if (points.length < 1) return;
                const { width } = ctx.canvas;
                ctx.beginPath();
                ctx.moveTo(0, points[0].y);
                ctx.lineTo(width, points[0].y);
                ctx.stroke();
            },
            hitTest: (point, points, tolerance) => {
                if (points.length < 1) return false;
                return Math.abs(point.y - points[0].y) <= tolerance;
            }
        });

        // Rectangle Tool
        this.registerTool('rectangle', {
            name: 'Rectangle',
            icon: '□',
            draw: (ctx, points, style) => {
                if (points.length < 2) return;
                const width = points[1].x - points[0].x;
                const height = points[1].y - points[0].y;
                if (style.fill) {
                    ctx.fillRect(points[0].x, points[0].y, width, height);
                }
                ctx.strokeRect(points[0].x, points[0].y, width, height);
            },
            hitTest: (point, points, tolerance) => {
                if (points.length < 2) return false;
                return this.rectangleHitTest(point, points[0], points[1], tolerance);
            }
        });

        // Fibonacci Retracement Tool
        this.registerTool('fibonacci', {
            name: 'Fibonacci Retracement',
            icon: '𝌡',
            levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
            draw: (ctx, points, style) => {
                if (points.length < 2) return;
                const [start, end] = points;
                const height = end.y - start.y;
                const width = ctx.canvas.width;

                this.tools.get('fibonacci').levels.forEach(level => {
                    const y = start.y + height * level;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                    
                    // Draw level label
                    ctx.fillText(
                        `${(level * 100).toFixed(1)}%`,
                        width - 50,
                        y - 5
                    );
                });
            },
            hitTest: (point, points, tolerance) => {
                if (points.length < 2) return false;
                return this.fibonacciHitTest(point, points[0], points[1], tolerance);
            }
        });

        // Trend Channel Tool
        this.registerTool('trendChannel', {
            name: 'Trend Channel',
            icon: '∥',
            draw: (ctx, points, style) => {
                if (points.length < 3) return;
                // Draw main trend line
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                ctx.lineTo(points[1].x, points[1].y);
                ctx.stroke();

                // Draw parallel channel line
                const dx = points[1].x - points[0].x;
                const dy = points[1].y - points[0].y;
                ctx.beginPath();
                ctx.moveTo(points[2].x, points[2].y);
                ctx.lineTo(points[2].x + dx, points[2].y + dy);
                ctx.stroke();
            },
            hitTest: (point, points, tolerance) => {
                if (points.length < 3) return false;
                return this.channelHitTest(point, points, tolerance);
            }
        });

        // Text Annotation Tool
        this.registerTool('text', {
            name: 'Text',
            icon: 'T',
            draw: (ctx, points, style) => {
                if (points.length < 1 || !style.text) return;
                ctx.font = style.font || '14px Arial';
                ctx.fillStyle = style.color || '#ffffff';
                ctx.fillText(style.text, points[0].x, points[0].y);
            },
            hitTest: (point, points, style, tolerance) => {
                if (points.length < 1 || !style.text) return false;
                const metrics = ctx.measureText(style.text);
                return this.rectangleHitTest(
                    point,
                    points[0],
                    {
                        x: points[0].x + metrics.width,
                        y: points[0].y + parseInt(style.font)
                    },
                    tolerance
                );
            }
        });
    }

    // Register a new drawing tool
    registerTool(type, tool) {
        this.tools.set(type, {
            ...tool,
            type
        });
    }

    // Start drawing
    startDrawing(type, point, style = {}) {
        if (!this.tools.has(type)) {
            throw new MarketAnalysisError('Invalid tool type', 'INVALID_TOOL');
        }

        this.isDrawing = true;
        this.activeToolType = type;
        this.currentDrawing = {
            id: Date.now().toString(),
            type,
            points: [point],
            style: {
                color: '#ffffff',
                lineWidth: 1,
                ...style
            }
        };
    }

    // Add point to current drawing
    addPoint(point) {
        if (!this.isDrawing || !this.currentDrawing) return;
        this.currentDrawing.points.push(point);
    }

    // Finish drawing
    finishDrawing() {
        if (!this.isDrawing || !this.currentDrawing) return;

        this.activeDrawings.set(
            this.currentDrawing.id,
            this.currentDrawing
        );

        this.addToHistory({
            type: 'add',
            drawing: { ...this.currentDrawing }
        });

        const result = { ...this.currentDrawing };
        this.isDrawing = false;
        this.currentDrawing = null;
        return result;
    }

    // Cancel current drawing
    cancelDrawing() {
        this.isDrawing = false;
        this.currentDrawing = null;
    }

    // Draw all active drawings
    drawAll(ctx) {
        this.activeDrawings.forEach(drawing => {
            const tool = this.tools.get(drawing.type);
            if (tool) {
                ctx.save();
                this.applyStyle(ctx, drawing.style);
                tool.draw(ctx, drawing.points, drawing.style);
                ctx.restore();
            }
        });

        // Draw current drawing if active
        if (this.isDrawing && this.currentDrawing) {
            const tool = this.tools.get(this.currentDrawing.type);
            if (tool) {
                ctx.save();
                this.applyStyle(ctx, this.currentDrawing.style);
                tool.draw(ctx, this.currentDrawing.points, this.currentDrawing.style);
                ctx.restore();
            }
        }
    }

    // Apply drawing style to context
    applyStyle(ctx, style) {
        Object.assign(ctx, {
            strokeStyle: style.color,
            fillStyle: style.color,
            lineWidth: style.lineWidth,
            font: style.font
        });
    }

    // Hit testing
    hitTest(point, tolerance = 5) {
        const hits = [];
        this.activeDrawings.forEach(drawing => {
            const tool = this.tools.get(drawing.type);
            if (tool && tool.hitTest(point, drawing.points, tolerance)) {
                hits.push(drawing);
            }
        });
        return hits;
    }

    // Line hit test
    lineHitTest(point, start, end, tolerance) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return false;

        const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length);
        if (t < 0 || t > 1) return false;

        const projection = {
            x: start.x + t * dx,
            y: start.y + t * dy
        };

        const distance = Math.sqrt(
            Math.pow(point.x - projection.x, 2) +
            Math.pow(point.y - projection.y, 2)
        );

        return distance <= tolerance;
    }

    // Rectangle hit test
    rectangleHitTest(point, start, end, tolerance) {
        const minX = Math.min(start.x, end.x) - tolerance;
        const maxX = Math.max(start.x, end.x) + tolerance;
        const minY = Math.min(start.y, end.y) - tolerance;
        const maxY = Math.max(start.y, end.y) + tolerance;

        return point.x >= minX && point.x <= maxX &&
               point.y >= minY && point.y <= maxY;
    }

    // Fibonacci hit test
    fibonacciHitTest(point, start, end, tolerance) {
        const height = end.y - start.y;
        return this.tools.get('fibonacci').levels.some(level => {
            const y = start.y + height * level;
            return Math.abs(point.y - y) <= tolerance;
        });
    }

    // Channel hit test
    channelHitTest(point, points, tolerance) {
        if (points.length < 3) return false;
        
        // Check main trend line
        if (this.lineHitTest(point, points[0], points[1], tolerance)) {
            return true;
        }

        // Check parallel channel line
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        const channelEnd = {
            x: points[2].x + dx,
            y: points[2].y + dy
        };
        
        return this.lineHitTest(point, points[2], channelEnd, tolerance);
    }

    // Remove drawing
    removeDrawing(id) {
        const drawing = this.activeDrawings.get(id);
        if (drawing) {
            this.activeDrawings.delete(id);
            this.addToHistory({
                type: 'remove',
                drawing
            });
            return true;
        }
        return false;
    }

    // Clear all drawings
    clearAll() {
        this.addToHistory({
            type: 'clear',
            drawings: Array.from(this.activeDrawings.values())
        });
        this.activeDrawings.clear();
    }

    // Add action to history
    addToHistory(action) {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.drawingHistory.length - 1) {
            this.drawingHistory = this.drawingHistory.slice(0, this.historyIndex + 1);
        }

        this.drawingHistory.push(action);
        if (this.drawingHistory.length > this.maxHistory) {
            this.drawingHistory.shift();
        }
        this.historyIndex = this.drawingHistory.length - 1;
    }

    // Undo last action
    undo() {
        if (this.historyIndex < 0) return false;

        const action = this.drawingHistory[this.historyIndex];
        this.historyIndex--;

        switch (action.type) {
            case 'add':
                this.activeDrawings.delete(action.drawing.id);
                break;
            case 'remove':
                this.activeDrawings.set(action.drawing.id, action.drawing);
                break;
            case 'clear':
                action.drawings.forEach(drawing => {
                    this.activeDrawings.set(drawing.id, drawing);
                });
                break;
        }

        return true;
    }

    // Redo last undone action
    redo() {
        if (this.historyIndex >= this.drawingHistory.length - 1) return false;

        this.historyIndex++;
        const action = this.drawingHistory[this.historyIndex];

        switch (action.type) {
            case 'add':
                this.activeDrawings.set(action.drawing.id, action.drawing);
                break;
            case 'remove':
                this.activeDrawings.delete(action.drawing.id);
                break;
            case 'clear':
                this.activeDrawings.clear();
                break;
        }

        return true;
    }

    // Export drawings
    exportDrawings() {
        return Array.from(this.activeDrawings.values());
    }

    // Import drawings
    importDrawings(drawings) {
        this.activeDrawings.clear();
        drawings.forEach(drawing => {
            this.activeDrawings.set(drawing.id, drawing);
        });
    }
}

// Export as singleton
const drawingTools = new DrawingTools();
export default drawingTools;
