const mongoose = require('mongoose');

const processMetricsSchema = new mongoose.Schema({
    processId: {
        type: String,
        required: true,
        index: true
    },
    processName: String,
    pid: Number,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    metrics: {
        cpu: Number,
        memory: Number,
        threads: Number,
        ioRead: Number,
        ioWrite: Number,
        networkSent: Number,
        networkReceived: Number
    },
    mlAnalysis: {
        anomalyScore: Number,
        isAnomaly: Boolean,
        classification: String,
        confidence: Number,
        predictions: [Number]
    }
});

// Index for time-based queries
processMetricsSchema.index({ timestamp: -1 });
processMetricsSchema.index({ processId: 1, timestamp: -1 });

// TTL index - automatically delete documents older than 7 days
processMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('ProcessMetrics', processMetricsSchema);