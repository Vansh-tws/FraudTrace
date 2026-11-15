import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Database,
  Sparkles,
  Upload,
  UserCheck,
  ShieldAlert
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
      <form onSubmit={handleSearchSubmit} className="relative w-72 md:w-88">
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
        {/* Creator Ownership Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs">
          <Sparkles className="h-3 w-3 text-teal-400" />
          <span className="text-slate-400">Created by:</span>
          <span className="font-bold text-teal-300">Vansh Raut</span>
        </div>

        {/* Switch / Upload Dataset Button */}
        <button
          onClick={onOpenDatasetModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-semibold border border-teal-500/30 transition cursor-pointer"
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

        {/* Analyst Profile Pill - Vansh Raut */}
        <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-xs font-bold text-slate-950 shadow-md ring-2 ring-teal-500/30 font-mono">
            VR
          </div>
          <div className="hidden md:block text-left text-xs">
            <div className="font-bold text-slate-100 leading-tight flex items-center space-x-1">
              <span>Vansh Raut</span>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
            </div>
            <div className="text-[10px] text-teal-400 font-medium">Lead Fraud Analyst & Creator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
