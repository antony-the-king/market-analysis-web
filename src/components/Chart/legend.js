class ChartLegend {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.container = null;
        this.items = new Map();
        this.activeItems = new Set();
        this.position = 'top-right';
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        this.initializeLegend();
    }

    initializeLegend() {
        this.createContainer();
        this.setupDragAndDrop();
        this.setupResizeObserver();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'chart-legend';
        this.container.innerHTML = `
            <div class="legend-header">
                <div class="legend-title">Legend</div>
                <div class="legend-controls">
                    <button class="legend-minimize" title="Minimize">−</button>
                    <button class="legend-settings" title="Settings">⚙</button>
                </div>
            </div>
            <div class="legend-content"></div>
        `;

        // Add to chart container
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.appendChild(this.container);

        // Setup controls
        this.container.querySelector('.legend-minimize').addEventListener('click', 
            () => this.toggleMinimize());
        this.container.querySelector('.legend-settings').addEventListener('click', 
            () => this.showSettings());
    }

    setupDragAndDrop() {
        const header = this.container.querySelector('.legend-header');
        
        header.addEventListener('mousedown', (e) => {
            if (e.target === header) {
                this.isDragging = true;
                this.dragStartX = e.clientX - this.container.offsetLeft;
                this.dragStartY = e.clientY - this.container.offsetTop;
                
                document.addEventListener('mousemove', this.handleDrag);
                document.addEventListener('mouseup', this.handleDragEnd);
            }
        });
    }

    handleDrag = (e) => {
        if (this.isDragging) {
            const chartContainer = document.querySelector('.chart-container');
            const bounds = chartContainer.getBoundingClientRect();
            
            let left = e.clientX - this.dragStartX;
            let top = e.clientY - this.dragStartY;
            
            // Keep within chart bounds
            left = Math.max(0, Math.min(left, bounds.width - this.container.offsetWidth));
            top = Math.max(0, Math.min(top, bounds.height - this.container.offsetHeight));
            
            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;
        }
    }

    handleDragEnd = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
    }

    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            this.updatePosition();
        });
        resizeObserver.observe(document.querySelector('.chart-container'));
    }

    addItem(id, config) {
        const itemElement = document.createElement('div');
        itemElement.className = 'legend-item';
        itemElement.innerHTML = `
            <div class="legend-item-header">
                <div class="legend-item-color" style="background-color: ${config.color}"></div>
                <div class="legend-item-name">${config.name}</div>
                <div class="legend-item-controls">
                    <button class="legend-item-settings" title="Settings">⚙</button>
                    <button class="legend-item-visibility" title="Toggle visibility">👁</button>
                    <button class="legend-item-remove" title="Remove">×</button>
                </div>
            </div>
            <div class="legend-item-values"></div>
        `;

        const content = this.container.querySelector('.legend-content');
        content.appendChild(itemElement);

        // Setup event listeners
        itemElement.querySelector('.legend-item-settings').addEventListener('click', 
            () => this.showItemSettings(id));
        itemElement.querySelector('.legend-item-visibility').addEventListener('click', 
            () => this.toggleItemVisibility(id));
        itemElement.querySelector('.legend-item-remove').addEventListener('click', 
            () => this.removeItem(id));

        this.items.set(id, {
            element: itemElement,
            config,
            visible: true
        });
        this.activeItems.add(id);
    }

    updateItem(id, values) {
        const item = this.items.get(id);
        if (!item) return;

        const valuesContainer = item.element.querySelector('.legend-item-values');
        valuesContainer.innerHTML = this.formatValues(values);
    }

    formatValues(values) {
        return Object.entries(values)
            .map(([key, value]) => `
                <div class="legend-value">
                    <span class="legend-value-label">${key}:</span>
                    <span class="legend-value-number">${this.formatNumber(value)}</span>
                </div>
            `).join('');
    }

    formatNumber(value) {
        if (typeof value === 'number') {
            return value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        return value;
    }

    removeItem(id) {
        const item = this.items.get(id);
        if (item) {
            item.element.remove();
            this.items.delete(id);
            this.activeItems.delete(id);
            this.emit('itemRemoved', { id });
        }
    }

    toggleItemVisibility(id) {
        const item = this.items.get(id);
        if (item) {
            item.visible = !item.visible;
            const button = item.element.querySelector('.legend-item-visibility');
            button.innerHTML = item.visible ? '👁' : '👁‍🗨';
            item.element.classList.toggle('legend-item-hidden', !item.visible);
            this.emit('visibilityChanged', { id, visible: item.visible });
        }
    }

    showItemSettings(id) {
        const item = this.items.get(id);
        if (item) {
            this.emit('showSettings', { id, config: item.config });
        }
    }

    toggleMinimize() {
        this.container.classList.toggle('legend-minimized');
        const button = this.container.querySelector('.legend-minimize');
        button.textContent = this.container.classList.contains('legend-minimized') ? '+' : '−';
    }

    showSettings() {
        this.emit('showLegendSettings', {
            position: this.position,
            items: Array.from(this.items.entries()).map(([id, item]) => ({
                id,
                name: item.config.name,
                visible: item.visible
            }))
        });
    }

    setPosition(position) {
        this.position = position;
        this.updatePosition();
    }

    updatePosition() {
        const [vertical, horizontal] = this.position.split('-');
        const container = document.querySelector('.chart-container');
        const bounds = container.getBoundingClientRect();

        // Reset positioning
        this.container.style.top = '';
        this.container.style.right = '';
        this.container.style.bottom = '';
        this.container.style.left = '';

        // Apply new position
        if (vertical === 'top') {
            this.container.style.top = '10px';
        } else {
            this.container.style.bottom = '10px';
        }

        if (horizontal === 'right') {
            this.container.style.right = '10px';
        } else {
            this.container.style.left = '10px';
        }
    }

    clear() {
        const content = this.container.querySelector('.legend-content');
        content.innerHTML = '';
        this.items.clear();
        this.activeItems.clear();
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    // Event handling
    emit(event, data) {
        const customEvent = new CustomEvent(`legend:${event}`, { detail: data });
        this.container.dispatchEvent(customEvent);
    }

    on(event, callback) {
        this.container.addEventListener(`legend:${event}`, (e) => callback(e.detail));
    }
}

export default ChartLegend;
