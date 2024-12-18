import { dom, events } from '../../utils/helpers.js';
import settingsManager from '../../services/settings.js';

class TooltipManager {
    constructor() {
        this.tooltips = new Map();
        this.activeTooltips = new Set();
        this.learningMode = false;
        this.mousePosition = { x: 0, y: 0 };
        
        // Debounced update function for performance
        this.updateTooltipPositions = events.debounce(this._updateTooltipPositions.bind(this), 16);
    }

    async initialize() {
        // Initialize event listeners
        this.setupEventListeners();
        
        // Load learning mode preference
        this.learningMode = settingsManager.get('learningMode', false);
        
        return true;
    }

    setupEventListeners() {
        // Track mouse position
        document.addEventListener('mousemove', (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
            this.updateTooltipPositions();
        });

        // Handle scroll events
        window.addEventListener('scroll', () => {
            this.updateTooltipPositions();
        }, { passive: true });

        // Handle resize events
        window.addEventListener('resize', () => {
            this.updateTooltipPositions();
        });

        // Handle ESC key to close tooltips
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllTooltips();
            }
        });
    }

    createTooltip(options) {
        const {
            type = 'default',
            content,
            position = 'bottom',
            target,
            persistent = false,
            interactive = false,
            className = '',
            showArrow = true,
            offset = { x: 0, y: 8 },
            onShow,
            onHide
        } = options;

        // Create tooltip element
        const tooltip = dom.createElement('div', {
            className: `tooltip ${type}-tooltip ${className}`,
            style: {
                position: 'absolute',
                display: 'none',
                zIndex: '1000'
            }
        });

        // Add content
        if (typeof content === 'string') {
            tooltip.innerHTML = content;
        } else if (content instanceof Element) {
            tooltip.appendChild(content);
        }

        // Add arrow if needed
        if (showArrow) {
            tooltip.setAttribute('data-position', position);
        }

        // Make interactive if needed
        if (interactive) {
            tooltip.style.pointerEvents = 'auto';
        }

        // Add to document
        document.body.appendChild(tooltip);

        // Store tooltip data
        const tooltipData = {
            element: tooltip,
            target,
            position,
            offset,
            persistent,
            interactive,
            onShow,
            onHide
        };

        const id = Math.random().toString(36).substr(2, 9);
        this.tooltips.set(id, tooltipData);

        return id;
    }

    showTooltip(id) {
        const tooltip = this.tooltips.get(id);
        if (!tooltip) return;

        tooltip.element.style.display = 'block';
        tooltip.element.classList.add('animate');
        this.activeTooltips.add(id);

        this.updateTooltipPosition(tooltip);

        if (tooltip.onShow) {
            tooltip.onShow(tooltip.element);
        }
    }

    hideTooltip(id) {
        const tooltip = this.tooltips.get(id);
        if (!tooltip) return;

        tooltip.element.style.display = 'none';
        tooltip.element.classList.remove('animate');
        this.activeTooltips.delete(id);

        if (tooltip.onHide) {
            tooltip.onHide(tooltip.element);
        }
    }

    hideAllTooltips() {
        this.activeTooltips.forEach(id => {
            this.hideTooltip(id);
        });
    }

    updateTooltipPosition(tooltip) {
        const { element, target, position, offset } = tooltip;
        
        if (!target) {
            // Position relative to mouse
            element.style.left = `${this.mousePosition.x + (offset.x || 0)}px`;
            element.style.top = `${this.mousePosition.y + (offset.y || 0)}px`;
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = element.getBoundingClientRect();

        let left, top;

        switch (position) {
            case 'top':
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                top = targetRect.top - tooltipRect.height - offset.y;
                break;
            case 'bottom':
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                top = targetRect.bottom + offset.y;
                break;
            case 'left':
                left = targetRect.left - tooltipRect.width - offset.x;
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                break;
            case 'right':
                left = targetRect.right + offset.x;
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                break;
        }

        // Ensure tooltip stays within viewport
        const viewport = {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        };

        if (left < viewport.left) left = viewport.left + 5;
        if (top < viewport.top) top = viewport.top + 5;
        if (left + tooltipRect.width > viewport.right) {
            left = viewport.right - tooltipRect.width - 5;
        }
        if (top + tooltipRect.height > viewport.bottom) {
            top = viewport.bottom - tooltipRect.height - 5;
        }

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
    }

    _updateTooltipPositions() {
        this.activeTooltips.forEach(id => {
            const tooltip = this.tooltips.get(id);
            if (tooltip) {
                this.updateTooltipPosition(tooltip);
            }
        });
    }

    removeTooltip(id) {
        const tooltip = this.tooltips.get(id);
        if (!tooltip) return;

        if (tooltip.element.parentNode) {
            tooltip.element.parentNode.removeChild(tooltip.element);
        }

        this.tooltips.delete(id);
        this.activeTooltips.delete(id);
    }

    setLearningMode(enabled) {
        this.learningMode = enabled;
        settingsManager.set('learningMode', enabled);

        if (!enabled) {
            // Hide all learning tooltips
            this.activeTooltips.forEach(id => {
                const tooltip = this.tooltips.get(id);
                if (tooltip && tooltip.element.classList.contains('learning-tooltip')) {
                    this.hideTooltip(id);
                }
            });
        }
    }

    createPriceTooltip(price, time) {
        return this.createTooltip({
            type: 'price',
            content: `
                <div class="price">${price}</div>
                <div class="time">${time}</div>
            `,
            position: 'right',
            offset: { x: 10, y: 0 }
        });
    }

    createIndicatorTooltip(indicator, values) {
        const content = `
            <div class="title">${indicator}</div>
            <div class="values">
                ${Object.entries(values).map(([label, value]) => `
                    <div class="label">${label}:</div>
                    <div class="value">${value}</div>
                `).join('')}
            </div>
        `;

        return this.createTooltip({
            type: 'indicator',
            content,
            position: 'left',
            offset: { x: -10, y: 0 }
        });
    }

    createPatternTooltip(pattern) {
        const content = `
            <div class="pattern-name">${pattern.name}</div>
            <div class="description">${pattern.description}</div>
            <div class="significance">
                Significance:
                <div class="significance-bar">
                    <div class="significance-value" style="width: ${pattern.significance * 100}%"></div>
                </div>
            </div>
        `;

        return this.createTooltip({
            type: 'pattern',
            content,
            position: 'top',
            showArrow: true,
            interactive: true
        });
    }

    createLearningTooltip(content, target) {
        return this.createTooltip({
            type: 'learning',
            content: `
                <div class="title">${content.title}</div>
                <div class="content">${content.description}</div>
                <div class="actions">
                    <button class="button next">Next</button>
                    <button class="button close">Close</button>
                </div>
            `,
            target,
            position: 'bottom',
            persistent: true,
            interactive: true,
            showArrow: true
        });
    }
}

// Export as singleton
const tooltipManager = new TooltipManager();
export default tooltipManager;
