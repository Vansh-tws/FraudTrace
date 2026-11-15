import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import TransactionDrawer from './components/TransactionDrawer';
import DatasetSelectorModal from './components/DatasetSelectorModal';

import OverviewPage from './pages/OverviewPage';
import TransactionsPage from './pages/TransactionsPage';
import RiskAnalysisPage from './pages/RiskAnalysisPage';
import AiInvestigationPage from './pages/AiInvestigationPage';
import CasesPage from './pages/CasesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

import { fetchOverview, fetchHealth, fetchInvestigations } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingCasesCount, setPendingCasesCount] = useState(0);

  // Onboarding / Dataset Selection Modal State
  // If the user hasn't chosen yet, modal is open on start
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(() => {
    return !localStorage.getItem('fraudtrace_dataset_ready');
  });

  // Drawer & Navigation targets
  const [selectedTxnId, setSelectedTxnId] = useState(null);
  const [targetInvestigationTxn, setTargetInvestigationTxn] = useState('');
  const [targetCaseId, setTargetCaseId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchHealth(), fetchInvestigations('PENDING')])
      .then(([ov, health, pendingCases]) => {
        setOverviewData(ov);
        setSystemHealth(health);
        setPendingCasesCount(pendingCases ? pendingCases.length : 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load initial data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSampleDataset = () => {
    localStorage.setItem('fraudtrace_dataset_ready', 'true');
    setIsDatasetModalOpen(false);
    loadData();
    setActiveTab('overview');
  };

  const handleUploadSuccess = () => {
    localStorage.setItem('fraudtrace_dataset_ready', 'true');
    setIsDatasetModalOpen(false);
    loadData();
    setActiveTab('overview');
  };

  const handleStartInvestigation = (txnId) => {
    setSelectedTxnId(null);
    setTargetInvestigationTxn(txnId);
    setActiveTab('ai_investigation');
  };

  const handleViewCase = (caseId) => {
    setSelectedTxnId(null);
    setTargetCaseId(caseId);
    setActiveTab('cases');
  };

  const handleNavigateToReport = (caseId) => {
    setTargetCaseId(caseId);
    setActiveTab('reports');
  };

  const handleQuickSearch = (query) => {
    if (!query) return;
    const clean = query.trim();
    if (clean.toUpperCase().startsWith('TXN-')) {
      setSelectedTxnId(clean.toUpperCase());
    } else {
      setSearchQuery(clean);
      setActiveTab('transactions');
    }
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCasesCount={pendingCasesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onQuickSearch={handleQuickSearch}
          onOpenDatasetModal={() => setIsDatasetModalOpen(true)}
          systemHealth={systemHealth}
        />

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#070b14] via-[#090e1a] to-[#070b14]">
          {activeTab === 'overview' && (
            <OverviewPage
              data={overviewData}
              loading={loading}
              onSelectTransaction={setSelectedTxnId}
              onStartInvestigation={handleStartInvestigation}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsPage
              onSelectTransaction={setSelectedTxnId}
              onStartInvestigation={handleStartInvestigation}
              initialSearch={searchQuery}
            />
          )}

          {activeTab === 'risk_analysis' && (
            <RiskAnalysisPage onSelectTransaction={setSelectedTxnId} />
          )}

          {activeTab === 'ai_investigation' && (
            <AiInvestigationPage
              initialTransactionId={targetInvestigationTxn}
              initialCaseId={targetCaseId}
              onSelectTransaction={setSelectedTxnId}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'cases' && (
            <CasesPage
              onSelectTransaction={setSelectedTxnId}
              onNavigateToReport={handleNavigateToReport}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage initialCaseId={targetCaseId} />
          )}

          {activeTab === 'settings' && (
            <SettingsPage onDataReload={loadData} />
          )}
        </main>
      </div>

      {/* Slide-Over Transaction Details Drawer */}
      {selectedTxnId && (
        <TransactionDrawer
          transactionId={selectedTxnId}
          onClose={() => setSelectedTxnId(null)}
          onStartInvestigation={handleStartInvestigation}
          onViewCase={handleViewCase}
        />
      )}

      {/* Onboarding & Dataset Switcher Modal */}
      <DatasetSelectorModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        onSelectSample={handleSelectSampleDataset}
        onUploadSuccess={handleUploadSuccess}
        canClose={!!overviewData}
      />
    </div>
  );
}
