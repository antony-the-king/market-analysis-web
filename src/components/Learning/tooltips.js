class LearningMode {
    constructor() {
        this.enabled = false;
        this.tooltipContainer = null;
        this.patterns = new Map();
        this.indicators = new Map();
        this.strategies = new Map();
        this.initializeContent();
    }

    initializeContent() {
        // Initialize pattern explanations
        this.patterns.set('doji', {
            title: 'Doji Pattern',
            description: 'A doji forms when a security's open and close are virtually equal. The length of both upper and lower shadows can vary, forming different types of doji patterns.',
            significance: 'Indicates market indecision and potential trend reversal.',
            example: '🕯️ When the opening and closing prices are nearly equal, forming a cross shape.'
        });

        this.patterns.set('hammer', {
            title: 'Hammer Pattern',
            description: 'A hammer is formed when a security trades significantly lower than its opening, but rallies within the period to close near opening price.',
            significance: 'Bullish reversal pattern, especially after a downtrend.',
            example: '🔨 Long lower shadow, small body at the top, little to no upper shadow.'
        });

        this.patterns.set('engulfing', {
            title: 'Engulfing Pattern',
            description: 'A two-candle pattern where the second candle completely "engulfs" the body of the first candle.',
            significance: 'Strong reversal signal, especially at support/resistance levels.',
            example: '📊 Second candle body completely covers the first candle body.'
        });

        // Initialize indicator explanations
        this.indicators.set('sma', {
            title: 'Simple Moving Average (SMA)',
            description: 'Calculates the average price over a specified period. Each price point has equal weight.',
            usage: 'Used to identify trend direction and potential support/resistance levels.',
            formula: 'SMA = (P1 + P2 + ... + Pn) / n, where P = Price and n = Period'
        });

        this.indicators.set('rsi', {
            title: 'Relative Strength Index (RSI)',
            description: 'Momentum oscillator that measures the speed and magnitude of recent price changes.',
            usage: 'Identifies overbought (>70) or oversold (<30) conditions.',
            formula: 'RSI = 100 - [100 / (1 + RS)], where RS = Average Gain / Average Loss'
        });

        // Initialize strategy explanations
        this.strategies.set('trendFollowing', {
            title: 'Trend Following Strategy',
            description: 'A strategy that aims to capture gains through long-term price movements.',
            rules: [
                'Enter trades in the direction of the established trend',
                'Use moving averages to confirm trend direction',
                'Wait for pullbacks to enter positions',
                'Place stops below recent swing lows for long positions'
            ],
            riskManagement: 'Suggested position size: 1-2% of trading capital per trade'
        });
    }

    enable() {
        this.enabled = true;
        this.createTooltipContainer();
        this.attachEventListeners();
    }

    disable() {
        this.enabled = false;
        this.removeTooltipContainer();
        this.removeEventListeners();
    }

    createTooltipContainer() {
        if (!this.tooltipContainer) {
            this.tooltipContainer = document.createElement('div');
            this.tooltipContainer.className = 'learning-tooltip';
            this.tooltipContainer.style.display = 'none';
            document.body.appendChild(this.tooltipContainer);
        }
    }

    removeTooltipContainer() {
        if (this.tooltipContainer) {
            document.body.removeChild(this.tooltipContainer);
            this.tooltipContainer = null;
        }
    }

    attachEventListeners() {
        document.querySelectorAll('[data-learning]').forEach(element => {
            element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
            element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        });
    }

    removeEventListeners() {
        document.querySelectorAll('[data-learning]').forEach(element => {
            element.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
            element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        });
    }

    handleMouseEnter(event) {
        if (!this.enabled) return;

        const element = event.target;
        const type = element.dataset.learning;
        const content = this.getContent(type, element.dataset.learningId);

        if (content) {
            this.showTooltip(content, element);
        }
    }

    handleMouseLeave() {
        if (this.tooltipContainer) {
            this.tooltipContainer.style.display = 'none';
        }
    }

    getContent(type, id) {
        switch (type) {
            case 'pattern':
                return this.patterns.get(id);
            case 'indicator':
                return this.indicators.get(id);
            case 'strategy':
                return this.strategies.get(id);
            default:
                return null;
        }
    }

    showTooltip(content, element) {
        if (!this.tooltipContainer || !content) return;

        // Create tooltip content
        let html = `
            <div class="tooltip-header">
                <h3>${content.title}</h3>
            </div>
            <div class="tooltip-body">
        `;

        if (content.description) {
            html += `<p>${content.description}</p>`;
        }

        if (content.significance) {
            html += `<p><strong>Significance:</strong> ${content.significance}</p>`;
        }

        if (content.example) {
            html += `<p><strong>Example:</strong> ${content.example}</p>`;
        }

        if (content.usage) {
            html += `<p><strong>Usage:</strong> ${content.usage}</p>`;
        }

        if (content.formula) {
            html += `<p><strong>Formula:</strong> ${content.formula}</p>`;
        }

        if (content.rules) {
            html += `
                <p><strong>Rules:</strong></p>
                <ul>
                    ${content.rules.map(rule => `<li>${rule}</li>`).join('')}
                </ul>
            `;
        }

        html += '</div>';
        this.tooltipContainer.innerHTML = html;

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltipContainer.getBoundingClientRect();
        
        let left = rect.right + 10;
        let top = rect.top;

        // Adjust position if tooltip would go off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = rect.left - tooltipRect.width - 10;
        }

        if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height - 10;
        }

        this.tooltipContainer.style.left = `${left}px`;
        this.tooltipContainer.style.top = `${top}px`;
        this.tooltipContainer.style.display = 'block';
    }

    addCustomPattern(id, content) {
        this.patterns.set(id, content);
    }

    addCustomIndicator(id, content) {
        this.indicators.set(id, content);
    }

    addCustomStrategy(id, content) {
        this.strategies.set(id, content);
    }
}

// Export as singleton
const learningMode = new LearningMode();
export default learningMode;
