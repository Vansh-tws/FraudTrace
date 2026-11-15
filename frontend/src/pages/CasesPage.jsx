import React, { useState, useEffect } from 'react';
import {
  FolderCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  FileText,
  Filter,
  Check,
  Ban,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { fetchInvestigations, fetchInvestigationDetail, submitCaseApproval } from '../api/client';

export default function CasesPage({ onSelectTransaction, onNavigateToReport }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Approval Form State
  const [decision, setDecision] = useState('APPROVED_FRAUD');
  const [analystName, setAnalystName] = useState('Priya Sharma (Senior Fraud Specialist)');
  const [analystNotes, setAnalystNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('ACCOUNT_RESTRICTED');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadCases = () => {
    setLoading(true);
    fetchInvestigations(statusFilter || undefined)
      .then((res) => {
        setCases(res || []);
        if (res && res.length > 0 && !selectedCaseId) {
          selectCase(res[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const selectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setDetailLoading(true);
    setSuccessMsg(null);
    fetchInvestigationDetail(caseId)
      .then((res) => {
        setCaseDetail(res);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setDetailLoading(false);
      });
  };

  const handleApprovalSubmit = (e) => {
    e.preventDefault();
    if (!selectedCaseId || submitting) return;

    setSubmitting(true);
    submitCaseApproval(selectedCaseId, {
      decision,
      analyst_name: analystName,
      analyst_notes: analystNotes || 'Decision rendered following forensic observation and customer verification review.',
      action_taken: actionTaken,
    })
      .then((res) => {
        setSubmitting(false);
        setSuccessMsg(`Decision '${decision}' recorded successfully.`);
        loadCases();
        selectCase(selectedCaseId);
      })
      .catch((err) => {
        console.error(err);
        setSubmitting(false);
      });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED_FRAUD':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'REJECTED_LEGITIMATE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'ESCALATED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <span>Human Approval System & Governance Board</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review autonomous AI forensic recommendations, record human determinations, and enforce policy actions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              statusFilter === '' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Cases
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'PENDING' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED_FRAUD')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'APPROVED_FRAUD' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Confirmed Fraud
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED_LEGITIMATE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'REJECTED_LEGITIMATE' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Legitimate
          </button>
        </div>
      </div>

      {/* Two Column Layout: Cases List & Active Review Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List (Left 5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-[#0d1322] border border-slate-800/80">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Cases Queue ({cases.length})
            </h2>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No cases found for selected status.
              </div>
            ) : (
              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {cases.map((c) => {
                  const isSelected = selectedCaseId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectCase(c.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-500/15 to-cyan-500/5 border-teal-500/40 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-teal-300 font-semibold text-xs">{c.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(c.status)}`}>
                          {c.status}
                        </span>
                      </div>

                      <div className="text-xs text-white font-medium truncate mb-2">{c.title}</div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>TXN: {c.transaction_id}</span>
                        <span className="text-amber-300 font-semibold">{c.risk_score?.toFixed(1)}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Review Board & Action Form (Right 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {detailLoading ? (
            <div className="p-12 rounded-2xl bg-[#0d1322] border border-slate-800 text-center text-slate-400 text-xs">
              <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading case audit file...
            </div>
          ) : caseDetail ? (
            <div className="space-y-6">
              {/* Case Header Dossier */}
              <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{caseDetail.id}</span>
                    <h2 className="text-lg font-bold text-white">{caseDetail.title}</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(caseDetail.status)}`}>
                      {caseDetail.status}
                    </span>
                    <button
                      onClick={() => onNavigateToReport(caseDetail.id)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-teal-400" />
                      <span>Full SAR Report</span>
                    </button>
                  </div>
                </div>

                {/* AI Summary Banner */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-[11px] font-semibold text-teal-400 block mb-1">
                    AI Autonomous Agent Finding:
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{caseDetail.ai_summary}</p>
                </div>

                {/* Recommendation */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 text-xs">
                  <span className="text-[11px] font-semibold text-amber-300 block mb-0.5">
                    Recommended Policy Action:
                  </span>
                  <p className="text-slate-200 italic text-[11px]">"{caseDetail.recommendation}"</p>
                </div>

                {/* Human Approval Form */}
                <form onSubmit={handleApprovalSubmit} className="pt-4 border-t border-slate-800 space-y-4">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Analyst Human-in-the-Loop Determination
                  </h3>

                  {successMsg && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Decision Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                        decision === 'APPROVED_FRAUD'
                          ? 'bg-red-500/20 border-red-500 text-red-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs">Approve Fraud</span>
                        <input
                          type="radio"
                          name="decision"
                          value="APPROVED_FRAUD"
                          checked={decision === 'APPROVED_FRAUD'}
                          onChange={() => {
                            setDecision('APPROVED_FRAUD');
                            setActionTaken('ACCOUNT_RESTRICTED');
                          }}
                          className="text-red-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">Confirm unauthorized activity & block account.</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                        decision === 'REJECTED_LEGITIMATE'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs">Mark Legitimate</span>
                        <input
                          type="radio"
                          name="decision"
                          value="REJECTED_LEGITIMATE"
                          checked={decision === 'REJECTED_LEGITIMATE'}
                          onChange={() => {
                            setDecision('REJECTED_LEGITIMATE');
                            setActionTaken('WHITELISTED');
                          }}
                          className="text-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">False positive confirmed via customer SMS/call.</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                        decision === 'ESCALATED'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs">Escalate to Legal</span>
                        <input
                          type="radio"
                          name="decision"
                          value="ESCALATED"
                          checked={decision === 'ESCALATED'}
                          onChange={() => {
                            setDecision('ESCALATED');
                            setActionTaken('SAR_FILED');
                          }}
                          className="text-amber-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">Complex AML velocity ring; file formal SAR.</span>
                    </label>
                  </div>

                  {/* Policy Action Selector & Analyst Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Enforced Action</label>
                      <select
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                      >
                        <option value="ACCOUNT_RESTRICTED">ACCOUNT_RESTRICTED (Freeze digital transfer limits)</option>
                        <option value="CARD_FROZEN">CARD_FROZEN (Block active payment card)</option>
                        <option value="WHITELISTED">WHITELISTED (Authorize transaction & dismiss flag)</option>
                        <option value="SAR_FILED">SAR_FILED (Submit Suspicious Activity Report to FIU)</option>
                        <option value="ESCALATED_LEGAL">ESCALATED_LEGAL (Refer to AML compliance counsel)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Reviewing Compliance Officer</label>
                      <input
                        type="text"
                        value={analystName}
                        onChange={(e) => setAnalystName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Notes Textarea */}
                  <div>
                    <label className="text-slate-400 block mb-1 text-xs">Mandatory Audit Justification & Notes</label>
                    <textarea
                      rows={2}
                      value={analystNotes}
                      onChange={(e) => setAnalystNotes(e.target.value)}
                      placeholder="Detail findings from customer outreach, phone verification, IP geolocation checks, or baseline justification..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-600"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Recording Human Approval...' : 'Sign Off & Record Human Determination'}
                  </button>
                </form>
              </div>

              {/* Historical Approvals Audit Trail */}
              {caseDetail.approvals_history && caseDetail.approvals_history.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Governance Audit Trail
                  </h3>
                  <div className="space-y-2">
                    {caseDetail.approvals_history.map((appr, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(appr.decision)}`}>
                            {appr.decision}
                          </span>
                          <span className="text-slate-500 text-[10px] font-mono">
                            {new Date(appr.reviewed_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-300 font-medium text-[11px]">
                          By: <span className="text-white">{appr.analyst_name}</span> ({appr.action_taken})
                        </div>
                        <p className="text-slate-400 text-[11px] italic">"{appr.analyst_notes}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[#0d1322] border border-slate-800 text-center text-slate-500 text-xs">
              Select a case from the queue to review AI recommendations and render a decision.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
