"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SystemHealthCard;
// System health monitoring component
const react_1 = __importStar(require("react"));
function SystemHealthCard({ refreshInterval = 10000 }) {
    const [health, setHealth] = (0, react_1.useState)({
        status: 'healthy',
        responseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0
    });
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [lastCheck, setLastCheck] = (0, react_1.useState)(new Date());
    const fetchHealthData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/analytics/live');
            if (response.ok) {
                const data = await response.json();
                setHealth(data.serverHealth);
                setLastCheck(new Date());
            }
        }
        catch (error) {
            console.error('Error fetching health data:', error);
            setHealth(prev => (Object.assign(Object.assign({}, prev), { status: 'critical' })));
        }
        finally {
            setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchHealthData();
        const interval = setInterval(fetchHealthData, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy':
                return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>);
            case 'warning':
                return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>);
            case 'critical':
                return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>);
            default:
                return null;
        }
    };
    const getUsageColor = (usage) => {
        if (usage < 50)
            return 'bg-green-500';
        if (usage < 80)
            return 'bg-yellow-500';
        return 'bg-red-500';
    };
    const formatTime = (date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    return (<div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <p className="text-sm text-gray-600 mt-1">Server performance monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            {isLoading ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>) : (<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                {getStatusIcon(health.status)}
                <span className="ml-1 capitalize">{health.status}</span>
              </span>)}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">
              {health.responseTime}ms
            </div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {health.activeConnections}
            </div>
            <div className="text-sm text-gray-600">Active Connections</div>
          </div>
        </div>

        {/* Usage meters */}
        <div className="space-y-4">
          {/* Memory Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Memory Usage</span>
              <span className="text-sm text-gray-500">{health.memoryUsage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(health.memoryUsage)}`} style={{ width: `${Math.min(100, health.memoryUsage)}%` }}/>
            </div>
          </div>

          {/* CPU Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">CPU Usage</span>
              <span className="text-sm text-gray-500">{health.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(health.cpuUsage)}`} style={{ width: `${Math.min(100, health.cpuUsage)}%` }}/>
            </div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${health.responseTime < 100 ? 'bg-green-400' :
            health.responseTime < 500 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
              <div className="text-xs text-gray-500">Latency</div>
            </div>
            <div>
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${health.memoryUsage < 70 ? 'bg-green-400' :
            health.memoryUsage < 90 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
              <div className="text-xs text-gray-500">Memory</div>
            </div>
            <div>
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${health.cpuUsage < 60 ? 'bg-green-400' :
            health.cpuUsage < 80 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
              <div className="text-xs text-gray-500">CPU</div>
            </div>
          </div>
        </div>

        {/* Last check time */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">
            Last checked: {formatTime(lastCheck)}
          </div>
          <button onClick={fetchHealthData} disabled={isLoading} className="mt-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>
    </div>);
}
