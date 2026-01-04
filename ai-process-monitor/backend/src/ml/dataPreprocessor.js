class DataPreprocessor {
    constructor() {
        this.scalers = new Map();
    }

    // Min-Max normalization
    normalize(data, featureName) {
        const values = Array.isArray(data) ? data : [data];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        this.scalers.set(featureName, { min, max, range });

        return values.map(val => (val - min) / range);
    }

    // Denormalize
    denormalize(normalizedData, featureName) {
        const scaler = this.scalers.get(featureName);
        if (!scaler) {
            throw new Error(`No scaler found for feature: ${featureName}`);
        }

        const values = Array.isArray(normalizedData) ? normalizedData : [normalizedData];
        return values.map(val => val * scaler.range + scaler.min);
    }

    // Z-score standardization
    standardize(data, featureName) {
        const values = Array.isArray(data) ? data : [data];
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance) || 1;

        this.scalers.set(featureName, { mean, std });

        return values.map(val => (val - mean) / std);
    }

    // Feature engineering for processes
    engineerFeatures(process, historicalData = []) {
        const features = {
            // Current metrics
            cpu: process.cpu || 0,
            memory: process.memory || 0,
            threads: process.threads || 1,

            // Derived features
            cpuPerThread: (process.cpu || 0) / (process.threads || 1),
            memoryPerThread: (process.memory || 0) / (process.threads || 1),

            // Statistical features from history
            cpuMean: 0,
            cpuStd: 0,
            cpuTrend: 0,
            memoryMean: 0,
            memoryStd: 0,
            memoryTrend: 0
        };

        if (historicalData.length > 0) {
            const cpuHistory = historicalData.map(d => d.cpu || 0);
            const memHistory = historicalData.map(d => d.memory || 0);

            features.cpuMean = cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length;
            features.memoryMean = memHistory.reduce((a, b) => a + b, 0) / memHistory.length;

            const cpuVariance = cpuHistory.reduce((sum, val) =>
                sum + Math.pow(val - features.cpuMean, 2), 0) / cpuHistory.length;
            features.cpuStd = Math.sqrt(cpuVariance);

            const memVariance = memHistory.reduce((sum, val) =>
                sum + Math.pow(val - features.memoryMean, 2), 0) / memHistory.length;
            features.memoryStd = Math.sqrt(memVariance);

            // Calculate trend (simple linear regression slope)
            features.cpuTrend = this.calculateTrend(cpuHistory);
            features.memoryTrend = this.calculateTrend(memHistory);
        }

        return features;
    }

    // Calculate linear trend
    calculateTrend(data) {
        const n = data.length;
        if (n < 2) return 0;

        const xMean = (n - 1) / 2;
        const yMean = data.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (data[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }

        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Create sliding windows for time series
    createWindows(data, windowSize = 10, stride = 1) {
        const windows = [];
        for (let i = 0; i <= data.length - windowSize; i += stride) {
            windows.push(data.slice(i, i + windowSize));
        }
        return windows;
    }

    // Handle missing values
    fillMissing(data, strategy = 'mean') {
        const values = data.filter(val => val !== null && val !== undefined && !isNaN(val));

        if (values.length === 0) return data;

        let fillValue;
        switch (strategy) {
            case 'mean':
                fillValue = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'median':
                const sorted = [...values].sort((a, b) => a - b);
                fillValue = sorted[Math.floor(sorted.length / 2)];
                break;
            case 'zero':
                fillValue = 0;
                break;
            default:
                fillValue = 0;
        }

        return data.map(val => (val === null || val === undefined || isNaN(val)) ? fillValue : val);
    }
}

module.exports = DataPreprocessor;