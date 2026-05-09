import { Activity, AlertOctagon, Terminal, Server, RotateCcw, Cpu } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface LogsData {
  apiLogs: any[];
  errorLogs: any[];
  queueLogs: any[];
  syncLogs: any[];
  summary: {
    totalErrors: number;
    unresolvedErrors: number;
    failedJobs: number;
    devMode: boolean;
  };
}

export function AdminDebugConsole() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [activeTab, setActiveTab] = useState<'errors' | 'api' | 'queue'>('errors');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/debug/logs', {
        headers: { 'x-user-id': user.uid }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleDevMode = async () => {
    if (!logs) return;
    const newState = !logs.summary.devMode;
    try {
      await fetch('/api/debug/mode', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({ enabled: newState })
      });
      fetchLogs();
    } catch (err) {
      console.error('Failed to toggle dev mode', err);
    }
  };

  if (loading && !logs) return <div className="p-8 text-white">Loading Debug Console...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-400" />
            System Debug Console
          </h1>
          <p className="text-gray-400 mt-1">Real-time observability and self-healing diagnostics</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDevMode}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${
              logs?.summary.devMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800 text-gray-400 border border-white/10'
            }`}
          >
            <Cpu className="w-4 h-4" />
            {logs?.summary.devMode ? 'Dev Mode ACTIVE' : 'Enable Dev Mode'}
          </button>
          
          <button onClick={fetchLogs} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-white">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-red-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <AlertOctagon className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="text-sm text-gray-400">System Errors</div>
            <div className="text-2xl font-bold text-white">{logs?.summary.unresolvedErrors || 0} Unresolved</div>
          </div>
        </div>
        <div className="bg-[#111827] border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-sm text-gray-400">API Requests</div>
            <div className="text-2xl font-bold text-white">{logs?.apiLogs.length || 0} Traced</div>
          </div>
        </div>
        <div className="bg-[#111827] border border-green-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg">
            <Server className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <div className="text-sm text-gray-400">Failed Jobs</div>
            <div className="text-2xl font-bold text-white">{logs?.summary.failedJobs || 0}</div>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 p-4 border-b border-white/5">
          {(['errors', 'api', 'queue'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab} Logs
            </button>
          ))}
        </div>
        
        <div className="p-4 overflow-auto max-h-[600px] font-mono text-sm">
          {activeTab === 'errors' && (
            <div className="space-y-2">
              {logs?.errorLogs.map(log => (
                <div key={log.id} className="p-3 bg-[#0B0F19] rounded-lg border border-red-500/10">
                  <div className="flex justify-between text-red-400 mb-1">
                    <span>[{log.type}] {log.timestamp}</span>
                    <span>{log.resolved ? 'RESOLVED' : 'ACTIVE'}</span>
                  </div>
                  <div className="text-white">{log.message}</div>
                </div>
              ))}
              {logs?.errorLogs.length === 0 && <div className="text-gray-500">No system errors detected.</div>}
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-2">
              {logs?.apiLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 bg-[#0B0F19] rounded-lg border border-white/5">
                  <div className="flex items-center gap-4">
                    <span className={`w-16 font-bold ${log.statusCode >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                      {log.statusCode}
                    </span>
                    <span className="text-blue-400 w-16">{log.method}</span>
                    <span className="text-gray-300">{log.endpoint}</span>
                  </div>
                  <div className="text-gray-500">{log.executionTimeMs}ms</div>
                </div>
              ))}
               {logs?.apiLogs.length === 0 && <div className="text-gray-500">No API logs available.</div>}
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="space-y-2">
              {logs?.queueLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 bg-[#0B0F19] rounded-lg border border-white/5">
                  <div className="flex items-center gap-4">
                    <span className={`w-24 font-bold ${log.status === 'FAILED' ? 'text-red-400' : 'text-green-400'}`}>
                      {log.status}
                    </span>
                    <span className="text-blue-400">{log.jobName}</span>
                    <span className="text-gray-400 text-xs">{log.jobId}</span>
                  </div>
                  {log.reason && <div className="text-red-300 text-xs max-w-md truncate ml-4">{log.reason}</div>}
                </div>
              ))}
               {logs?.queueLogs.length === 0 && <div className="text-gray-500">No Queue logs available.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
