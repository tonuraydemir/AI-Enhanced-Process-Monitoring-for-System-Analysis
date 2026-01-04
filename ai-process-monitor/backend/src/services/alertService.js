const Alert = require('../models/Alert');

class AlertService {
    constructor() {
        this.activeAlerts = new Map();
        this.thresholds = {
            cpu: {
                warning: 70,
                critical: 85
            },
            memory: {
                warning: 75,
                critical: 90
            },
            disk: {
                warning: 80,
                critical: 95
            },
            anomalyScore: {
                warning: 0.6,
                critical: 0.8
            }
        };
        this.alertCooldown = new Map(); // Prevent alert spam
        this.cooldownPeriod = 60000; // 1 minute
    }

    // Check if alert is in cooldown
    isInCooldown(key) {
        const lastAlert = this.alertCooldown.get(key);
        if (!lastAlert) return false;
        return Date.now() - lastAlert < this.cooldownPeriod;
    }

    // Set cooldown for alert
    setCooldown(key) {
        this.alertCooldown.set(key, Date.now());
    }

    // Check system-wide thresholds
    async checkSystemThresholds(stats) {
        const alerts = [];

        // CPU check
        if (stats.cpu.usage > this.thresholds.cpu.critical) {
            const key = 'system-cpu-critical';
            if (!this.isInCooldown(key)) {
                alerts.push(await this.createAlert({
                    type: 'critical',
                    source: 'threshold',
                    metric: 'cpu',
                    message: `System CPU usage critical at ${stats.cpu.usage.toFixed(1)}%`,
                    details: {
                        currentValue: stats.cpu.usage,
                        threshold: this.thresholds.cpu.critical
                    }
                }));
                this.setCooldown(key);
            }
        } else if (stats.cpu.usage > this.thresholds.cpu.warning) {
            const key = 'system-cpu-warning';
            if (!this.isInCooldown(key)) {
                alerts.push(await this.createAlert({
                    type: 'warning',
                    source: 'threshold',
                    metric: 'cpu',
                    message: `System CPU usage elevated at ${stats.cpu.usage.toFixed(1)}%`,
                    details: {
                        currentValue: stats.cpu.usage,
                        threshold: this.thresholds.cpu.warning
                    }
                }));
                this.setCooldown(key);
            }
        }

        // Memory check
        if (stats.memory.usage > this.thresholds.memory.critical) {
            const key = 'system-memory-critical';
            if (!this.isInCooldown(key)) {
                alerts.push(await this.createAlert({
                    type: 'critical',
                    source: 'threshold',
                    metric: 'memory',
                    message: `System memory usage critical at ${stats.memory.usage.toFixed(1)}%`,
                    details: {
                        currentValue: stats.memory.usage,
                        threshold: this.thresholds.memory.critical
                    }
                }));
                this.setCooldown(key);
            }
        }

        return alerts;
    }

    // Check process-specific thresholds
    async checkProcessThresholds(process, mlAnalysis) {
        const alerts = [];

        // High CPU usage
        if (process.cpu > 90) {
            const key = `process-${process.pid}-cpu`;
            if (!this.isInCooldown(key)) {
                alerts.push(await this.createAlert({
                    type: 'warning',
                    source: 'threshold',
                    processId: process.pid.toString(),
                    processName: process.name,
                    metric: 'cpu',
                    message: `Process ${process.name} using ${process.cpu.toFixed(1)}% CPU`,
                    details: {
                        currentValue: process.cpu,
                        threshold: 90
                    }
                }));
                this.setCooldown(key);
            }
        }

        // ML-detected anomaly
        if (mlAnalysis && mlAnalysis.anomaly && mlAnalysis.anomaly.isAnomaly) {
            const key = `process-${process.pid}-anomaly`;
            if (!this.isInCooldown(key)) {
                alerts.push(await this.createAlert({
                    type: mlAnalysis.anomaly.severity === 'critical' ? 'critical' : 'warning',
                    source: 'anomaly',
                    processId: process.pid.toString(),
                    processName: process.name,
                    metric: 'anomaly',
                    message: `Anomaly detected in ${process.name} (score: ${mlAnalysis.anomaly.score.toFixed(2)})`,
                    details: {
                        anomalyScore: mlAnalysis.anomaly.score,
                        threshold: this.thresholds.anomalyScore.warning
                    },
                    mlDetected: true,
                    algorithm: 'Isolation Forest'
                }));
                this.setCooldown(key);
            }
        }

        // Prediction-based alert
        if (mlAnalysis && mlAnalysis.predictions) {
            const avgPrediction = mlAnalysis.predictions.reduce((a, b) => a + b, 0) / mlAnalysis.predictions.length;
            if (avgPrediction > 85) {
                const key = `process-${process.pid}-prediction`;
                if (!this.isInCooldown(key)) {
                    alerts.push(await this.createAlert({
                        type: 'warning',
                        source: 'prediction',
                        processId: process.pid.toString(),
                        processName: process.name,
                        metric: 'cpu',
                        message: `LSTM predicts ${process.name} will reach ${avgPrediction.toFixed(1)}% CPU`,
                        details: {
                            prediction: avgPrediction,
                            currentValue: process.cpu
                        },
                        mlDetected: true,
                        algorithm: 'LSTM Neural Network'
                    }));
                    this.setCooldown(key);
                }
            }
        }

        return alerts;
    }

    // Create and save alert
    async createAlert(alertData) {
        try {
            const alert = new Alert({
                alertId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                severity: this.calculateSeverity(alertData.type),
                ...alertData
            });

            await alert.save();
            this.activeAlerts.set(alert.alertId, alert);

            return alert;
        } catch (error) {
            console.error('Error creating alert:', error);
            return null;
        }
    }

    // Calculate numeric severity
    calculateSeverity(type) {
        switch (type) {
            case 'critical': return 9;
            case 'warning': return 6;
            case 'info': return 3;
            default: return 5;
        }
    }

    // Get recent alerts
    async getRecentAlerts(limit = 50, unacknowledgedOnly = false) {
        try {
            const query = unacknowledgedOnly ? { acknowledged: false } : {};

            const alerts = await Alert.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            return alerts;
        } catch (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }
    }

    // Acknowledge alert
    async acknowledgeAlert(alertId, acknowledgedBy = 'system') {
        try {
            const alert = await Alert.findOneAndUpdate(
                { alertId },
                {
                    acknowledged: true,
                    acknowledgedAt: new Date(),
                    acknowledgedBy
                },
                { new: true }
            );

            if (alert) {
                this.activeAlerts.delete(alertId);
            }

            return alert;
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            return null;
        }
    }

    // Resolve alert
    async resolveAlert(alertId) {
        try {
            const alert = await Alert.findOneAndUpdate(
                { alertId },
                {
                    resolved: true,
                    resolvedAt: new Date()
                },
                { new: true }
            );

            if (alert) {
                this.activeAlerts.delete(alertId);
            }

            return alert;
        } catch (error) {
            console.error('Error resolving alert:', error);
            return null;
        }
    }

    // Get alert statistics
    async getAlertStats(timeRange = 24 * 60 * 60 * 1000) { // Default 24 hours
        try {
            const since = new Date(Date.now() - timeRange);

            const stats = await Alert.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const mlAlerts = await Alert.countDocuments({
                createdAt: { $gte: since },
                mlDetected: true
            });

            return {
                total: stats.reduce((sum, item) => sum + item.count, 0),
                byType: stats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                mlDetected: mlAlerts,
                timeRange: timeRange
            };
        } catch (error) {
            console.error('Error getting alert stats:', error);
            return null;
        }
    }

    // Clear old alerts
    async clearOldAlerts(daysOld = 30) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

            const result = await Alert.deleteMany({
                createdAt: { $lt: cutoffDate },
                resolved: true
            });

            console.log(`Cleared ${result.deletedCount} old alerts`);
            return result.deletedCount;
        } catch (error) {
            console.error('Error clearing old alerts:', error);
            return 0;
        }
    }
}

module.exports = new AlertService();