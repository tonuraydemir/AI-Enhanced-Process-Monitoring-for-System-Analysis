const IsolationForest = require('../ml/anomalyDetector');
const LSTMPredictor = require('../ml/timeSeriesPredictor');
const ProcessClassifier = require('../ml/processClassifier');
const DataPreprocessor = require('../ml/dataPreprocessor');

class MLService {
    constructor() {
        this.anomalyDetector = new IsolationForest(100, 256, 0.1);
        this.predictor = new LSTMPredictor(10, 50);
        this.classifier = new ProcessClassifier();
        this.preprocessor = new DataPreprocessor();

        this.metricsHistory = new Map();
        this.maxHistorySize = 100;
        this.isTraining = false;
    }

    // Initialize and train models
    async initialize(historicalData) {
        console.log('Initializing ML models...');

        try {
            // Train anomaly detector
            if (historicalData.length > 50) {
                const features = historicalData.map(data => [
                    data.cpu || 0,
                    data.memory || 0,
                    data.ioRead || 0,
                    data.ioWrite || 0
                ]);
                this.anomalyDetector.fit(features);
            }

            // Train LSTM predictor
            if (historicalData.length > 50) {
                const cpuData = historicalData.map(d => d.cpu || 0);
                await this.predictor.train(cpuData, 30, 16);
            }

            // Train classifier with synthetic data (in production, use real labeled data)
            const trainingData = this.generateTrainingData();
            this.classifier.train(trainingData);

            console.log('ML models initialized successfully');
        } catch (error) {
            console.error('Error initializing ML models:', error);
        }
    }

    // Generate synthetic training data for classifier
    generateTrainingData() {
        const data = [];

        // Web servers
        for (let i = 0; i < 20; i++) {
            data.push({
                process: {
                    cpu: 10 + Math.random() * 30,
                    memory: 200 + Math.random() * 300,
                    threads: 50 + Math.random() * 100,
                    priority: 10,
                    ioRead: 100 + Math.random() * 200,
                    ioWrite: 50 + Math.random() * 100,
                    networkSent: 500 + Math.random() * 1000,
                    networkReceived: 1000 + Math.random() * 2000
                },
                label: 'web-server'
            });
        }

        // Databases
        for (let i = 0; i < 20; i++) {
            data.push({
                process: {
                    cpu: 15 + Math.random() * 40,
                    memory: 500 + Math.random() * 500,
                    threads: 100 + Math.random() * 200,
                    priority: 15,
                    ioRead: 1000 + Math.random() * 2000,
                    ioWrite: 500 + Math.random() * 1000,
                    networkSent: 200 + Math.random() * 300,
                    networkReceived: 300 + Math.random() * 500
                },
                label: 'database'
            });
        }

        // ML Training processes
        for (let i = 0; i < 20; i++) {
            data.push({
                process: {
                    cpu: 60 + Math.random() * 35,
                    memory: 800 + Math.random() * 1200,
                    threads: 10 + Math.random() * 30,
                    priority: 5,
                    ioRead: 500 + Math.random() * 500,
                    ioWrite: 200 + Math.random() * 300,
                    networkSent: 50 + Math.random() * 100,
                    networkReceived: 50 + Math.random() * 100
                },
                label: 'ml-training'
            });
        }

        return data;
    }

    // Store metrics history
    storeMetrics(processId, metrics) {
        if (!this.metricsHistory.has(processId)) {
            this.metricsHistory.set(processId, []);
        }

        const history = this.metricsHistory.get(processId);
        history.push({
            ...metrics,
            timestamp: Date.now()
        });

        // Keep only recent history
        if (history.length > this.maxHistorySize) {
            history.shift();
        }
    }

    // Detect anomalies
    detectAnomalies(process) {
        try {
            const features = [
                process.cpu || 0,
                process.memory || 0,
                process.ioRead || 0,
                process.ioWrite || 0
            ];

            const anomalyScore = this.anomalyDetector.predict(features);

            return {
                isAnomaly: anomalyScore > 0.6,
                score: anomalyScore,
                severity: anomalyScore > 0.8 ? 'critical' : anomalyScore > 0.6 ? 'warning' : 'normal'
            };
        } catch (error) {
            console.error('Anomaly detection error:', error);
            return { isAnomaly: false, score: 0, severity: 'normal' };
        }
    }

    // Predict future values
    async predictFuture(processId, steps = 5) {
        try {
            // If predictor not trained yet, skip predictions quietly
            if (!this.predictor || !this.predictor.trained) {
                return null;
            }

            const history = this.metricsHistory.get(processId);
            if (!history || history.length < 10) {
                return null;
            }

            const cpuHistory = history.map(m => m.cpu || 0);
            const predictions = await this.predictor.predictMultiStep(
                cpuHistory.slice(-10),
                steps
            );

            return predictions;
        } catch (error) {
            // Degrade gracefully without noisy logs during cold start
            return null;
        }
    }

    // Classify process
    classifyProcess(process) {
        try {
            return this.classifier.predict(process);
        } catch (error) {
            console.error('Classification error:', error);
            return { class: 'unknown', confidence: 0, probabilities: {} };
        }
    }

    // Analyze process with all ML models
    async analyzeProcess(process, processId) {
        // Store current metrics
        this.storeMetrics(processId, {
            cpu: process.cpu,
            memory: process.memory,
            ioRead: process.ioRead || 0,
            ioWrite: process.ioWrite || 0
        });

        // Run all analyses
        const anomalyResult = this.detectAnomalies(process);
        const classification = this.classifyProcess(process);
        const predictions = await this.predictFuture(processId, 5);

        return {
            anomaly: anomalyResult,
            classification: classification,
            predictions: predictions,
            timestamp: Date.now()
        };
    }

    // Get model status
    getModelStatus() {
        return {
            anomalyDetector: {
                trained: this.anomalyDetector.trained,
                numTrees: this.anomalyDetector.numTrees
            },
            predictor: {
                trained: this.predictor.trained,
                inputShape: this.predictor.inputShape
            },
            classifier: {
                trained: this.classifier.trained,
                classes: this.classifier.classes
            }
        };
    }
}

module.exports = new MLService();