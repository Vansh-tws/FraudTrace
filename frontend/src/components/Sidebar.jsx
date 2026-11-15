import React from 'react';
import {
  ShieldAlert,
  Activity,
  CreditCard,
  BarChart3,
  Bot,
  FolderCheck,
  FileText,
  Settings,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, pendingCasesCount = 0 }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity, badge: null },
    { id: 'transactions', label: 'Transactions', icon: CreditCard, badge: null },
    { id: 'risk_analysis', label: 'Risk Analysis', icon: BarChart3, badge: null },
    { id: 'ai_investigation', label: 'AI Investigation', icon: Bot, badge: 'MCP Active', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    { id: 'cases', label: 'Cases & Review', icon: FolderCheck, badge: pendingCasesCount > 0 ? `${pendingCasesCount} Pending` : null, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'reports', label: 'Evidence Reports', icon: FileText, badge: null },
    { id: 'settings', label: 'Settings & Data', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg text-white tracking-tight">FraudTrace</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">v1.0</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">AML & Forensic Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Platform Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/15 to-cyan-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="flex items-center space-x-1.5 text-[11px] font-medium">
            <Cpu className="h-3.5 w-3.5 text-teal-400" />
            <span>Detection Engine</span>
          </span>
          <span className="flex items-center space-x-1 text-emerald-400 text-[10px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Online</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Algorithm:</span>
            <span className="font-mono text-slate-300 text-[10px]">Isolation Forest</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Agent Protocol:</span>
            <span className="font-mono text-teal-300 text-[10px]">MCP Python 2.x</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
