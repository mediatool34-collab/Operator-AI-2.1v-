export interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  executionTimeMs: number;
  responseSize: number;
  failedValidation: boolean;
  error?: string;
  payload?: any;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  type: 'FRONTEND_CRASH' | 'BACKEND_CRASH' | 'API_FAILURE' | 'RENDER_ERROR' | 'AI_FAILURE';
  message: string;
  stack?: string;
  context?: any;
  resolved: boolean;
}

export interface QueueLog {
  id: string;
  timestamp: string;
  jobId: string;
  jobName: string;
  status: 'COMPLETED' | 'FAILED' | 'RETRIED';
  executionTimeMs?: number;
  retryCount: number;
  reason?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  recordsSynced: number;
  error?: string;
}

class LoggerService {
  private static instance: LoggerService;
  
  // In-memory bounded arrays to prevent memory leaks
  private apiLogs: ApiLog[] = [];
  private errorLogs: ErrorLog[] = [];
  private queueLogs: QueueLog[] = [];
  private syncLogs: SyncLog[] = [];
  private maxLogs = 1000;
  
  public devMode = process.env.DEBUG_MODE === 'true';

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public setDevMode(enabled: boolean) {
    this.devMode = enabled;
    if (this.devMode) {
      console.log('[Logger] Dev Mode ENABLED. Verbose tracing active.');
    }
  }

  private pushBounded<T>(array: T[], item: T) {
    array.unshift(item);
    if (array.length > this.maxLogs) {
      array.pop();
    }
  }

  public logApiRequest(log: Omit<ApiLog, 'id' | 'timestamp'>) {
    const entry: ApiLog = {
      ...log,
      id: `api_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.pushBounded(this.apiLogs, entry);
    if (this.devMode && log.statusCode >= 400) {
      console.error(`[API Logger] Failed Request: ${log.method} ${log.endpoint} - ${log.statusCode}`, log.error);
    }
  }

  public logError(log: Omit<ErrorLog, 'id' | 'timestamp' | 'resolved'>) {
    const entry: ErrorLog = {
      ...log,
      id: `err_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      resolved: false
    };
    this.pushBounded(this.errorLogs, entry);
    console.error(`[System Error] ${log.type}: ${log.message}`);
    if (this.devMode && log.stack) {
      console.error(log.stack);
    }
    
    // Auto Bug Detection - emit alert or mark feature degraded
    // In a real DB we would save this to the DB here as well
  }

  public logQueueEvent(log: Omit<QueueLog, 'id' | 'timestamp'>) {
    const entry: QueueLog = {
      ...log,
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.pushBounded(this.queueLogs, entry);
    if (log.status === 'FAILED') {
      console.error(`[Queue Failed] Job ${log.jobId} (${log.jobName}): ${log.reason}`);
    } else if (this.devMode) {
      console.log(`[Queue] Job ${log.jobId} (${log.jobName}) ${log.status}`);
    }
  }

  public logSyncEvent(log: Omit<SyncLog, 'id' | 'timestamp'>) {
    const entry: SyncLog = {
      ...log,
      id: `sync_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.pushBounded(this.syncLogs, entry);
    if (log.status === 'FAILED') {
      console.error(`[Sync Failed] ${log.platform}: ${log.error}`);
    }
  }

  // Auto Fix Strategy - resolving issues
  public resolveError(id: string) {
    const error = this.errorLogs.find(e => e.id === id);
    if (error) {
      error.resolved = true;
      if (this.devMode) console.log(`[Auto Fix] Resolved error ${id}`);
    }
  }

  // Getters for Debug Console
  public getLogs() {
    return {
      apiLogs: this.apiLogs,
      errorLogs: this.errorLogs,
      queueLogs: this.queueLogs,
      syncLogs: this.syncLogs,
      summary: {
        totalErrors: this.errorLogs.length,
        unresolvedErrors: this.errorLogs.filter(e => !e.resolved).length,
        failedJobs: this.queueLogs.filter(q => q.status === 'FAILED').length,
        devMode: this.devMode
      }
    };
  }
}

export const logger = LoggerService.getInstance();
