import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Bot,
  ArrowUpRight,
  Eye,
  Clock,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function OverviewPage({
  data,
  loading,
  onSelectTransaction,
  onStartInvestigation,
  onNavigateToTab
}) {
  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">Aggregating telemetry & forensic models...</span>
        </div>
      </div>
    );
  }

  const kpis = data.kpis || {};
  const riskDist = data.risk_distribution || [];
  const hourly = data.hourly_trends || [];
  const highRiskFeed = data.high_risk_feed || [];

  const getRiskBadge = (level) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'High':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Medium':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <span>Transaction Intelligence Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time unsupervised anomaly detection, behavioral deviations & autonomous agent triage.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateToTab('ai_investigation')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-500/20 transition cursor-pointer"
          >
            <Bot className="h-4 w-4 text-teal-400" />
            <span>Open AI Agent Console</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyzed */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Analyzed</span>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-white">
              {(kpis.total_transactions || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span className="text-blue-400 font-medium mr-1.5 font-mono">
              ₹{(kpis.total_volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span>gross volume processed</span>
          </div>
        </div>

        {/* Suspicious Detected */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Anomalies Detected</span>
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-red-400">
              {(kpis.anomalies_detected || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span className="text-red-400 font-semibold mr-1 font-mono">{kpis.anomaly_rate}%</span>
            <span>unsupervised isolation rate</span>
          </div>
        </div>

        {/* High Risk Exposure */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">At-Risk Volume</span>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-300">
              ₹{(kpis.flagged_volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span className="text-slate-300 font-medium mr-1">High & Critical</span>
            <span>risk tier exposure</span>
          </div>
        </div>

        {/* Active Investigations */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Human Review</span>
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-teal-300">
              {kpis.open_investigations || 0}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span className="text-emerald-400 font-medium mr-1">{kpis.resolved_investigations || 0}</span>
            <span>audited & closed</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 24-Hour Volume & Anomaly Timeline (Area Chart) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Activity className="h-4 w-4 text-teal-400" />
                <span>24-Hour Transaction Flow & Anomaly Timeline</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hourly transaction volume vs unsupervised anomaly spikes. Notice late-night surges (01:00 - 05:00).
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0f1d',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="total_count"
                  name="Transactions"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#volumeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="anomaly_count"
                  name="Anomalies"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#anomalyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut */}
        <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Risk Distribution</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Percentile-calibrated threat tiers.
            </p>
          </div>

          <div className="h-44 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0f1d',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            {riskDist.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-900/40">
                <div className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }}></span>
                  <span className="text-slate-400 text-[11px]">{r.level}</span>
                </div>
                <span className="font-mono font-semibold text-slate-200 text-[11px]">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High-Risk Transaction Live Feed */}
      <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Prioritized High-Risk Transactions</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ranked by Isolation Forest anomaly distance and behavioral baseline deviation.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
          >
            <span>View All Records</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 pl-2">Transaction ID</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Channel / City</th>
                <th className="pb-3">Execution Time</th>
                <th className="pb-3">Risk Assessment</th>
                <th className="pb-3">Forensic Reason</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {highRiskFeed.map((txn) => {
                const reasons = txn.risk_reasons || [];
                return (
                  <tr key={txn.transaction_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 pl-2 font-mono text-teal-300 font-medium">
                      <button
                        onClick={() => onSelectTransaction(txn.transaction_id)}
                        className="hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{txn.transaction_id}</span>
                      </button>
                    </td>
                    <td className="py-3 text-slate-300 font-mono text-[11px]">{txn.user_id}</td>
                    <td className="py-3 font-mono font-bold text-white text-xs">
                      ₹{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-slate-300">
                      <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 mr-1.5 text-slate-300">
                        {txn.channel}
                      </span>
                      <span className="text-slate-400 text-[11px]">{txn.city}</span>
                    </td>
                    <td className="py-3 text-slate-400 text-[11px] font-mono">
                      {txn.hour.toString().padStart(2, '0')}:00 UTC
                    </td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRiskBadge(txn.risk_level)}`}>
                        {txn.risk_level} ({txn.risk_score?.toFixed(1) ?? '95+'})
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 max-w-xs truncate text-[11px]">
                      {reasons[0] || 'Unusual combination of feature characteristics'}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectTransaction(txn.transaction_id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                          title="Quick Inspect"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onStartInvestigation(txn.transaction_id)}
                          className="px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-semibold text-[11px] border border-teal-500/20 transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Bot className="h-3 w-3" />
                          <span>Investigate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
