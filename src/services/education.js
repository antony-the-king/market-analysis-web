import { config } from '../config.js';
import { MarketAnalysisError } from '../utils/helpers.js';

class EducationService {
    constructor() {
        this.content = new Map();
        this.progress = new Map();
        this.bookmarks = new Set();
        this.initializeContent();
    }

    initializeContent() {
        // Candlestick Patterns
        this.addContent('patterns', {
            doji: {
                title: 'Doji Pattern',
                category: 'candlestick',
                difficulty: 'beginner',
                content: {
                    description: 'A doji forms when a security's open and close are virtually equal. The length of both upper and lower shadows can vary.',
                    significance: 'Indicates market indecision and potential trend reversal.',
                    interpretation: [
                        'Signals market indecision',
                        'More significant at market extremes',
                        'Often precedes price reversals'
                    ],
                    examples: [
                        'Long-legged doji: Long upper and lower shadows',
                        'Dragonfly doji: Long lower shadow, no upper shadow',
                        'Gravestone doji: Long upper shadow, no lower shadow'
                    ],
                    tips: [
                        'Confirm with other indicators',
                        'Consider market context',
                        'Watch for volume confirmation'
                    ]
                },
                quiz: [
                    {
                        question: 'What does a doji pattern indicate?',
                        options: [
                            'Market indecision',
                            'Strong uptrend',
                            'Strong downtrend',
                            'High volume'
                        ],
                        correct: 0
                    }
                ]
            },
            hammer: {
                title: 'Hammer Pattern',
                category: 'candlestick',
                difficulty: 'beginner',
                content: {
                    description: 'A hammer is formed when a security trades significantly lower than its opening, but rallies within the period to close near opening price.',
                    significance: 'Bullish reversal pattern, especially after a downtrend.',
                    interpretation: [
                        'Signals potential bottom',
                        'More reliable with confirmation',
                        'Volume adds credibility'
                    ],
                    examples: [
                        'Classic hammer: Small body, long lower shadow',
                        'Inverted hammer: Small body, long upper shadow',
                        'Color of body less important than shape'
                    ],
                    tips: [
                        'Look for prior downtrend',
                        'Wait for next candle confirmation',
                        'Consider risk/reward ratio'
                    ]
                }
            }
        });

        // Technical Indicators
        this.addContent('indicators', {
            movingAverages: {
                title: 'Moving Averages',
                category: 'technical',
                difficulty: 'beginner',
                content: {
                    description: 'Moving averages smooth price data to create a single flowing line, helping to identify trends.',
                    types: [
                        {
                            name: 'Simple Moving Average (SMA)',
                            description: 'Average price over a specific period',
                            formula: '(P1 + P2 + ... + Pn) / n'
                        },
                        {
                            name: 'Exponential Moving Average (EMA)',
                            description: 'Weighted average giving more importance to recent prices',
                            formula: '(Close - EMA(previous)) × multiplier + EMA(previous)'
                        }
                    ],
                    usage: [
                        'Trend identification',
                        'Support and resistance levels',
                        'Crossover signals'
                    ],
                    commonPeriods: [
                        '9 periods (short-term)',
                        '20 periods (medium-term)',
                        '50 and 200 periods (long-term)'
                    ]
                }
            },
            rsi: {
                title: 'Relative Strength Index (RSI)',
                category: 'technical',
                difficulty: 'intermediate',
                content: {
                    description: 'Momentum oscillator measuring speed and magnitude of recent price changes.',
                    interpretation: [
                        'Overbought conditions (>70)',
                        'Oversold conditions (<30)',
                        'Divergence signals'
                    ],
                    signals: [
                        'Centerline crossovers',
                        'Support/Resistance breaks',
                        'Failure swings'
                    ]
                }
            }
        });

        // Trading Strategies
        this.addContent('strategies', {
            trendFollowing: {
                title: 'Trend Following Strategy',
                category: 'strategy',
                difficulty: 'intermediate',
                content: {
                    description: 'A strategy that aims to capture gains through long-term price movements.',
                    principles: [
                        'Trade in the direction of the trend',
                        'Use moving averages for confirmation',
                        'Wait for pullbacks to enter'
                    ],
                    implementation: [
                        'Identify trend using multiple timeframes',
                        'Use indicators for confirmation',
                        'Set appropriate stop-loss levels'
                    ],
                    riskManagement: [
                        'Position sizing rules',
                        'Stop-loss placement',
                        'Profit taking strategies'
                    ]
                }
            }
        });
    }

    // Add new educational content
    addContent(category, content) {
        if (!this.content.has(category)) {
            this.content.set(category, new Map());
        }
        
        Object.entries(content).forEach(([key, value]) => {
            this.content.get(category).set(key, {
                ...value,
                id: `${category}-${key}`,
                lastUpdated: Date.now()
            });
        });
    }

    // Get content by category and id
    getContent(category, id) {
        const categoryContent = this.content.get(category);
        if (!categoryContent) {
            throw new MarketAnalysisError(
                'Category not found',
                'INVALID_CATEGORY',
                { category }
            );
        }

        const content = categoryContent.get(id);
        if (!content) {
            throw new MarketAnalysisError(
                'Content not found',
                'INVALID_CONTENT_ID',
                { category, id }
            );
        }

        return content;
    }

    // Get all content in a category
    getCategoryContent(category) {
        const categoryContent = this.content.get(category);
        if (!categoryContent) {
            throw new MarketAnalysisError(
                'Category not found',
                'INVALID_CATEGORY',
                { category }
            );
        }

        return Array.from(categoryContent.values());
    }

    // Track user progress
    updateProgress(userId, contentId, progress) {
        if (!this.progress.has(userId)) {
            this.progress.set(userId, new Map());
        }

        this.progress.get(userId).set(contentId, {
            progress,
            lastUpdated: Date.now()
        });

        this.saveProgress(userId);
    }

    // Get user progress
    getProgress(userId, contentId = null) {
        const userProgress = this.progress.get(userId);
        if (!userProgress) return null;

        if (contentId) {
            return userProgress.get(contentId);
        }

        return Object.fromEntries(userProgress);
    }

    // Save progress to localStorage
    saveProgress(userId) {
        try {
            const userProgress = this.progress.get(userId);
            if (userProgress) {
                localStorage.setItem(
                    `education_progress_${userId}`,
                    JSON.stringify(Object.fromEntries(userProgress))
                );
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    // Load progress from localStorage
    loadProgress(userId) {
        try {
            const saved = localStorage.getItem(`education_progress_${userId}`);
            if (saved) {
                const progress = JSON.parse(saved);
                this.progress.set(userId, new Map(Object.entries(progress)));
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }

    // Bookmark content
    toggleBookmark(contentId) {
        if (this.bookmarks.has(contentId)) {
            this.bookmarks.delete(contentId);
        } else {
            this.bookmarks.add(contentId);
        }
        this.saveBookmarks();
    }

    // Get bookmarked content
    getBookmarks() {
        return Array.from(this.bookmarks);
    }

    // Save bookmarks to localStorage
    saveBookmarks() {
        try {
            localStorage.setItem(
                'education_bookmarks',
                JSON.stringify(Array.from(this.bookmarks))
            );
        } catch (error) {
            console.error('Error saving bookmarks:', error);
        }
    }

    // Load bookmarks from localStorage
    loadBookmarks() {
        try {
            const saved = localStorage.getItem('education_bookmarks');
            if (saved) {
                this.bookmarks = new Set(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        }
    }

    // Search educational content
    search(query) {
        const results = [];
        this.content.forEach((categoryContent, category) => {
            categoryContent.forEach((content, id) => {
                if (this.matchesSearch(content, query)) {
                    results.push({
                        category,
                        id,
                        ...content
                    });
                }
            });
        });
        return results;
    }

    // Check if content matches search query
    matchesSearch(content, query) {
        const searchText = query.toLowerCase();
        return (
            content.title.toLowerCase().includes(searchText) ||
            content.content.description.toLowerCase().includes(searchText)
        );
    }

    // Get recommended content based on user level
    getRecommendations(userLevel = 'beginner') {
        const recommendations = [];
        this.content.forEach((categoryContent) => {
            categoryContent.forEach((content) => {
                if (content.difficulty === userLevel) {
                    recommendations.push(content);
                }
            });
        });
        return recommendations;
    }
}

// Export as singleton
const educationService = new EducationService();
export default educationService;
