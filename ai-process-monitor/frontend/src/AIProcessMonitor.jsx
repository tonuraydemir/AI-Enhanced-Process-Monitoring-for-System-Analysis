import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, AlertTriangle, Cpu, HardDrive, Zap, TrendingUp, Brain, CheckCircle } from 'lucide-react';

// Simulated AI Process Monitor with real-time updates
const AIProcessMonitor = () => {
    const [processes, setProcesses] = useState([]);
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [metrics, setMetrics] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [aiInsights, setAiInsights] = useState([]);
    const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, disk: 0 });

    // Initialize processes
    useEffect(() => {
        const initialProcesses = [
            { id: 1, name: 'nginx', pid: 1234, cpu: 12.5, memory: 256, status: 'running', priority: 'high' },
            { id: 2, name: 'postgres', pid: 1235, cpu: 8.3, memory: 512, status: 'running', priority: 'high' },
            { id: 3, name: 'node', pid: 1236, cpu: 15.7, memory: 384, status: 'running', priority: 'medium' },
            { id: 4, name: 'redis', pid: 1237, cpu: 3.2, memory: 128, status: 'running', priority: 'medium' },
            { id: 5, name: 'apache', pid: 1238, cpu: 22.1, memory: 448, status: 'warning', priority: 'high' }
        ];
        setProcesses(initialProcesses);
        setSelectedProcess(initialProcesses[0]);

        // Initial metrics
        const initialMetrics = Array.from({ length: 20 }, (_, i) => ({
            time: `${i}s`,
            cpu: Math.random() * 30 + 10,
            memory: Math.random() * 200 + 100,
            io: Math.random() * 50
        }));
        setMetrics(initialMetrics);

        // Initial alerts
        setAlerts([
            { id: 1, type: 'warning', process: 'apache', message: 'High CPU usage detected', time: '2 min ago' },
            { id: 2, type: 'info', process: 'postgres', message: 'Database optimization recommended', time: '5 min ago' }
        ]);

        // Initial AI insights
        setAiInsights([
            { type: 'anomaly', text: 'Unusual spike in apache process detected at 14:23', severity: 'medium' },
            { type: 'prediction', text: 'postgres memory usage predicted to increase by 15% in next hour', severity: 'low' },
            { type: 'optimization', text: 'Recommend increasing thread pool for node process', severity: 'medium' }
        ]);
    }, []);

    // Real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            // Update processes
            setProcesses(prev => prev.map(p => ({
                ...p,
                cpu: Math.max(0, Math.min(100, p.cpu + (Math.random() - 0.5) * 10)),
                memory: Math.max(0, p.memory + (Math.random() - 0.5) * 50),
                status: p.cpu > 80 ? 'warning' : p.cpu > 95 ? 'critical' : 'running'
            })));

            // Update metrics
            setMetrics(prev => {
                const newMetrics = [...prev.slice(1), {
                    time: `${prev.length}s`,
                    cpu: Math.random() * 30 + 10,
                    memory: Math.random() * 200 + 100,
                    io: Math.random() * 50
                }];
                return newMetrics;
            });

            // Update system stats
            setSystemStats({
                cpu: Math.random() * 40 + 30,
                memory: Math.random() * 30 + 50,
                disk: Math.random() * 20 + 60
            });

            // Randomly add alerts
            if (Math.random() > 0.8) {
                const alertTypes = ['warning', 'info', 'critical'];
                const messages = [
                    'Memory threshold exceeded',
                    'CPU spike detected',
                    'I/O bottleneck identified',
                    'Process optimization suggested'
                ];
                setAlerts(prev => [{
                    id: Date.now(),
                    type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
                    process: 'node',
                    message: messages[Math.floor(Math.random() * messages.length)],
                    time: 'just now'
                }, ...prev.slice(0, 4)]);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'running': return 'text-green-500';
            case 'warning': return 'text-yellow-500';
            case 'critical': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getAlertColor = (type) => {
        switch (type) {
            case 'info': return 'bg-blue-100 border-blue-400 text-blue-700';
            case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
            case 'critical': return 'bg-red-100 border-red-400 text-red-700';
            default: return 'bg-gray-100 border-gray-400 text-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                                AI Process Monitor
                            </h1>
                            <p className="text-slate-400">Real-time system analysis with AI-powered insights</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm">Live Monitoring</span>
                        </div>
                    </div>
                </div>

                {/* System Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Cpu className="text-blue-400" size={24} />
                                <span className="text-slate-300">CPU Usage</span>
                            </div>
                            <span className="text-2xl font-bold">{systemStats.cpu.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${systemStats.cpu}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <HardDrive className="text-purple-400" size={24} />
                                <span className="text-slate-300">Memory</span>
                            </div>
                            <span className="text-2xl font-bold">{systemStats.memory.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${systemStats.memory}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Zap className="text-green-400" size={24} />
                                <span className="text-slate-300">Disk I/O</span>
                            </div>
                            <span className="text-2xl font-bold">{systemStats.disk.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${systemStats.disk}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Process List */}
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-blue-400" />
                            Active Processes
                        </h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {processes.map(process => (
                                <div
                                    key={process.id}
                                    onClick={() => setSelectedProcess(process)}
                                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                                        selectedProcess?.id === process.id
                                            ? 'bg-slate-700 border-2 border-blue-500'
                                            : 'bg-slate-750 border border-slate-600 hover:bg-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold">{process.name}</span>
                                        <span className={`text-xs ${getStatusColor(process.status)}`}>
                      {process.status}
                    </span>
                                    </div>
                                    <div className="text-sm text-slate-400 space-y-1">
                                        <div className="flex justify-between">
                                            <span>PID: {process.pid}</span>
                                            <span>CPU: {process.cpu.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Priority: {process.priority}</span>
                                            <span>Mem: {process.memory}MB</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Real-time Metrics */}
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp size={20} className="text-purple-400" />
                                Real-time Metrics
                            </h2>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={metrics}>
                                    <defs>
                                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#cpuGradient)" />
                                    <Area type="monotone" dataKey="memory" stroke="#a855f7" fillOpacity={1} fill="url(#memGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* AI Insights */}
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Brain size={20} className="text-green-400" />
                                AI-Powered Insights
                            </h2>
                            <div className="space-y-3">
                                {aiInsights.map((insight, idx) => (
                                    <div key={idx} className="bg-slate-750 p-4 rounded-lg border border-slate-600">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 ${
                                                insight.severity === 'high' ? 'text-red-400' :
                                                    insight.severity === 'medium' ? 'text-yellow-400' :
                                                        'text-blue-400'
                                            }`}>
                                                {insight.type === 'anomaly' ? <AlertTriangle size={18} /> :
                                                    insight.type === 'prediction' ? <TrendingUp size={18} /> :
                                                        <CheckCircle size={18} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xs text-slate-400 mb-1 uppercase">
                                                    {insight.type}
                                                </div>
                                                <p className="text-sm text-slate-200">{insight.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Alerts */}
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-yellow-400" />
                                Recent Alerts
                            </h2>
                            <div className="space-y-2">
                                {alerts.map(alert => (
                                    <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-semibold">{alert.process}</span>
                                                <p className="text-sm mt-1">{alert.message}</p>
                                            </div>
                                            <span className="text-xs opacity-75">{alert.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIProcessMonitor;