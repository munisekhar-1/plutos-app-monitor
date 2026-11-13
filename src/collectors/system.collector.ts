import os from 'os';
import { SystemMetrics, ProcessLifecycleEntry } from '../types';

export class BoundedRingBuffer<T> {
  private buffer: T[];
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = [];
  }

  public push(item: T): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  public toArray(): T[] {
    return [...this.buffer];
  }

  public size(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
  }
}

export class SystemCollector {
  private instanceId: string;
  private lastCpuUsage: { user: number; system: number; time: number } | null = null;
  private currentCpuPercent: number = 0;
  private eventLoopLagMs: number = 0;
  private eventLoopTimer: NodeJS.Timeout | null = null;
  private lifecycleLogs: ProcessLifecycleEntry[] = [];

  constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.recordLifecycleEvent('start', `PID ${process.pid} initialized`);
    this.startEventLoopMeasurement();
  }

  private startEventLoopMeasurement(): void {
    let lastTime = Date.now();
    this.eventLoopTimer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      // Expect 500ms intervals, excess is event loop lag
      this.eventLoopLagMs = Math.max(0, delta - 500);
      lastTime = now;
    }, 500);
    if (this.eventLoopTimer.unref) {
      this.eventLoopTimer.unref();
    }
  }

  public recordLifecycleEvent(event: 'start' | 'restart' | 'shutdown', reason?: string): void {
    this.lifecycleLogs.push({
      timestamp: Date.now(),
      instanceId: this.instanceId,
      pid: process.pid,
      event,
      reason,
    });
    if (this.lifecycleLogs.length > 50) {
      this.lifecycleLogs.shift();
    }
  }

  public getLifecycleLogs(): ProcessLifecycleEntry[] {
    return [...this.lifecycleLogs];
  }

  public collect(activeRequestsCount: number, currentRps: number): SystemMetrics {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // CPU Usage Calculation
    const cpuUsage = process.cpuUsage();
    const now = Date.now();
    if (this.lastCpuUsage) {
      const timeDelta = (now - this.lastCpuUsage.time) * 1000; // in microseconds
      const userDelta = cpuUsage.user - this.lastCpuUsage.user;
      const systemDelta = cpuUsage.system - this.lastCpuUsage.system;
      const totalCpuDelta = userDelta + systemDelta;
      const numCpus = os.cpus().length || 1;
      this.currentCpuPercent = Math.min(100, Math.max(0, parseFloat(((totalCpuDelta / (timeDelta * numCpus)) * 100).toFixed(2))));
    }
    this.lastCpuUsage = { user: cpuUsage.user, system: cpuUsage.system, time: now };

    return {
      timestamp: now,
      instanceId: this.instanceId,
      cpuPercent: this.currentCpuPercent,
      ramUsageBytes: usedMem,
      ramTotalBytes: totalMem,
      ramPercent: parseFloat(((usedMem / totalMem) * 100).toFixed(2)),
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      eventLoopLagMs: this.eventLoopLagMs,
      uptimeSeconds: Math.floor(process.uptime()),
      activeRequests: activeRequestsCount,
      rps: currentRps,
    };
  }

  public destroy(): void {
    if (this.eventLoopTimer) {
      clearInterval(this.eventLoopTimer);
    }
  }
}
