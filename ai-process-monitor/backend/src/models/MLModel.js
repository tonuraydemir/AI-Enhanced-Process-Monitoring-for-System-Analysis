const mongoose = require('mongoose');

const mlModelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        enum: ['isolation_forest', 'lstm', 'random_forest', 'autoencoder', 'svm', 'neural_network'],
        required: true
    },
    version: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['training', 'trained', 'deployed', 'deprecated'],
        default: 'training'
    },
    accuracy: {
        type: Number,
        min: 0,
        max: 100
    },
    metrics: {
        precision: Number,
        recall: Number,
        f1Score: Number,
        mse: Number,
        mae: Number,
        r2Score: Number
    },
    hyperparameters: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    trainingData: {
        size: Number,
        startDate: Date,
        endDate: Date,
        sources: [String]
    },
    performance: {
        inferenceTime: Number, // milliseconds
        memoryUsage: Number, // MB
        cpuUsage: Number // percentage
    },
    modelPath: String,
    description: String,
    lastTrained: {
        type: Date,
        default: Date.now
    },
    deployedAt: Date,
    createdBy: {
        type: String,
        default: 'system'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
mlModelSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Index for querying active models
mlModelSchema.index({ status: 1, type: 1 });
mlModelSchema.index({ lastTrained: -1 });

// Virtual for model age
mlModelSchema.virtual('age').get(function() {
    return Date.now() - this.lastTrained;
});

// Method to check if model needs retraining
mlModelSchema.methods.needsRetraining = function() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return this.age > maxAge;
};

module.exports = mongoose.model('MLModel', mlModelSchema);