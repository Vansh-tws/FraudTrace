/**
 * FraudTrace API Client
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchOverview() {
  const res = await fetch(`${API_BASE}/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview analytics');
  return res.json();
}

export async function fetchTransactions(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.page_size) query.set('page_size', params.page_size);
  if (params.risk_level) query.set('risk_level', params.risk_level);
  if (params.channel) query.set('channel', params.channel);
  if (params.search) query.set('search', params.search);
  if (params.min_amount) query.set('min_amount', params.min_amount);
  if (params.max_amount) query.set('max_amount', params.max_amount);
  if (params.is_anomaly_only) query.set('is_anomaly_only', 'true');

  const res = await fetch(`${API_BASE}/transactions?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchTransactionDetail(id) {
  const res = await fetch(`${API_BASE}/transactions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch transaction ${id}`);
  return res.json();
}

export async function fetchRiskAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/risk`);
  if (!res.ok) throw new Error('Failed to fetch risk analytics');
  return res.json();
}

export async function runInvestigation(transactionId, instruction = null) {
  const res = await fetch(`${API_BASE}/investigate/${transactionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_id: transactionId,
      custom_instruction: instruction,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to trigger investigation');
  }
  return res.json();
}

export async function fetchInvestigations(status = null) {
  const url = status ? `${API_BASE}/investigations?status=${status}` : `${API_BASE}/investigations`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch investigations');
  return res.json();
}

export async function fetchInvestigationDetail(caseId) {
  const res = await fetch(`${API_BASE}/investigations/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch case ${caseId}`);
  return res.json();
}

export async function submitCaseApproval(caseId, data) {
  const res = await fetch(`${API_BASE}/investigations/${caseId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit approval');
  return res.json();
}

export async function chatCaseAgent(caseId, message) {
  const res = await fetch(`${API_BASE}/investigations/${caseId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Failed to communicate with investigation agent');
  return res.json();
}

export async function fetchExportReport(caseId) {
  const res = await fetch(`${API_BASE}/reports/${caseId}/export`);
  if (!res.ok) throw new Error('Failed to export case report');
  return res.json();
}

export async function fetchMcpTools() {
  const res = await fetch(`${API_BASE}/mcp/tools`);
  if (!res.ok) throw new Error('Failed to fetch MCP tools');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function seedDatabase() {
  const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to seed database');
  return res.json();
}

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload-csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload dataset');
  }
  return res.json();
}
