import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Building,
  User,
  Clock,
  MapPin,
  Bot
} from 'lucide-react';
import { fetchInvestigations, fetchExportReport } from '../api/client';

export default function ReportsPage({ initialCaseId = '' }) {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestigations()
      .then((res) => {
        setCases(res || []);
        const targetId = initialCaseId || (res && res.length > 0 ? res[0].id : null);
        if (targetId) {
          loadReport(targetId);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [initialCaseId]);

  const loadReport = (caseId) => {
    setSelectedCaseId(caseId);
    setLoading(true);
    fetchExportReport(caseId)
      .then((res) => {
        setReport(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_id || 'fraudtrace-report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header Controls (Hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="h-5 w-5 text-teal-400" />
            <span>Formal Suspicious Activity Report (SAR) Dossier</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-ready evidence packet with Isolation Forest telemetry & analyst governance stamp.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Select Case Dropdown */}
          <select
            value={selectedCaseId}
            onChange={(e) => loadReport(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.transaction_id}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print SAR Document</span>
          </button>
        </div>
      </div>

      {/* Printable Formal Report Document */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Compiling regulatory evidence report...
        </div>
      ) : report ? (
        <div className="p-10 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-xl space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-2xl tracking-wider text-slate-950 uppercase font-mono">
                  FRAUDTRACE INTELLIGENCE
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  CONFIDENTIAL
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Financial Crimes Investigation & Compliance Unit • AML Division
              </p>
              <p className="text-[10px] text-teal-800 font-mono font-semibold mt-0.5">
                Platform Architecture & AI Systems: Conceived & Developed by Vansh Raut
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5 font-mono">
              <div className="font-bold text-slate-900">{report.report_id}</div>
              <div className="text-slate-500">
                Generated: {new Date(report.generated_at).toLocaleString()}
              </div>
              <div className="text-slate-500">Case Ref: {report.case_id}</div>
            </div>
          </div>

          {/* Classification & Summary Banner */}
          <div className="p-4 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Case Subject</span>
              <h2 className="text-base font-bold text-slate-900">{report.title}</h2>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Assessed Threat Level</span>
              <span className="text-sm font-bold font-mono px-3 py-1 rounded bg-slate-900 text-white inline-block mt-0.5">
                {report.priority} RISK ({report.risk_score?.toFixed(1)}/100)
              </span>
            </div>
          </div>

          {/* Entity & Transaction Meta Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Target Account Entity */}
            <div className="p-4 rounded-lg border border-slate-300 space-y-2">
              <span className="font-bold text-slate-950 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
                Account Holder Profile
              </span>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Identifier:</span>
                  <span className="font-bold">{report.entity?.user_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-bold">{report.entity?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Home Jurisdiction:</span>
                  <span>{report.entity?.home_city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Profile Tier:</span>
                  <span className="capitalize">{report.entity?.risk_tier}</span>
                </div>
              </div>
            </div>

            {/* Transaction Parameters */}
            <div className="p-4 rounded-lg border border-slate-300 space-y-2">
              <span className="font-bold text-slate-950 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
                Transaction In Question
              </span>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-bold">{report.transaction?.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-slate-950">
                    ₹{report.transaction?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution Channel:</span>
                  <span className="uppercase">{report.transaction?.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary / Merchant:</span>
                  <span>{report.transaction?.merchant || 'Digital Counterparty'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Forensic Observations Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1">
              1. Forensic Observations
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              {report.forensic_observations?.map((obs, idx) => (
                <li key={idx} className="leading-relaxed">
                  {obs}
                </li>
              ))}
            </ul>
          </div>

          {/* Evidence Dossier Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1">
              2. Machine Learning Anomaly Evidence
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              {report.evidence_dossier?.map((ev, idx) => (
                <li key={idx} className="leading-relaxed font-medium">
                  {ev}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Recommendation & Next Steps */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-300 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950">
              3. AI Autonomous Agent Recommendation
            </h3>
            <p className="text-xs text-slate-800 italic leading-relaxed">
              "{report.ai_recommendation}"
            </p>
          </div>

          {/* Human Governance Review Stamp */}
          <div className="border-t-2 border-slate-900 pt-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950 mb-3">
              4. Human Analyst Determination & Compliance Sign-Off
            </h3>
            <div className="p-4 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500">Signatory: </span>
                  <span className="font-bold text-slate-900">{report.human_approval?.analyst_name || 'Vansh Raut (Lead Fraud Analyst)'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Decision Rendered: </span>
                  <span className="font-mono font-bold text-slate-900">{report.human_approval?.decision || report.status}</span>
                </div>
                <div>
                  <span className="text-slate-500">Enforced Action: </span>
                  <span className="font-mono">{report.human_approval?.action_taken || 'PENDING'}</span>
                </div>
                {report.human_approval?.analyst_notes && (
                  <div className="text-slate-700 italic pt-1">
                    "{report.human_approval?.analyst_notes}"
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="h-16 w-36 border-2 border-dashed border-teal-800 rounded flex flex-col items-center justify-center text-[9px] uppercase font-mono text-teal-900 font-bold bg-teal-50/50 p-1">
                  <span>OFFICIAL AUDIT STAMP</span>
                  <span className="text-[8px] text-teal-700">VANSH RAUT • LEAD</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {report.human_approval?.reviewed_at
                    ? new Date(report.human_approval.reviewed_at).toLocaleDateString()
                    : 'AWAITING SIGN-OFF'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 text-xs">
          Select an investigation case to view and export the formal report.
        </div>
      )}
    </div>
  );
}
