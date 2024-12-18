class ChartScale {
    constructor(chartInstance) {
        this.chart = chartInstance;
        this.priceRange = { min: 0, max: 0 };
        this.timeRange = { min: 0, max: 0 };
        this.verticalScale = 1;
        this.horizontalScale = 1;
        this.verticalOffset = 0;
        this.horizontalOffset = 0;
        this.padding = {
            top: 10,
            right: 60,
            bottom: 30,
            left: 10
        };
        this.autoScale = true;
        this.fixedPriceRange = null;
        this.fixedTimeRange = null;
        this.minZoom = 0.1;
        this.maxZoom = 10;
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.plotWidth = width - this.padding.left - this.padding.right;
        this.plotHeight = height - this.padding.top - this.padding.bottom;
    }

    updateRanges(data) {
        if (!data || data.length === 0) return;

        if (this.autoScale) {
            // Calculate price range from data
            let minPrice = Infinity;
            let maxPrice = -Infinity;
            
            data.forEach(candle => {
                minPrice = Math.min(minPrice, candle.low);
                maxPrice = Math.max(maxPrice, candle.high);
            });

            // Add padding to price range
            const priceMargin = (maxPrice - minPrice) * 0.1;
            this.priceRange = {
                min: minPrice - priceMargin,
                max: maxPrice + priceMargin
            };

            // Calculate time range
            this.timeRange = {
                min: data[0].time,
                max: data[data.length - 1].time
            };
        } else {
            // Use fixed ranges if set
            if (this.fixedPriceRange) {
                this.priceRange = { ...this.fixedPriceRange };
            }
            if (this.fixedTimeRange) {
                this.timeRange = { ...this.fixedTimeRange };
            }
        }

        this.updateScales();
    }

    updateScales() {
        // Calculate vertical scale
        this.verticalScale = this.plotHeight / (this.priceRange.max - this.priceRange.min);

        // Calculate horizontal scale
        const timeSpan = this.timeRange.max - this.timeRange.min;
        this.horizontalScale = this.plotWidth / timeSpan;
    }

    setFixedPriceRange(min, max) {
        this.fixedPriceRange = { min, max };
        this.autoScale = false;
        this.updateScales();
    }

    setFixedTimeRange(min, max) {
        this.fixedTimeRange = { min, max };
        this.autoScale = false;
        this.updateScales();
    }

    enableAutoScale() {
        this.autoScale = true;
        this.fixedPriceRange = null;
        this.fixedTimeRange = null;
        this.updateRanges(this.chart.getData());
    }

    priceToY(price) {
        return this.plotHeight - ((price - this.priceRange.min) * this.verticalScale) + 
               this.padding.top + this.verticalOffset;
    }

    yToPrice(y) {
        return this.priceRange.min + 
               ((this.plotHeight - (y - this.padding.top - this.verticalOffset)) / this.verticalScale);
    }

    timeToX(time) {
        return ((time - this.timeRange.min) * this.horizontalScale) + 
               this.padding.left + this.horizontalOffset;
    }

    xToTime(x) {
        return this.timeRange.min + 
               ((x - this.padding.left - this.horizontalOffset) / this.horizontalScale);
    }

    zoom(factor, center) {
        const newVerticalScale = this.verticalScale * factor;
        const newHorizontalScale = this.horizontalScale * factor;

        // Check zoom limits
        if (factor < this.minZoom || factor > this.maxZoom) return;

        // Calculate price at center point before zoom
        const centerPrice = this.yToPrice(center.y);
        const centerTime = this.xToTime(center.x);

        // Update scales
        this.verticalScale = newVerticalScale;
        this.horizontalScale = newHorizontalScale;

        // Adjust offsets to maintain center point
        const newCenterY = this.priceToY(centerPrice);
        const newCenterX = this.timeToX(centerTime);

        this.verticalOffset += center.y - newCenterY;
        this.horizontalOffset += center.x - newCenterX;

        // Update ranges
        const visibleTimeSpan = this.plotWidth / this.horizontalScale;
        const visiblePriceSpan = this.plotHeight / this.verticalScale;

        this.timeRange = {
            min: centerTime - (visibleTimeSpan / 2),
            max: centerTime + (visibleTimeSpan / 2)
        };

        this.priceRange = {
            min: centerPrice - (visiblePriceSpan / 2),
            max: centerPrice + (visiblePriceSpan / 2)
        };
    }

    pan(deltaX, deltaY) {
        // Update offsets
        this.horizontalOffset += deltaX;
        this.verticalOffset += deltaY;

        // Calculate time and price changes
        const timeChange = deltaX / this.horizontalScale;
        const priceChange = deltaY / this.verticalScale;

        // Update ranges
        this.timeRange.min -= timeChange;
        this.timeRange.max -= timeChange;
        this.priceRange.min += priceChange;
        this.priceRange.max += priceChange;
    }

    fitToData(data, padding = 0.1) {
        if (!data || data.length === 0) return;

        // Find min/max values
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        
        data.forEach(candle => {
            minPrice = Math.min(minPrice, candle.low);
            maxPrice = Math.max(maxPrice, candle.high);
        });

        // Add padding
        const priceMargin = (maxPrice - minPrice) * padding;
        this.priceRange = {
            min: minPrice - priceMargin,
            max: maxPrice + priceMargin
        };

        this.timeRange = {
            min: data[0].time,
            max: data[data.length - 1].time
        };

        // Reset offsets and update scales
        this.horizontalOffset = 0;
        this.verticalOffset = 0;
        this.updateScales();
    }

    getVisibleRange() {
        return {
            price: { ...this.priceRange },
            time: { ...this.timeRange }
        };
    }

    isPointVisible(point) {
        return point.time >= this.timeRange.min &&
               point.time <= this.timeRange.max &&
               point.price >= this.priceRange.min &&
               point.price <= this.priceRange.max;
    }

    setScaleMargins(margins) {
        this.padding = {
            ...this.padding,
            ...margins
        };
        this.updateDimensions(this.width, this.height);
        this.updateScales();
    }

    getTransform() {
        return {
            verticalScale: this.verticalScale,
            horizontalScale: this.horizontalScale,
            verticalOffset: this.verticalOffset,
            horizontalOffset: this.horizontalOffset
        };
    }

    reset() {
        this.verticalScale = 1;
        this.horizontalScale = 1;
        this.verticalOffset = 0;
        this.horizontalOffset = 0;
        this.autoScale = true;
        this.fixedPriceRange = null;
        this.fixedTimeRange = null;
        this.updateRanges(this.chart.getData());
    }
}

export default ChartScale;
