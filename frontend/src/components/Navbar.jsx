import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Database,
  Sparkles,
  Upload,
  UserCheck
} from 'lucide-react';

export default function Navbar({
  onQuickSearch,
  onOpenDatasetModal,
  systemHealth
}) {
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onQuickSearch) {
      onQuickSearch(query);
    }
  };

  const totalTxns = systemHealth?.database?.transactions || 0;
  const mcpCount = systemHealth?.mcp_tools_available || 6;

  return (
    <header className="h-16 bg-[#0a0f1d]/90 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between z-10 sticky top-0">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 md:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Transaction ID (TXN-...), User, or City..."
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
        />
      </form>

      {/* Right Control Bar */}
      <div className="flex items-center space-x-3">
        {/* Switch / Upload Dataset Button */}
        <button
          onClick={onOpenDatasetModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30 transition cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 text-teal-400" />
          <span>Switch Dataset</span>
        </button>

        {/* Dataset Counter Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span>Transactions:</span>
          <span className="font-mono font-semibold text-white">{totalTxns.toLocaleString()}</span>
        </div>

        {/* AI Tools Status */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
          <span>AI Tools:</span>
          <span className="font-mono text-teal-300 font-semibold">{mcpCount} Active</span>
        </div>

        {/* Analyst Profile Pill */}
        <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            FA
          </div>
          <div className="hidden md:block text-left text-xs">
            <div className="font-medium text-slate-200 leading-tight">Fraud Analyst</div>
            <div className="text-[10px] text-teal-400">Risk Reviewer</div>
          </div>
        </div>
      </div>
    </header>
  );
}
