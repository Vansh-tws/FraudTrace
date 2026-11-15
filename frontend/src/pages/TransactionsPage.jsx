import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CreditCard,
  Bot,
  Eye,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { fetchTransactions } from '../api/client';

export default function TransactionsPage({
  onSelectTransaction,
  onStartInvestigation,
  initialSearch = ''
}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [riskLevel, setRiskLevel] = useState('');
  const [channel, setChannel] = useState('');
  const [isAnomalyOnly, setIsAnomalyOnly] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const loadData = () => {
    setLoading(true);
    fetchTransactions({
      page,
      page_size: 25,
      risk_level: riskLevel || undefined,
      channel: channel || undefined,
      search: search || undefined,
      min_amount: minAmount ? parseFloat(minAmount) : undefined,
      max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
      is_anomaly_only: isAnomalyOnly,
    })
      .then((res) => {
        setTransactions(res.items || []);
        setTotalPages(res.total_pages || 1);
        setTotalItems(res.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [page, riskLevel, channel, isAnomalyOnly]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transaction Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search and filter through recorded financial transactions and their real-time anomaly scores.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>Found</span>
          <span className="font-mono font-semibold text-teal-300">{totalItems.toLocaleString()}</span>
          <span>transactions</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0d1322] border border-slate-800/80">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by TXN, USR, City, or Merchant..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Risk Level Dropdown */}
          <div>
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Risk Tiers</option>
              <option value="Critical">Critical Risk</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          {/* Channel Dropdown */}
          <div>
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Channels</option>
              <option value="mobile">Mobile App</option>
              <option value="web">Online Web</option>
              <option value="POS">Point of Sale (POS)</option>
              <option value="ATM">Automated Teller (ATM)</option>
            </select>
          </div>

          {/* Anomaly Only Toggle */}
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <input
              type="checkbox"
              id="anomalyOnly"
              checked={isAnomalyOnly}
              onChange={(e) => {
                setIsAnomalyOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0"
            />
            <label htmlFor="anomalyOnly" className="text-slate-300 text-xs cursor-pointer select-none">
              Anomalies Only
            </label>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              className="w-full h-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition cursor-pointer flex items-center justify-center space-x-1"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-400" />
              <span>Apply Filter</span>
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Data Table */}
      <div className="rounded-2xl bg-[#0d1322] border border-slate-800/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Channel</th>
                <th className="py-3 px-3">City / Merchant</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Risk Assessment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center space-x-2">
                      <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                      <span>Querying database ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No transactions found matching the specified criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  return (
                    <tr
                      key={txn.transaction_id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-teal-300">
                        <button
                          onClick={() => onSelectTransaction(txn.transaction_id)}
                          className="hover:underline cursor-pointer"
                        >
                          {txn.transaction_id}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">{txn.user_id}</td>
                      <td className="py-3 px-3 font-mono font-bold text-white text-xs">
                        ₹{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-300 capitalize text-[11px]">
                        {txn.transaction_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {txn.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 text-[11px]">
                        <div>{txn.city}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{txn.merchant}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {txn.hour.toString().padStart(2, '0')}:00 UTC
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRiskBadge(txn.risk_level)}`}>
                          {txn.risk_level} ({txn.risk_score?.toFixed(1) ?? 'N/A'})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectTransaction(txn.transaction_id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                            title="Inspect details"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-slate-200 font-mono">{page}</span> of{' '}
            <span className="font-semibold text-slate-200 font-mono">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
