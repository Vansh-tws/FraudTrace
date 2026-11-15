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
  X
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
      // Still proceed even if seed fails because DB might already have data
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
      setUploadSuccessMsg(`Successfully loaded ${res.imported_transactions} transactions with ${res.anomalies_detected} flagged patterns.`);
      setTimeout(() => {
        onUploadSuccess();
      }, 1200);
    } catch (err) {
      setUploading(false);
      setUploadError(err.message || 'Failed to process CSV file. Ensure columns: amount, channel, city, transaction_time.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0b101e] border border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6">
        {/* Close Button if user is just switching dataset */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-teal-500/20 mb-1">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome to FraudTrace
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Intelligent financial transaction monitoring and AI investigation platform. Choose how you would like to begin:
          </p>
        </div>

        {/* Option Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Sample Data */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-[#0e1424] border border-slate-800 hover:border-teal-500/50 transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 w-fit">
                <Database className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Use Sample Banking Data
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Explore immediately with <strong>2,000 realistic transactions</strong>, 120 customer profiles, and pre-flagged suspicious midnight and burst activity.
              </p>
            </div>

            <button
              onClick={handleChooseSample}
              disabled={seeding}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{seeding ? 'Preparing Data...' : 'Explore Sample Data'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Card 2: Upload Own CSV */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-[#0e1424] border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit">
                <Upload className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Upload Your Own CSV
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload your transactions spreadsheet. We'll automatically validate records and run AI anomaly detection.
              </p>
              <div className="text-[10px] text-slate-500 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 font-mono">
                Required columns: amount, channel, city, transaction_time
              </div>
            </div>

            <label className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
              <span>{uploading ? 'Analyzing CSV...' : 'Select CSV File'}</span>
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
      </div>
    </div>
  );
}
