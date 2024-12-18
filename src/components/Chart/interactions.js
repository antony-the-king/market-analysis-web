class ChartInteractions {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.canvas = null;
        this.isMouseDown = false;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.zoomLevel = 1;
        this.minZoom = 0.1;
        this.maxZoom = 10;
        this.touchStartDistance = 0;
        this.currentMode = 'default';
        this.selectedElements = new Set();
        this.listeners = new Map();

        this.initializeInteractions();
    }

    initializeInteractions() {
        this.canvas = this.chart.canvas;
        
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Context menu
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Double click
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Keyboard events for selected elements
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    setMode(mode) {
        this.currentMode = mode;
        this.canvas.style.cursor = this.getCursorForMode(mode);
    }

    getCursorForMode(mode) {
        const cursors = {
            default: 'default',
            pan: 'grab',
            draw: 'crosshair',
            select: 'pointer',
            measure: 'crosshair'
        };
        return cursors[mode] || 'default';
    }

    // Mouse Event Handlers
    handleMouseDown(event) {
        this.isMouseDown = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        const coords = this.getCanvasCoordinates(event);
        
        switch (this.currentMode) {
            case 'pan':
                this.canvas.style.cursor = 'grabbing';
                break;
            case 'draw':
                this.startDrawing(coords);
                break;
            case 'select':
                this.startSelection(coords);
                break;
            case 'measure':
                this.startMeasurement(coords);
                break;
        }

        this.emit('mouseDown', { coords, mode: this.currentMode });
    }

    handleMouseMove(event) {
        const coords = this.getCanvasCoordinates(event);
        
        if (this.isMouseDown) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;
            
            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                this.isDragging = true;
            }
            
            switch (this.currentMode) {
                case 'pan':
                    this.handlePan(deltaX, deltaY);
                    break;
                case 'draw':
                    this.updateDrawing(coords);
                    break;
                case 'select':
                    this.updateSelection(coords);
                    break;
                case 'measure':
                    this.updateMeasurement(coords);
                    break;
            }
        }
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        this.emit('mouseMove', { coords, isDragging: this.isDragging });
    }

    handleMouseUp(event) {
        const coords = this.getCanvasCoordinates(event);
        
        if (this.currentMode === 'pan') {
            this.canvas.style.cursor = 'grab';
        }
        
        if (!this.isDragging) {
            this.handleClick(coords);
        }
        
        switch (this.currentMode) {
            case 'draw':
                this.finishDrawing(coords);
                break;
            case 'select':
                this.finishSelection(coords);
                break;
            case 'measure':
                this.finishMeasurement(coords);
                break;
        }
        
        this.isMouseDown = false;
        this.isDragging = false;
        
        this.emit('mouseUp', { coords });
    }

    handleWheel(event) {
        event.preventDefault();
        
        const coords = this.getCanvasCoordinates(event);
        const delta = -Math.sign(event.deltaY);
        const zoomFactor = 1.1;
        
        if (delta > 0) {
            this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel * zoomFactor);
        } else {
            this.zoomLevel = Math.max(this.minZoom, this.zoomLevel / zoomFactor);
        }
        
        this.chart.zoom(this.zoomLevel, coords);
        this.emit('zoom', { level: this.zoomLevel, center: coords });
    }

    // Touch Event Handlers
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 2) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.touchStartDistance = this.getTouchDistance(touch1, touch2);
        } else {
            this.handleMouseDown({
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY
            });
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 2) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const distance = this.getTouchDistance(touch1, touch2);
            const center = this.getTouchCenter(touch1, touch2);
            
            const scale = distance / this.touchStartDistance;
            this.zoomLevel = Math.max(this.minZoom, 
                          Math.min(this.maxZoom, this.zoomLevel * scale));
            
            this.chart.zoom(this.zoomLevel, center);
            this.touchStartDistance = distance;
        } else {
            this.handleMouseMove({
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY
            });
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handleMouseUp(event);
    }

    // Utility Methods
    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    handlePan(deltaX, deltaY) {
        this.chart.pan(deltaX, deltaY);
        this.emit('pan', { deltaX, deltaY });
    }

    handleClick(coords) {
        const clickedElement = this.chart.hitTest(coords);
        if (clickedElement) {
            this.emit('elementClick', { element: clickedElement, coords });
        }
    }

    handleContextMenu(event) {
        event.preventDefault();
        const coords = this.getCanvasCoordinates(event);
        this.emit('contextMenu', { coords });
    }

    handleDoubleClick(event) {
        const coords = this.getCanvasCoordinates(event);
        this.emit('doubleClick', { coords });
    }

    handleKeyDown(event) {
        if (this.selectedElements.size > 0) {
            switch (event.key) {
                case 'Delete':
                    this.deleteSelectedElements();
                    break;
                case 'Escape':
                    this.clearSelection();
                    break;
            }
        }
    }

    // Selection Methods
    startSelection(coords) {
        this.selectionStart = coords;
        this.chart.startSelectionRect(coords);
    }

    updateSelection(coords) {
        if (this.selectionStart) {
            this.chart.updateSelectionRect(this.selectionStart, coords);
        }
    }

    finishSelection(coords) {
        if (this.selectionStart) {
            const selectedElements = this.chart.getElementsInRect(
                this.selectionStart, 
                coords
            );
            this.setSelectedElements(selectedElements);
            this.chart.clearSelectionRect();
            this.selectionStart = null;
        }
    }

    setSelectedElements(elements) {
        this.selectedElements = new Set(elements);
        this.chart.highlightElements(elements);
        this.emit('selectionChange', { elements: Array.from(elements) });
    }

    clearSelection() {
        this.selectedElements.clear();
        this.chart.clearHighlights();
        this.emit('selectionChange', { elements: [] });
    }

    deleteSelectedElements() {
        this.chart.deleteElements(Array.from(this.selectedElements));
        this.clearSelection();
    }

    // Event Emitter Methods
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    destroy() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Clear all listeners
        this.listeners.clear();
    }
}

export default ChartInteractions;
