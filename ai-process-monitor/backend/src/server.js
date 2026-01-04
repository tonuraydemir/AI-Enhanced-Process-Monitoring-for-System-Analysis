const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('./db/mongoose');
const processMonitor = require('./services/processMonitor');
const mlService = require('./services/mlService');
const ProcessMetrics = require('./models/ProcessMetrics');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const clients = new Set();

// Track cron task for graceful shutdown
let cronTask = null;
let isBootstrapped = false;

// Handle server errors explicitly
server.on('error', (err) => {
    if (err && (err.code === 'EADDRINUSE')) {
        console.error(`EADDRINUSE: Port is already in use. Make sure no other process is listening on PORT=${process.env.PORT || 3001}.`);
        console.error('On Windows, free the port via: netstat -ano | Select-String ":3001" then taskkill /PID <PID> /F');
        process.exit(1);
    }
    console.error('HTTP server error:', err);
});

// Bootstrap sequence: connect DB, load history + init ML, start cron and server
async function bootstrap() {
    if (isBootstrapped) {
        console.warn('Bootstrap already executed. Skipping duplicate start.');
        return;
    }
    try {
        await connectDB();

        // Only query after DB connection is established
        let processedData = [];
        try {
            const historicalData = await ProcessMetrics.find()
                .sort({ timestamp: -1 })
                .limit(1000)
                .lean();
            processedData = historicalData.map(doc => doc.metrics);
        } catch (error) {
            console.warn('Historical data fetch failed, proceeding with minimal initialization. Error:', error.message);
        }

        await mlService.initialize(processedData);
        console.log('ML Service initialized');

        // Start cron after ML init
        startCron();

        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            isBootstrapped = true;
            console.log(`Server running on port ${PORT}`);
            console.log('ML-Enhanced monitoring active');
        });
    } catch (err) {
        console.error('Startup error:', err);
        process.exit(1);
    }
}

bootstrap();

// WebSocket handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('close', () => {
        clients.delete(ws);
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

app.get('/api/processes', async (req, res) => {
    try {
        const processes = await processMonitor.getProcesses();

        const analyzed = await Promise.all(
            processes.map(async (proc) => {
                const analysis = await mlService.analyzeProcess(proc, proc.pid);
                return { ...proc, mlAnalysis: analysis };
            })
        );

        res.json(analyzed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ml-status', (req, res) => {
    try {
        const status = mlService.getModelStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/predictions/:processId', async (req, res) => {
    try {
        const predictions = await mlService.predictFuture(req.params.processId, 10);
        res.json({ predictions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/historical/:processId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const data = await ProcessMetrics.find({ processId: req.params.processId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Real-time monitoring with ML analysis (start after DB connects)
function startCron() {
    if (cronTask) return cronTask;
    cronTask = cron.schedule('*/2 * * * * *', async () => {
        try {
            const processes = await processMonitor.getProcesses();

            const analyzed = await Promise.all(
                processes.slice(0, 10).map(async (proc) => {
                    const analysis = await mlService.analyzeProcess(proc, proc.pid);

                    // Only persist if DB is connected
                    if (mongoose.connection.readyState === 1) {
                        const metrics = new ProcessMetrics({
                            processId: proc.pid,
                            processName: proc.name,
                            pid: proc.pid,
                            metrics: {
                                cpu: proc.cpu,
                                memory: proc.memory,
                                threads: proc.threads || 1
                            },
                            mlAnalysis: {
                                anomalyScore: analysis.anomaly.score,
                                isAnomaly: analysis.anomaly.isAnomaly,
                                classification: analysis.classification.class,
                                confidence: analysis.classification.confidence,
                                predictions: analysis.predictions || []
                            }
                        });

                        await metrics.save();
                    }

                    return { ...proc, mlAnalysis: analysis };
                })
            );

            const stats = await processMonitor.getSystemStats();

            broadcast({
                type: 'ml_update',
                data: {
                    processes: analyzed,
                    stats,
                    modelStatus: mlService.getModelStatus()
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Monitoring error:', error);
        }
    });
    return cronTask;
}

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        ml: mlService.getModelStatus(),
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown to release port and resources
async function gracefulShutdown(signal) {
    try {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);

        // Stop cron task if running
        if (cronTask) {
            try { cronTask.stop(); } catch (_) { /* ignore */ }
            cronTask = null;
        }

        // Stop accepting new connections
        await new Promise((resolve) => {
            server.close((err) => {
                if (err) {
                    console.warn('HTTP server close error:', err.message);
                }
                resolve();
            });
        });

        // Close WebSocket server
        await new Promise((resolve) => {
            try {
                wss.close(() => resolve());
            } catch (_) { resolve(); }
        });

        // Disconnect mongoose
        try {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }
        } catch (e) {
            console.warn('Mongoose disconnect warning:', e.message);
        }

        console.log('Shutdown complete.');
    } catch (e) {
        console.error('Error during graceful shutdown:', e);
    } finally {
        process.exit(0);
    }
}

// Signal handlers
['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => gracefulShutdown(sig));
});

// Nodemon restart signal on some platforms
process.once('SIGUSR2', async () => {
    await gracefulShutdown('SIGUSR2');
    process.kill(process.pid, 'SIGUSR2');
});

