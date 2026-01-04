const RandomForestClassifier = require('ml-random-forest').RandomForestClassifier;

class ProcessClassifier {
    constructor() {
        this.model = null;
        this.classes = ['web-server', 'database', 'application', 'cache', 'ml-training', 'system'];
        this.trained = false;
    }

    // Extract features from process data
    extractFeatures(process) {
        return [
            process.cpu || 0,
            process.memory || 0,
            process.threads || 1,
            process.priority || 0,
            process.ioRead || 0,
            process.ioWrite || 0,
            process.networkSent || 0,
            process.networkReceived || 0
        ];
    }

    // Train classifier
    train(trainingData) {
        // trainingData = [{ process: {...}, label: 'web-server' }, ...]

        const features = trainingData.map(item => this.extractFeatures(item.process));
        const labels = trainingData.map(item => this.classes.indexOf(item.label));

        const options = {
            seed: 42,
            maxFeatures: 0.8,
            replacement: true,
            nEstimators: 100
        };

        this.model = new RandomForestClassifier(options);
        this.model.train(features, labels);
        this.trained = true;

        console.log('Random Forest classifier trained');
    }

    // Predict process class
    predict(process) {
        const defaultResult = { class: 'unknown', confidence: 0, probabilities: {} };

        // Fail-safe: if not trained or model missing, return default instead of throwing
        if (!this.trained || !this.model) {
            return defaultResult;
        }

        try {
            const features = this.extractFeatures(process);
            const [prediction] = this.model.predict([features]);
            const className = this.classes[prediction];

            // Confidence/probabilities guarded in case API not available
            let confidence = 0;
            let probabilities = {};
            if (typeof this.model.predictionProba === 'function') {
                const [proba] = this.model.predictionProba([features]);
                confidence = proba?.[prediction] ?? 0;
                probabilities = this.classes.reduce((acc, cls, idx) => {
                    acc[cls] = proba?.[idx] ?? 0;
                    return acc;
                }, {});
            }

            return {
                class: className,
                confidence,
                probabilities
            };
        } catch (e) {
            return defaultResult;
        }
    }

    // Predict batch
    predictBatch(processes) {
        return processes.map(proc => this.predict(proc));
    }

    // Get feature importance
    getFeatureImportance() {
        if (!this.trained) {
            return null;
        }

        // Feature names
        const featureNames = [
            'CPU', 'Memory', 'Threads', 'Priority',
            'IO Read', 'IO Write', 'Network Sent', 'Network Received'
        ];

        // This is a simplified version - actual importance would come from the RF model
        return featureNames.map((name, idx) => ({
            feature: name,
            importance: Math.random() // Replace with actual importance from model
        })).sort((a, b) => b.importance - a.importance);
    }
}

module.exports = ProcessClassifier;