const ProcessMetrics = require('../models/ProcessMetrics');

class DataCollector {
    constructor() {
        this.collectionInterval = 2000; // 2 seconds
        this.batchSize = 10;
        this.buffer = [];
        this.isCollecting = false;
        this.flushInterval = null;
    }

    // Add metrics to buffer
    addToBuffer(processData, mlAnalysis) {
        const metric = {
            processId: processData.pid.toString(),
            processName: processData.name,
            pid: processData.pid,
            timestamp: new Date(),
            metrics: {
                cpu: processData.cpu || 0,
                memory: processData.memory || 0,
                threads: processData.threads || 1,
                ioRead: processData.ioRead || 0,
                ioWrite: processData.ioWrite || 0,
                networkSent: processData.networkSent || 0,
                networkReceived: processData.networkReceived || 0
            }
        };

        if (mlAnalysis) {
            metric.mlAnalysis = {
                anomalyScore: mlAnalysis.anomaly?.score || 0,
                isAnomaly: mlAnalysis.anomaly?.isAnomaly || false,
                classification: mlAnalysis.classification?.class || 'unknown',
                confidence: mlAnalysis.classification?.confidence || 0,
                predictions: mlAnalysis.predictions || []
            };
        }

        this.buffer.push(metric);

        if (this.buffer.length >= this.batchSize) {
            this.flush();
        }
    }

    // Flush buffer to database
    async flush() {
        if (this.buffer.length === 0) return;

        try {
            const batch = [...this.buffer];
            this.buffer = [];

            await ProcessMetrics.insertMany(batch, { ordered: false });
            console.log(`Saved ${batch.length} metrics to database`);
        } catch (error) {
            if (error.code !== 11000) {
                console.error('Error flushing metrics:', error.message);
            }
        }
    }

    async getHistory(processId, limit = 100) {
        try {
            return await ProcessMetrics.find({ processId })
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();
        } catch (error) {
            console.error('Error fetching history:', error);
            return [];
        }
    }

    async getAggregatedMetrics(processName, timeRange = 3600000) {
        try {
            const since = new Date(Date.now() - timeRange);

            const metrics = await ProcessMetrics.aggregate([
                { $match: { processName, timestamp: { $gte: since } } },
                {
                    $group: {
                        _id: null,
                        avgCpu: { $avg: '$metrics.cpu' },
                        maxCpu: { $max: '$metrics.cpu' },
                        minCpu: { $min: '$metrics.cpu' },
                        avgMemory: { $avg: '$metrics.memory' },
                        maxMemory: { $max: '$metrics.memory' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            return metrics[0] || null;
        } catch (error) {
            console.error('Error getting aggregated metrics:', error);
            return null;
        }
    }

    async getTopProcesses(metric = 'cpu', limit = 10, timeRange = 300000) {
        try {
            const since = new Date(Date.now() - timeRange);
            const field = `$metrics.${metric}`;

            return await ProcessMetrics.aggregate([
                { $match: { timestamp: { $gte: since } } },
                {
                    $group: {
                        _id: '$processName',
                        avgValue: { $avg: field },
                        maxValue: { $max: field },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { avgValue: -1 } },
                { $limit: limit }
            ]);
        } catch (error) {
            console.error('Error getting top processes:', error);
            return [];
        }
    }

    async getAnomalyStats(timeRange = 86400000) {
        try {
            const since = new Date(Date.now() - timeRange);

            return await ProcessMetrics.aggregate([
                { $match: { timestamp: { $gte: since }, 'mlAnalysis.isAnomaly': true } },
                {
                    $group: {
                        _id: '$processName',
                        anomalyCount: { $sum: 1 },
                        avgAnomalyScore: { $avg: '$mlAnalysis.anomalyScore' },
                        maxAnomalyScore: { $max: '$mlAnalysis.anomalyScore' }
                    }
                },
                { $sort: { anomalyCount: -1 } }
            ]);
        } catch (error) {
            console.error('Error getting anomaly stats:', error);
            return [];
        }
    }

    async cleanOldData(daysOld = 7) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 86400000);
            const result = await ProcessMetrics.deleteMany({ timestamp: { $lt: cutoffDate } });
            console.log(`Cleaned ${result.deletedCount} old metrics`);
            return result.deletedCount;
        } catch (error) {
            console.error('Error cleaning old data:', error);
            return 0;
        }
    }

    async getDbStats() {
        try {
            const totalDocs = await ProcessMetrics.countDocuments();
            const oldestDoc = await ProcessMetrics.findOne().sort({ timestamp: 1 }).lean();
            const newestDoc = await ProcessMetrics.findOne().sort({ timestamp: -1 }).lean();
            const uniqueProcesses = await ProcessMetrics.distinct('processName');

            return {
                totalDocuments: totalDocs,
                uniqueProcesses: uniqueProcesses.length,
                oldestRecord: oldestDoc?.timestamp,
                newestRecord: newestDoc?.timestamp,
                processNames: uniqueProcesses
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            return null;
        }
    }

    startAutoFlush() {
        if (this.isCollecting) return;

        this.isCollecting = true;
        this.flushInterval = setInterval(() => this.flush(), 5000);
        console.log('Data collector started with auto-flush');
    }

    async stopAutoFlush() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }

        this.isCollecting = false;
        await this.flush();
        console.log('Data collector stopped');
    }
}

module.exports = new DataCollector();
