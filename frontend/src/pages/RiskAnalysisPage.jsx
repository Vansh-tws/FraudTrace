import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  BarChart2,
  Info,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { fetchRiskAnalytics } from '../api/client';

export default function RiskAnalysisPage({ onSelectTransaction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">Loading Risk Analysis...</span>
        </div>
      </div>
    );
  }

  const scatter = data.scatter_data || [];
  const channelStats = data.channel_stats || [];
  const cityStats = data.city_stats || [];

  const getRiskColor = (level) => {
    switch (level) {
      case 'Critical':
        return '#ef4444';
      case 'High':
        return '#f97316';
      case 'Medium':
        return '#eab308';
      default:
        return '#10b981';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <span>Risk Analysis & Patterns</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Explore what makes transactions look suspicious: high amounts, unusual hours, and channel shifts.
        </p>
      </div>

      {/* Plain English Explanation Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-teal-950/20 to-slate-900 border border-teal-500/20 text-xs text-slate-300">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-sm">How Does the AI Detect Suspicious Transactions?</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Instead of relying only on rigid rules, FraudTrace uses <strong>Machine Learning (Isolation Forest)</strong> to understand normal customer behavior.
              When a transaction has an unusually high amount at <strong>2:30 AM</strong> via an online channel, it isolates rapidly as an anomaly.
              In the chart below, notice how transactions in the top-left (late night + large amounts) are flagged with red and orange risk indicators.
            </p>
          </div>
        </div>
      </div>

      {/* Main Scatter Chart (Amount vs Hour) */}
      <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-teal-400" />
              <span>Transaction Pattern Map (Amount vs Time of Day)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hover over any dot to see transaction details and risk reasons.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1.5 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span>Critical Risk</span>
            </span>
            <span className="flex items-center space-x-1.5 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>High Risk</span>
            </span>
            <span className="flex items-center space-x-1.5 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span>Normal</span>
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="hour"
                name="Hour of Day"
                domain={[0, 23]}
                tickCount={12}
                stroke="#475569"
                fontSize={11}
                unit=":00"
              />
              <YAxis
                type="number"
                dataKey="amount"
                name="Amount (₹)"
                stroke="#475569"
                fontSize={11}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <ZAxis range={[35, 80]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="p-3 bg-[#0a0f1d] border border-slate-700 rounded-lg text-xs shadow-xl space-y-1">
                        <div className="font-mono text-teal-300 font-semibold">{item.transaction_id}</div>
                        <div className="text-white font-mono font-bold">
                          ₹{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-slate-400">
                          Time: <span className="text-slate-200">{item.hour}:00</span> | Channel: <span className="text-slate-200 uppercase">{item.channel}</span>
                        </div>
                        <div className="pt-1">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: `${getRiskColor(item.risk_level)}20`, color: getRiskColor(item.risk_level) }}
                          >
                            {item.risk_level} ({item.risk_score.toFixed(0)}/100)
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Transactions" data={scatter}>
                {scatter.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(entry.risk_level)} opacity={0.8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Channel Breakdown & City Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80">
          <h2 className="text-sm font-semibold text-white mb-1">Suspicious Activity by Payment Channel</h2>
          <p className="text-[11px] text-slate-400 mb-4">
            Percentage of transactions flagged as suspicious for each payment method.
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="channel" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0f1d',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="anomaly_rate" name="Flagged %" radius={[6, 6, 0, 0]}>
                  {channelStats.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.channel === 'web' || entry.channel === 'mobile' ? '#06b6d4' : '#64748b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Breakdown */}
        <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80">
          <h2 className="text-sm font-semibold text-white mb-1">Flagged Transactions by City</h2>
          <p className="text-[11px] text-slate-400 mb-4">
            Count of high-risk transactions across major locations.
          </p>

          <div className="space-y-3 pt-1">
            {cityStats.map((c, i) => {
              const maxVal = cityStats[0]?.high_risk || 1;
              const pct = (c.high_risk / maxVal) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-teal-400" />
                      <span>{c.city}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      <span className="text-red-400 font-bold">{c.high_risk}</span> flagged of {c.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-amber-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
