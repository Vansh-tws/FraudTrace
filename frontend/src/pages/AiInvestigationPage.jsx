import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Terminal,
  Clock,
  ArrowRight,
  User,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { runInvestigation, fetchInvestigationDetail, chatCaseAgent, fetchInvestigations } from '../api/client';

export default function AiInvestigationPage({
  initialTransactionId = '',
  initialCaseId = '',
  onSelectTransaction,
  onNavigateToTab
}) {
  const [transactionId, setTransactionId] = useState(initialTransactionId);
  const [investigating, setInvestigating] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [error, setError] = useState(null);

  // Chat console
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Expanded tool logs
  const [expandedLogs, setExpandedLogs] = useState({});
  const [showTechnicalSteps, setShowTechnicalSteps] = useState(true);

  // Quick select recent cases
  const [recentCases, setRecentCases] = useState([]);

  useEffect(() => {
    fetchInvestigations()
      .then((cases) => {
        setRecentCases(cases || []);
        if (initialCaseId) {
          loadCase(initialCaseId);
        } else if (initialTransactionId) {
          setTransactionId(initialTransactionId);
          startInvestigation(initialTransactionId);
        } else if (cases && cases.length > 0) {
          loadCase(cases[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const loadCase = (caseId) => {
    setInvestigating(true);
    fetchInvestigationDetail(caseId)
      .then((res) => {
        setCurrentResult(res);
        setTransactionId(res.transaction_id);
        setMessages([
          {
            role: 'agent',
            text: `Forensic report for **${res.transaction_id}** is loaded. Risk Score: **${res.risk_score?.toFixed(0)}/100** (${res.priority}). You can ask me any question about the customer, past spending habits, or why this was flagged.`,
          },
        ]);
        setInvestigating(false);
      })
      .catch((err) => {
        setError(err.message);
        setInvestigating(false);
      });
  };

  const startInvestigation = (targetTxnId) => {
    const idToUse = targetTxnId || transactionId;
    if (!idToUse.trim()) return;

    setInvestigating(true);
    setError(null);

    runInvestigation(idToUse.trim())
      .then((res) => {
        setCurrentResult(res);
        setMessages([
          {
            role: 'agent',
            text: `Investigation for transaction **${res.transaction_id}** complete. Assigned Case ID: **${res.case_id}**. Assessed risk is **${res.risk_score?.toFixed(0)}/100** (${res.risk_level}). What would you like to verify?`,
          },
        ]);
        setInvestigating(false);
      })
      .catch((err) => {
        setError(err.message);
        setInvestigating(false);
      });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentResult?.case_id || chatLoading) return;

    const userText = chatInput.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    chatCaseAgent(currentResult.case_id, userText)
      .then((res) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            text: res.answer,
            tool_used: res.tool_used,
          },
        ]);
        setChatLoading(false);
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            text: `Error from agent: ${err.message}`,
          },
        ]);
        setChatLoading(false);
      });
  };

  const toggleLog = (idx) => {
    setExpandedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const executionTrace = currentResult?.execution_trace || [];
  const observations = currentResult?.observations || [];
  const evidence = currentResult?.evidence || [];
  const nextSteps = currentResult?.next_steps || [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Launcher */}
      <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <Bot className="h-5 w-5" />
              </div>
              <span>AI Investigation Assistant</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              The AI agent automatically examines suspicious transactions, checks customer history, and prepares evidence reports.
            </p>
          </div>

          {/* Transaction Input & Button */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TXN-12345 or select below..."
              className="w-64 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={() => startInvestigation(transactionId)}
              disabled={investigating || !transactionId}
              className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className={`h-3.5 w-3.5 ${investigating ? 'animate-spin' : ''}`} />
              <span>{investigating ? 'Investigating...' : 'Investigate'}</span>
            </button>
          </div>
        </div>

        {/* Quick Pick Pills */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center space-x-2 text-xs overflow-x-auto">
          <span className="text-slate-500 text-[11px] shrink-0">Flagged Cases to Inspect:</span>
          {recentCases.slice(0, 5).map((c) => (
            <button
              key={c.id}
              onClick={() => loadCase(c.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition shrink-0 cursor-pointer ${
                currentResult?.case_id === c.id || currentResult?.id === c.id
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {c.transaction_id} ({c.risk_score?.toFixed(0)}/100)
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Investigation Steps (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-teal-400" />
                <span>AI Steps & Tools Used</span>
              </h2>
              <span className="text-[10px] font-mono text-teal-300 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                {executionTrace.length} Steps
              </span>
            </div>

            {investigating ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                <div>Examining customer history and running anomaly models...</div>
              </div>
            ) : executionTrace.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Select a transaction above and click "Investigate" to see the AI's step-by-step thinking.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {executionTrace.map((log, idx) => {
                  const isTool = log.action_type === 'TOOL_CALL';
                  const isConclusion = log.action_type === 'CONCLUSION';
                  const isExpanded = !!expandedLogs[idx];

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isTool
                          ? 'bg-slate-900/80 border-teal-500/30'
                          : isConclusion
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="h-5 w-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[10px] font-bold">
                            {log.step_index || idx + 1}
                          </span>
                          <span className="text-slate-200 font-semibold text-xs">
                            {isTool ? `Checked: ${log.tool_name}` : isConclusion ? 'Summary Report' : 'Thinking'}
                          </span>
                        </div>

                        {log.tool_output && (
                          <button
                            onClick={() => toggleLog(idx)}
                            className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center space-x-0.5 cursor-pointer"
                          >
                            <span>Details</span>
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                      </div>

                      <div className="mt-2 text-slate-300 text-[11px] leading-relaxed">
                        {log.reasoning}
                      </div>

                      {/* Expandable Tool Input / Output */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2 text-[10px] font-mono">
                          {log.tool_output && (
                            <div>
                              <span className="text-slate-500 block">Data Found:</span>
                              <pre className="p-2 rounded bg-slate-950 text-teal-300/90 overflow-x-auto">
                                {JSON.stringify(log.tool_output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Evidence-Based Report & Chat (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Report Card */}
          <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">
                  Case ID: {currentResult?.case_id || currentResult?.id || 'PENDING'}
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  AI Investigation Report
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Risk Assessment:</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                  {currentResult?.risk_level || 'High'} Risk ({currentResult?.risk_score?.toFixed(0) || '85'}/100)
                </span>
              </div>
            </div>

            {/* Plain English Summary */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-semibold text-teal-400 block mb-1 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Summary (What happened?)</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {currentResult?.ai_summary || 'Run an investigation above to see findings.'}
              </p>
            </div>

            {/* Observations & Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Observations */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <span className="font-semibold text-slate-200 block text-xs">Transaction Observations</span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  {observations.map((obs, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0 mt-1.5"></span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Evidence */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <span className="font-semibold text-slate-200 block text-xs">Why Was It Flagged?</span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  {evidence.map((ev, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendation & Next Steps */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-200 block text-xs">Recommended Action for Analyst</span>
              <p className="text-xs text-slate-300 italic">
                "{currentResult?.recommendation || 'Awaiting investigation...'}"
              </p>

              {nextSteps.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">What to verify next:</span>
                  <div className="space-y-1">
                    {nextSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-[11px] text-slate-300">
                        <span className="h-4 w-4 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Human in the loop redirect */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                A human analyst must review and approve before any account restriction.
              </span>
              <button
                onClick={() => onNavigateToTab('cases')}
                className="px-3.5 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition cursor-pointer flex items-center space-x-1"
              >
                <span>Go to Review Board</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Chat Console */}
          <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-teal-400" />
                <span>Ask the AI Investigator Questions</span>
              </h2>
              <span className="text-[11px] text-slate-500">
                Ask about customer history, why it was flagged, or recommended actions
              </span>
            </div>

            {/* Chat Messages Log */}
            <div className="h-44 overflow-y-auto space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl ${
                      m.role === 'user'
                        ? 'bg-teal-500/20 text-teal-200 border border-teal-500/30'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/80'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 mb-1">
                      {m.role === 'user' ? 'You (Analyst)' : 'AI Investigator'}
                    </div>
                    <div className="text-[11px] whitespace-pre-line leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 text-xs flex items-center space-x-2">
                    <div className="animate-spin h-3.5 w-3.5 border border-teal-500 border-t-transparent rounded-full"></div>
                    <span>Checking transaction data...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask e.g.: 'Why was this flagged?', 'What is normal for this customer?', 'What should I do?'"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
