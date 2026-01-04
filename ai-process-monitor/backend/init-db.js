require('dotenv').config();
const mongoose = require('mongoose');
const ProcessMetrics = require('./src/models/ProcessMetrics');
const Alert = require('./src/models/Alert');
const MLModel = require('./src/models/MLModel');

async function initializeDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create sample process metrics
        console.log('\nCreating sample process metrics...');
        const sampleMetrics = [];

        for (let i = 0; i < 50; i++) {
            sampleMetrics.push({
                processId: `${1000 + i}`,
                processName: ['nginx', 'postgres', 'node', 'redis', 'python'][i % 5],
                pid: 1000 + i,
                timestamp: new Date(Date.now() - i * 60000), // Every minute backwards
                metrics: {
                    cpu: Math.random() * 80 + 10,
                    memory: Math.random() * 500 + 100,
                    threads: Math.floor(Math.random() * 50) + 1,
                    ioRead: Math.random() * 1000,
                    ioWrite: Math.random() * 500
                },
                mlAnalysis: {
                    anomalyScore: Math.random() * 0.5,
                    isAnomaly: Math.random() > 0.8,
                    classification: ['web-server', 'database', 'application', 'cache', 'ml-training'][i % 5],
                    confidence: 0.8 + Math.random() * 0.2,
                    predictions: [
                        Math.random() * 30 + 20,
                        Math.random() * 30 + 22,
                        Math.random() * 30 + 24
                    ]
                }
            });
        }

        await ProcessMetrics.insertMany(sampleMetrics);
        console.log(`✅ Created ${sampleMetrics.length} sample metrics`);

        // Create sample alerts
        console.log('\nCreating sample alerts...');
        const sampleAlerts = [
            {
                alertId: `alert-${Date.now()}-1`,
                type: 'warning',
                severity: 6,
                source: 'anomaly',
                processName: 'nginx',
                message: 'Anomaly detected in nginx process',
                mlDetected: true,
                algorithm: 'Isolation Forest',
                acknowledged: false,
                resolved: false
            },
            {
                alertId: `alert-${Date.now()}-2`,
                type: 'critical',
                severity: 9,
                source: 'threshold',
                processName: 'postgres',
                metric: 'cpu',
                message: 'CPU usage critical at 95%',
                details: {
                    currentValue: 95,
                    threshold: 85
                },
                acknowledged: false,
                resolved: false
            },
            {
                alertId: `alert-${Date.now()}-3`,
                type: 'info',
                severity: 3,
                source: 'prediction',
                processName: 'node',
                message: 'LSTM predicts CPU increase in next 5 minutes',
                mlDetected: true,
                algorithm: 'LSTM',
                acknowledged: true,
                resolved: false
            }
        ];

        await Alert.insertMany(sampleAlerts);
        console.log(`✅ Created ${sampleAlerts.length} sample alerts`);

        // Create ML model records
        console.log('\nCreating ML model records...');
        const mlModels = [
            {
                name: 'anomaly_detector',
                type: 'isolation_forest',
                version: Date.now(),
                status: 'trained',
                accuracy: 95.5,
                metrics: {
                    precision: 0.94,
                    recall: 0.96,
                    f1Score: 0.95
                },
                hyperparameters: {
                    numTrees: 100,
                    sampleSize: 256,
                    contamination: 0.1
                },
                description: 'Isolation Forest for anomaly detection'
            },
            {
                name: 'lstm_predictor',
                type: 'lstm',
                version: Date.now(),
                status: 'trained',
                accuracy: 92.3,
                metrics: {
                    mse: 12.5,
                    mae: 3.2,
                    r2Score: 0.89
                },
                hyperparameters: {
                    inputShape: 10,
                    hiddenUnits: 50,
                    epochs: 50,
                    batchSize: 32
                },
                description: 'LSTM Neural Network for time series prediction'
            },
            {
                name: 'process_classifier',
                type: 'random_forest',
                version: Date.now(),
                status: 'trained',
                accuracy: 96.8,
                metrics: {
                    precision: 0.97,
                    recall: 0.96,
                    f1Score: 0.97
                },
                hyperparameters: {
                    nEstimators: 100,
                    maxDepth: 10
                },
                description: 'Random Forest for process classification'
            }
        ];

        await MLModel.insertMany(mlModels);
        console.log(`✅ Created ${mlModels.length} ML model records`);

        // Show database stats
        console.log('\n=== Database Summary ===');
        const metricsCount = await ProcessMetrics.countDocuments();
        const alertsCount = await Alert.countDocuments();
        const modelsCount = await MLModel.countDocuments();

        console.log(`Process Metrics: ${metricsCount}`);
        console.log(`Alerts: ${alertsCount}`);
        console.log(`ML Models: ${modelsCount}`);

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nCollections in database:', collections.map(c => c.name).join(', '));

        await mongoose.disconnect();
        console.log('\n✅ Database initialization completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase();