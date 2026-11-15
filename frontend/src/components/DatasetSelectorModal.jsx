import React, { useState } from 'react';
import {
  Database,
  Upload,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Zap,
  Cpu,
  UserCheck,
  Lock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { uploadDataset, seedDatabase } from '../api/client';

export default function DatasetSelectorModal({
  isOpen,
  onClose,
  onSelectSample,
  onUploadSuccess,
  canClose = false
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);
  const [seeding, setSeeding] = useState(false);

  if (!isOpen) return null;

  const handleChooseSample = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      setSeeding(false);
      onSelectSample();
    } catch (err) {
      console.error(err);
      setSeeding(false);
      onSelectSample();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const res = await uploadDataset(file);
      setUploading(false);
      setUploadSuccessMsg(`Successfully analyzed ${res.imported_transactions.toLocaleString()} transactions with ${res.anomalies_detected} flagged patterns.`);
      setTimeout(() => {
        onUploadSuccess();
      }, 1000);
    } catch (err) {
      setUploading(false);
      setUploadError(err.message || 'Failed to process CSV file. Ensure columns: amount, channel, city, transaction_time.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050811]/90 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      {/* Background glow meshes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[250px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-3xl bg-gradient-to-b from-[#0c1222] via-[#090e1a] to-[#070b14] border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl relative space-y-8 my-auto ring-1 ring-slate-800">
        {/* Close Button if user is switching */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Creator Ownership & Brand Header */}
        <div className="text-center space-y-3.5">
          {/* Ownership Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span>Idea & Development by</span>
            <span className="text-white font-bold bg-teal-500/20 px-2 py-0.5 rounded-md border border-teal-500/30">Vansh Raut</span>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-teal-500/25 ring-2 ring-teal-400/20">
              <ShieldCheck className="h-7 w-7 text-slate-950 font-bold" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                FraudTrace
              </h1>
              <span className="text-[11px] text-teal-400 font-mono uppercase tracking-wider font-semibold">
                Autonomous AML Forensics & Agent Platform
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Move beyond opaque alerts. FraudTrace combines <strong className="text-white">Unsupervised Isolation Forest ML</strong> with an <strong className="text-white">Autonomous AI Agent</strong> to explain why transactions are flagged and what analysts should investigate next.
          </p>

          {/* Key Metric Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-1 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <Cpu className="h-3 w-3 text-teal-400" />
              <span>Isolation Forest</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <Layers className="h-3 w-3 text-cyan-400" />
              <span>6 Python MCP Tools</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <UserCheck className="h-3 w-3 text-emerald-400" />
              <span>Lead Analyst: Vansh Raut</span>
            </span>
          </div>
        </div>

        {/* Action Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Card 1: Sample Dataset (Recommended) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0d1424] border border-teal-500/40 hover:border-teal-400 transition-all flex flex-col justify-between space-y-5 shadow-lg shadow-teal-500/5 group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-teal-500 text-slate-950 text-[10px] uppercase font-extrabold px-3 py-1 rounded-bl-xl tracking-wider">
              Recommended
            </div>

            <div className="space-y-3 pt-1">
              <div className="h-11 w-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Database className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                  Explore Pre-Loaded Bank Data
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Start instantly with a curated set of <strong>2,000 transactions</strong> across 120 customer accounts.
                </p>
              </div>

              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  <span>Individual customer baseline spend ranges</span>
                </li>
                <li className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  <span>Pre-flagged midnight surges & cross-city hops</span>
                </li>
                <li className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  <span>Pre-analyzed AI investigation cases ready to review</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleChooseSample}
              disabled={seeding}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/25 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{seeding ? 'Generating & Analyzing...' : 'Explore with Sample Data'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Card 2: Custom CSV Upload */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0d1424] border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-5 shadow-lg group">
            <div className="space-y-3 pt-1">
              <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Upload className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Upload Custom Dataset (CSV)
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Analyze your own transaction spreadsheet using the unsupervised Isolation Forest engine.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
                <span className="text-slate-400 block font-medium">Expected CSV Columns:</span>
                <div className="font-mono text-teal-300 text-[10px] flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">amount</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">channel</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">city</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">transaction_time</span>
                </div>
              </div>
            </div>

            <label className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
              <span>{uploading ? 'Analyzing with AI Model...' : 'Select CSV to Upload'}</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Status Alerts */}
        {uploadSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Bottom Architectural Credits Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Created by <strong className="text-white">Vansh Raut</strong></span>
          </div>
          <div className="text-slate-500 font-mono text-[10px]">
            Financial Intelligence & Machine Learning Architecture
          </div>
        </div>
      </div>
    </div>
  );
}
