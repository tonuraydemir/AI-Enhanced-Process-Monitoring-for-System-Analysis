const si = require('systeminformation');

class ProcessMonitor {
    constructor() {
        this.metricsHistory = new Map();
        this.maxHistorySize = 100;
        this.lastUpdate = null;
    }

    async getProcesses() {
        try {
            const { list } = await si.processes();

            const processes = list
                .filter(p => p.cpu > 0 || p.mem_rss > 0)
                .slice(0, 50)
                .map(p => ({
                    id: p.pid,
                    name: p.name || 'unknown',
                    pid: p.pid,
                    cpu: p.cpu || 0,
                    memory: Math.round(p.mem_rss / 1024 / 1024) || 0,
                    status: this.determineStatus(p),
                    priority: p.priority || 0,
                    threads: p.threads || 1,
                    user: p.user || 'system',
                    command: p.command || '',
                    parentPid: p.parentPid || 0,
                    started: p.started || new Date().toISOString(),
                    state: p.state || 'running',
                    ioRead: 0,
                    ioWrite: 0,
                    networkSent: 0,
                    networkReceived: 0
                }));

            this.lastUpdate = new Date();
            return processes;
        } catch (error) {
            console.error('Error getting processes:', error);
            return [];
        }
    }

    determineStatus(proc) {
        if (proc.state === 'sleeping') return 'idle';
        if (proc.state === 'stopped') return 'stopped';
        if (proc.cpu > 80) return 'critical';
        if (proc.cpu > 50) return 'warning';
        return 'running';
    }

    async getSystemStats() {
        try {
            const [cpu, mem, disk, network] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize(),
                si.networkStats()
            ]);

            return {
                cpu: {
                    usage: cpu.currentLoad || 0,
                    cores: cpu.cpus?.length || 1,
                    temperature: cpu.cpus?.[0]?.temperature || 0
                },
                memory: {
                    total: mem.total || 0,
                    used: mem.used || 0,
                    usage: mem.total ? (mem.used / mem.total) * 100 : 0
                },
                disk: {
                    usage: disk[0]?.use || 0
                },
                network: {
                    sent: network[0]?.tx_sec || 0,
                    received: network[0]?.rx_sec || 0
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting system stats:', error);
            return null;
        }
    }
}

module.exports = new ProcessMonitor();
