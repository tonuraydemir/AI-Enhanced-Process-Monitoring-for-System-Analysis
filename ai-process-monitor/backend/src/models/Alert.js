const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    alertId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        required: true
    },
    severity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },
    source: {
        type: String,
        enum: ['threshold', 'ml', 'anomaly', 'prediction', 'system'],
        required: true
    },
    processId: String,
    processName: String,
    metric: String,
    message: {
        type: String,
        required: true
    },
    details: {
        currentValue: Number,
        threshold: Number,
        anomalyScore: Number,
        prediction: Number,
        confidence: Number
    },
    mlDetected: {
        type: Boolean,
        default: false
    },
    algorithm: String,
    acknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedAt: Date,
    acknowledgedBy: String,
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
alertSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Index for querying unresolved alerts
alertSchema.index({ resolved: 1, createdAt: -1 });
alertSchema.index({ processName: 1, createdAt: -1 });

// TTL index - delete resolved alerts after 30 days
alertSchema.index({ resolvedAt: 1 }, {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { resolved: true }
});

module.exports = mongoose.model('Alert', alertSchema);