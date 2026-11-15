import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Database,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Navbar({
  onQuickSearch,
  onSeedData,
  isSeeding,
  systemHealth,
  onOpenSettings
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
      <form onSubmit={handleSearchSubmit} className="relative w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Transaction ID (TXN-...), User ID, or City..."
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
        />
      </form>

      {/* Right Control Bar */}
      <div className="flex items-center space-x-3">
        {/* Dataset Counter Pill */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Database className="h-3.5 w-3.5 text-teal-400" />
          <span>Transactions:</span>
          <span className="font-mono font-semibold text-teal-300">{totalTxns.toLocaleString()}</span>
        </div>

        {/* MCP Tools Pill */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
          <span>MCP Tools:</span>
          <span className="font-mono font-bold text-teal-200">{mcpCount} Active</span>
        </div>

        {/* Quick Seed / Reset Button */}
        <button
          onClick={onSeedData}
          disabled={isSeeding}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
          title="Seed realistic synthetic banking data"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-300 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
        </button>

        {/* Analyst Profile Pill */}
        <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            FA
          </div>
          <div className="hidden lg:block text-left text-xs">
            <div className="font-medium text-slate-200 leading-tight">Fraud Operations</div>
            <div className="text-[10px] text-teal-400">Level 3 Compliance</div>
          </div>
        </div>
      </div>
    </header>
  );
}
