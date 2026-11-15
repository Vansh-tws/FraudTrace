import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Bot,
  User,
  MapPin,
  Clock,
  CreditCard,
  Building,
  CheckCircle2,
  TrendingUp,
  FileSearch
} from 'lucide-react';
import { fetchTransactionDetail } from '../api/client';

export default function TransactionDrawer({
  transactionId,
  onClose,
  onStartInvestigation,
  onViewCase
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    setLoading(true);
    fetchTransactionDetail(transactionId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [transactionId]);

  if (!transactionId) return null;

  const txn = data?.transaction;
  const cust = data?.customer;
  const ra = data?.risk_assessment;
  const riskScore = txn?.risk_score ?? ra?.risk_score ?? 0;
  const riskLevel = txn?.risk_level ?? ra?.risk_level ?? 'Low';

  const getRiskBadge = (level) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'High':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const typicalMax = cust?.typical_max_amount || 5000;
  const txnAmount = txn?.amount || 0;
  const deviationRatio = round2(txnAmount / Math.max(typicalMax, 1));

  function round2(num) {
    return Math.round(num * 10) / 10;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0b101d] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">{transactionId}</div>
              <h2 className="text-sm font-semibold text-white">Transaction Forensic Dossier</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mr-2"></div>
            Loading transaction telemetry...
          </div>
        ) : txn ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Amount Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Transaction Amount</span>
                <span className="text-2xl font-bold font-mono text-white">
                  ₹{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Type: <span className="text-slate-200 capitalize font-medium">{txn.transaction_type.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskBadge(riskLevel)}`}>
                  {riskLevel} Risk ({riskScore.toFixed(1)}/100)
                </span>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  Channel: <span className="text-teal-300 font-semibold uppercase">{txn.channel}</span>
                </div>
              </div>
            </div>

            {/* Existing Investigation Alert */}
            {data?.has_investigation && (
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Bot className="h-4 w-4 text-teal-400" />
                  <div>
                    <span className="font-semibold text-teal-200 text-xs block">AI Investigation On Record</span>
                    <span className="text-[11px] text-teal-400/80 font-mono">Case: {data.investigation_id} ({data.investigation_status})</span>
                  </div>
                </div>
                <button
                  onClick={() => onViewCase(data.investigation_id)}
                  className="px-3 py-1 bg-teal-500 text-slate-950 font-semibold rounded text-xs hover:bg-teal-400 transition"
                >
                  View Case
                </button>
              </div>
            )}

            {/* Behavioral Baseline Comparison */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <User className="h-4 w-4 text-teal-400" />
                  <span>Customer Behavioral Baseline</span>
                </span>
                <span className="text-[11px] font-mono text-teal-400">{cust?.user_id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-500 block">Customer Name</span>
                  <span className="font-medium text-slate-200">{cust?.name}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-500 block">Home City</span>
                  <span className="font-medium text-slate-200 flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{cust?.city}</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-500 block">Typical Range</span>
                  <span className="font-mono text-slate-200">
                    ₹{cust?.typical_min_amount?.toLocaleString()} — ₹{cust?.typical_max_amount?.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-500 block">Preferred Channel</span>
                  <span className="font-medium text-slate-200 uppercase font-mono">{cust?.typical_channel}</span>
                </div>
              </div>

              {/* Baseline Deviation Meter */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Deviation from typical ceiling:</span>
                  <span className={`font-mono font-semibold ${deviationRatio > 3 ? 'text-red-400' : 'text-slate-200'}`}>
                    {deviationRatio}x normal max
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      deviationRatio > 3 ? 'bg-red-500' : deviationRatio > 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (deviationRatio / 5) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Model & Anomaly Indicators */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>Isolation Forest Indicators</span>
                </span>
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  Raw Anomaly: {ra?.anomaly_score ? ra.anomaly_score.toFixed(4) : 'N/A'}
                </span>
              </div>

              <div className="space-y-1.5">
                {(txn.risk_reasons && txn.risk_reasons.length > 0) ? (
                  txn.risk_reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-[11px] text-slate-300">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-2 text-[11px] text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>No primary anomaly flags isolated.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Parameters */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-200 block mb-2">Execution Metadata</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                <div>
                  <span className="text-slate-500 block">Merchant:</span>
                  <span>{txn.merchant || 'Standard Gateway'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">City / Origin:</span>
                  <span>{txn.city}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Execution Hour:</span>
                  <span>{txn.hour.toString().padStart(2, '0')}:00 UTC</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lifecycle Status:</span>
                  <span className="uppercase text-teal-400 font-semibold">{txn.status}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-slate-400 text-xs">Transaction could not be found.</div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center space-x-3">
          <button
            onClick={() => onStartInvestigation(transactionId)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 transition cursor-pointer"
          >
            <Bot className="h-4 w-4" />
            <span>Investigate with AI Agent (MCP)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
