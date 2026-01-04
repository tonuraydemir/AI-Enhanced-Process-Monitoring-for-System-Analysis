require('dotenv').config();
const mongoose = require('mongoose');
const ProcessMetrics = require('./src/models/ProcessMetrics');
const Alert = require('./src/models/Alert');
const MLModel = require('./src/models/MLModel');

async function testSchemas() {
    try {
        console.log('🔗 Connecting to MongoDB...\n');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!\n');

        // ========================================
        // TEST 1: ProcessMetrics with ALL fields
        // ========================================
        console.log('📊 Testing ProcessMetrics Schema...');

        const testMetric = new ProcessMetrics({
            processId: 'test-12345',
            processName: 'nginx',
            pid: 12345,
            timestamp: new Date(),
            metrics: {
                cpu: 45.5,
                memory: 512,
                threads: 8,
                ioRead: 1024,
                ioWrite: 512,
                networkSent: 2048,
                networkReceived: 4096
            },
            mlAnalysis: {
                anomalyScore: 0.23,
                isAnomaly: false,
                classification: 'web-server',
                confidence: 0.95,
                predictions: [46.2, 47.1, 48.5, 49.2, 50.1]
            }
        });

        await testMetric.save();
        console.log('✅ ProcessMetrics saved successfully');

        // Retrieve and verify ALL fields
        const foundMetric = await ProcessMetrics.findOne({ processId: 'test-12345' });
        console.log('\n📋 Saved document structure:');
        console.log(JSON.stringify(foundMetric, null, 2));

        // ========================================
        // TEST 2: Alert with ALL fields
        // ========================================
        console.log('\n\n🚨 Testing Alert Schema...');

        const testAlert = new Alert({
            alertId: `alert-${Date.now()}`,
            type: 'warning',
            severity: 7,
            source: 'ml',
            processId: '12345',
            processName: 'nginx',
            metric: 'cpu',
            message: 'High CPU usage detected by ML model',
            details: {
                currentValue: 85.5,
                threshold: 80,
                anomalyScore: 0.75,
                prediction: 90.2,
                confidence: 0.92
            },
            mlDetected: true,
            algorithm: 'Isolation Forest',
            acknowledged: false,
            resolved: false
        });

        await testAlert.save();
        console.log('✅ Alert saved successfully');

        const foundAlert = await Alert.findOne({ alertId: testAlert.alertId });
        console.log('\n📋 Saved alert structure:');
        console.log(JSON.stringify(foundAlert, null, 2));

        // ========================================
        // TEST 3: MLModel with ALL fields
        // ========================================
        console.log('\n\n🧠 Testing MLModel Schema...');

        const testModel = new MLModel({
            name: 'test_anomaly_detector',
            type: 'isolation_forest',
            version: Date.now(),
            status: 'trained',
            accuracy: 95.5,
            metrics: {
                precision: 0.94,
                recall: 0.96,
                f1Score: 0.95,
                mse: 0.05,
                mae: 0.03,
                r2Score: 0.92
            },
            hyperparameters: new Map([
                ['numTrees', 100],
                ['sampleSize', 256],
                ['contamination', 0.1],
                ['maxDepth', 10]
            ]),
            trainingData: {
                size: 10000,
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
                sources: ['processmetrics', 'system_logs']
            },
            performance: {
                inferenceTime: 5.2,
                memoryUsage: 128,
                cpuUsage: 15.5
            },
            modelPath: '/models/anomaly_detector_v1',
            description: 'Isolation Forest model for detecting anomalous process behavior',
            deployedAt: new Date(),
            createdBy: 'admin'
        });

        await testModel.save();
        console.log('✅ MLModel saved successfully');

        const foundModel = await MLModel.findOne({ name: 'test_anomaly_detector' });
        console.log('\n📋 Saved model structure:');
        console.log(JSON.stringify(foundModel, null, 2));

        // ========================================
        // VERIFICATION
        // ========================================
        console.log('\n\n✅ ALL SCHEMAS WORK CORRECTLY!');
        console.log('\n📊 Collection Summary:');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections created:', collections.map(c => c.name).join(', '));

        console.log('\n📈 Document Counts:');
        console.log('  ProcessMetrics:', await ProcessMetrics.countDocuments());
        console.log('  Alerts:', await Alert.countDocuments());
        console.log('  MLModels:', await MLModel.countDocuments());

        // Verify indexes
        console.log('\n🔍 Indexes Created:');
        const metricsIndexes = await ProcessMetrics.collection.getIndexes();
        console.log('  ProcessMetrics indexes:', Object.keys(metricsIndexes).join(', '));

        await mongoose.disconnect();
        console.log('\n✅ Test completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testSchemas();