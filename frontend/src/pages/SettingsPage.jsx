import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Upload,
  Cpu,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Code2,
  Sliders,
  Key,
  Layers,
  Terminal
} from 'lucide-react';
import {
  fetchSettings,
  updateSettings,
  seedDatabase,
  uploadDataset,
  fetchMcpTools
} from '../api/client';

export default function SettingsPage({ onDataReload }) {
  const [settings, setSettings] = useState(null);
  const [mcpTools, setMcpTools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [aiProvider, setAiProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [contamination, setContamination] = useState(0.05);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Seeding & upload state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchMcpTools()])
      .then(([sData, mcpData]) => {
        setSettings(sData);
        setAiProvider(sData.ai_provider || 'gemini');
        setModelName(sData.model_name || 'gemini-2.5-flash');
        setContamination(sData.contamination_rate || 0.05);
        setMcpTools(mcpData.tools || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    updateSettings({
      ai_provider: aiProvider,
      gemini_api_key: geminiKey || undefined,
      openai_api_key: openaiKey || undefined,
      model_name: modelName,
      isolation_forest_contamination: parseFloat(contamination),
    })
      .then((res) => {
        setSaving(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      })
      .catch((err) => {
        console.error(err);
        setSaving(false);
      });
  };

  const handleSeedDatabase = () => {
    setSeeding(true);
    setSeedResult(null);
    seedDatabase()
      .then((res) => {
        setSeeding(false);
        setSeedResult(`Database refreshed! Loaded ${res.transactions_count} transactions across ${res.customers_count} accounts with ${res.anomalies_detected} detected anomalies.`);
        if (onDataReload) onDataReload();
      })
      .catch((err) => {
        setSeeding(false);
        setSeedResult(`Error: ${err.message}`);
      });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    uploadDataset(file)
      .then((res) => {
        setUploading(false);
        setUploadResult(`Uploaded successfully! Analyzed ${res.imported_transactions} records and detected ${res.anomalies_detected} anomalies.`);
        if (onDataReload) onDataReload();
      })
      .catch((err) => {
        setUploading(false);
        setUploadResult(`Upload failed: ${err.message}`);
      });
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <span>System Settings & Data Engine</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure AI reasoning providers, dataset ingestion, Isolation Forest hyperparameters, and inspect MCP tools.
        </p>
      </div>

      {/* Dataset Management Section */}
      <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Database className="h-4 w-4 text-teal-400" />
          <span>Dataset Management & Ingestion</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Synthetic Seeding Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="font-semibold text-xs text-slate-200 block">Generate Synthetic Banking Dataset</span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Generates 2,000 realistic transactions linked to 120 customer profiles, complete with baseline spend metrics,
                nocturnal bursts, and cross-city anomalies.
              </p>
            </div>
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-teal-400 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Generating & Detecting...' : 'Generate 2,000 Transactions'}</span>
            </button>
          </div>

          {/* Custom CSV Upload Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="font-semibold text-xs text-slate-200 block">Upload Custom Transaction CSV</span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Upload your own CSV with columns <code className="text-teal-300">amount</code>, <code className="text-teal-300">transaction_time</code>,{' '}
                <code className="text-teal-300">channel</code>, <code className="text-teal-300">city</code> to run live anomaly detection.
              </p>
            </div>
            <label className="w-full py-2 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold text-xs border border-teal-500/30 flex items-center justify-center space-x-2 transition cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Analyzing CSV...' : 'Select CSV File'}</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {seedResult && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{seedResult}</span>
          </div>
        )}
        {uploadResult && (
          <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{uploadResult}</span>
          </div>
        )}
      </div>

      {/* AI Investigation Model & Provider Settings */}
      <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Cpu className="h-4 w-4 text-teal-400" />
          <span>AI Investigation Agent Configuration</span>
        </h2>

        {savedSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Configuration parameters successfully updated.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Provider Select */}
          <div>
            <label className="text-slate-400 block mb-1">Investigation Intelligence Engine</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
            >
              <option value="gemini">Google Gemini API (Recommended)</option>
              <option value="anthropic">Anthropic Claude (Sonnet / Haiku)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="expert_engine">Deterministic Forensic Reasoning Engine (Offline / Local)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              The agent uses MCP tools to investigate regardless of provider.
            </span>
          </div>

          {/* Model Name */}
          <div>
            <label className="text-slate-400 block mb-1">Model Name / Checkpoint</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. gemini-2.5-flash or claude-3-7-sonnet"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono text-xs"
            />
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="text-slate-400 block mb-1 flex items-center justify-between">
              <span>Gemini API Key</span>
              {settings?.has_gemini_key && (
                <span className="text-[10px] text-emerald-400 font-mono">Key Configured</span>
              )}
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={settings?.has_gemini_key ? '••••••••••••••••' : 'Enter GEMINI_API_KEY...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono text-xs"
            />
          </div>

          {/* Contamination Slider */}
          <div>
            <label className="text-slate-400 block mb-1 flex items-center justify-between">
              <span>Isolation Forest Contamination:</span>
              <span className="font-mono text-teal-300 font-bold">{(contamination * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0.01"
              max="0.15"
              step="0.01"
              value={contamination}
              onChange={(e) => setContamination(e.target.value)}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              Expected proportion of outliers in the financial transaction pool.
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="py-2.5 px-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>

      {/* Model Context Protocol (MCP) Tool Registry Viewer */}
      <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Layers className="h-4 w-4 text-teal-400" />
            <span>Exposed Model Context Protocol (MCP) Tools ({mcpTools.length})</span>
          </h2>
          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Python MCP SDK 2.x
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The AI investigation agent does not make accusations without tools. It dynamically discovers and executes
          these standardized tools to gather factual observations and customer baselines:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {mcpTools.map((tool, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-teal-300 font-semibold text-[11px]">{tool.name}()</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Tool
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">{tool.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
