const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to reach backend health endpoint');
  return res.json();
}

export async function fetchNetworks() {
  const res = await fetch(`${API_BASE}/networks`);
  if (!res.ok) throw new Error('Failed to fetch networks');
  return res.json();
}

export async function fetchNetwork(id) {
  const res = await fetch(`${API_BASE}/networks/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch network ${id}`);
  return res.json();
}

export async function createNetwork(data) {
  const res = await fetch(`${API_BASE}/networks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network creation failed' }));
    throw new Error(err.detail || 'Network creation failed');
  }
  return res.json();
}

export async function updateNetwork(id, data) {
  const res = await fetch(`${API_BASE}/networks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network update failed' }));
    throw new Error(err.detail || 'Network update failed');
  }
  return res.json();
}

export async function deleteNetwork(id) {
  const res = await fetch(`${API_BASE}/networks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete network ${id}`);
  return res.json();
}

export async function resetSampleNetwork() {
  const res = await fetch(`${API_BASE}/networks/reset-sample`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reload sample network');
  return res.json();
}

export async function runDiagnostics(payload) {
  const res = await fetch(`${API_BASE}/diagnostics/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Diagnostics analysis failed' }));
    throw new Error(err.detail || 'Diagnostics analysis failed');
  }
  return res.json();
}

export async function fetchDiagnostics() {
  const res = await fetch(`${API_BASE}/diagnostics`);
  if (!res.ok) throw new Error('Failed to fetch diagnostics');
  return res.json();
}

export async function fetchDiagnostic(id) {
  const res = await fetch(`${API_BASE}/diagnostics/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch report ${id}`);
  return res.json();
}

export async function deleteDiagnostic(id) {
  const res = await fetch(`${API_BASE}/diagnostics/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete diagnostic session ${id}`);
  return res.json();
}

export async function resolveDiagnostic(id, isResolved, notes) {
  const res = await fetch(`${API_BASE}/diagnostics/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_resolved: isResolved, resolution_notes: notes }),
  });
  if (!res.ok) throw new Error(`Failed to update resolution status for ${id}`);
  return res.json();
}

export async function compareDiagnostics(beforeId, afterId) {
  const res = await fetch(`${API_BASE}/diagnostics/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ before_session_id: beforeId, after_session_id: afterId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Session comparison failed' }));
    throw new Error(err.detail || 'Session comparison failed');
  }
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchGuideTopics() {
  const res = await fetch(`${API_BASE}/guide`);
  if (!res.ok) throw new Error('Failed to fetch troubleshooting guide');
  return res.json();
}

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch preset scenarios');
  return res.json();
}
