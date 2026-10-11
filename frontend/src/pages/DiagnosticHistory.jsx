import React, { useState, useEffect } from 'react';
import {
  History,
  GitCompare,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';
import {
  fetchDiagnostics,
  deleteDiagnostic,
  compareDiagnostics,
  resolveDiagnostic
} from '../api';

export default function DiagnosticHistory({
  setActiveTab,
  setSelectedReportId,
  compareBeforeId,
  setCompareBeforeId,
  compareAfterId,
  setCompareAfterId
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compare Modal
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [beforeId, setBeforeId] = useState(compareBeforeId || '');
  const [afterId, setAfterId] = useState(compareAfterId || '');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Resolve Modal
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await fetchDiagnostics();
      setSessions(data);
      if (data.length >= 2) {
        if (!beforeId) setBeforeId(data[1].id);
        if (!afterId) setAfterId(data[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diagnostic report permanently?')) return;
    try {
      await deleteDiagnostic(id);
      loadSessions();
    } catch (err) {
      alert(`Error deleting report: ${err.message}`);
    }
  };

  const handleOpenCompare = () => {
    if (sessions.length < 2) {
      alert('You need at least two diagnostic sessions to perform comparative verification.');
      return;
    }
    setShowCompareModal(true);
    setComparisonResult(null);
  };

  const handleExecuteCompare = async () => {
    if (!beforeId || !afterId) {
      alert('Please select both a baseline session and a follow-up session.');
      return;
    }
    if (beforeId === afterId) {
      alert('Please choose two distinct sessions to compare before-and-after results.');
      return;
    }
    try {
      setComparing(true);
      const result = await compareDiagnostics(beforeId, afterId);
      setComparisonResult(result);
    } catch (err) {
      alert(`Comparison error: ${err.message}`);
    } finally {
      setComparing(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!resolveTarget) return;
    try {
      await resolveDiagnostic(resolveTarget.id, true, resolutionNotes);
      setResolveTarget(null);
      loadSessions();
    } catch (err) {
      alert(`Error updating resolution: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <History size={26} color="#3b82f6" />
            Diagnostic Session History & Comparative Verification
          </h1>
          <p className="page-desc">
            Review past Packet Tracer diagnostic runs, compare before-and-after sessions, and verify recovery
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadSessions}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenCompare}>
            <GitCompare size={14} /> Compare Two Sessions
          </button>
        </div>
      </div>

      {/* History Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} color="#60a5fa" />
            Saved Diagnostic Sessions ({sessions.length})
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Timestamp</th>
                  <th>Network Profile</th>
                  <th>Endpoints</th>
                  <th>Diagnosis</th>
                  <th>Confidence</th>
                  <th>Recovery</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((item) => {
                  let badgeClass = 'badge-insufficient';
                  if (item.overall_status === 'HEALTHY') badgeClass = 'badge-healthy';
                  else if (item.overall_status === 'FAULT DETECTED') badgeClass = 'badge-fault';
                  else if (item.overall_status === 'POSSIBLE FAULT') badgeClass = 'badge-possible';

                  return (
                    <tr key={item.id}>
                      <td className="mono" style={{ color: '#38bdf8', fontSize: '0.82rem' }}>
                        {item.session_id}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.84rem' }}>
                        {item.network_name}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.source_device}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                        <span style={{ fontWeight: 600 }}>{item.destination_device}</span>
                      </td>
                      <td>
                        <div style={{ marginBottom: '4px' }}>
                          <span className={`badge ${badgeClass}`}>{item.overall_status}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.likely_cause}
                        </div>
                      </td>
                      <td>
                        <span className={`confidence-meter confidence-${(item.confidence || 'low').toLowerCase()}`}>
                          {item.confidence}
                        </span>
                      </td>
                      <td>
                        {item.is_resolved ? (
                          <span className="badge badge-healthy" title={item.resolution_notes}>
                            Resolved
                          </span>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                            onClick={() => {
                              setResolveTarget(item);
                              setResolutionNotes(item.resolution_notes || '');
                            }}
                          >
                            Mark Fixed
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="View Full Report"
                            onClick={() => {
                              setSelectedReportId(item.id);
                              setActiveTab('report');
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Delete Session"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No diagnostic sessions recorded yet. Run diagnostics on the Run Diagnostics tab!
          </div>
        )}
      </div>

      {/* Compare Sessions Modal */}
      {showCompareModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '820px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitCompare size={20} color="#3b82f6" />
                Comparative Diagnostic & Recovery Verification
              </h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setShowCompareModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-row" style={{ marginBottom: '18px' }}>
              <div className="form-group">
                <label className="form-label">Session A (Before Fix / Baseline)</label>
                <select
                  className="form-select"
                  value={beforeId}
                  onChange={e => setBeforeId(e.target.value)}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.session_id} - {s.overall_status} ({s.source_device}→{s.destination_device})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Session B (After Fix / Follow-up)</label>
                <select
                  className="form-select"
                  value={afterId}
                  onChange={e => setAfterId(e.target.value)}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.session_id} - {s.overall_status} ({s.source_device}→{s.destination_device})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
              <button
                className="btn btn-primary"
                onClick={handleExecuteCompare}
                disabled={comparing}
              >
                <GitCompare size={15} />
                {comparing ? 'Comparing...' : 'Run Comparative Verification'}
              </button>
            </div>

            {/* Comparison Results Card */}
            {comparisonResult && (
              <div style={{ background: '#090d16', borderRadius: '10px', padding: '18px', border: '1px solid var(--border-strong)' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: comparisonResult.recovery_verification_status === 'RECOVERED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${comparisonResult.recovery_verification_status === 'RECOVERED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {comparisonResult.recovery_verification_status === 'RECOVERED' ? (
                    <CheckCircle size={24} color="#10b981" />
                  ) : (
                    <AlertTriangle size={24} color="#f59e0b" />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: comparisonResult.recovery_verification_status === 'RECOVERED' ? '#34d399' : '#fbbf24' }}>
                      Recovery Verification Status: {comparisonResult.recovery_verification_status}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {comparisonResult.summary}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Before (Baseline)</div>
                    <div style={{ fontWeight: 600, color: '#f87171', marginTop: '2px' }}>
                      {comparisonResult.before_session.overall_status}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {comparisonResult.before_session.likely_cause}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>After (Follow-up)</div>
                    <div style={{ fontWeight: 600, color: comparisonResult.after_session.overall_status === 'HEALTHY' ? '#34d399' : '#fbbf24', marginTop: '2px' }}>
                      {comparisonResult.after_session.overall_status}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {comparisonResult.after_session.likely_cause}
                    </div>
                  </div>
                </div>

                {comparisonResult.test_differences.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Individual Parameter Transitions:
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Before</th>
                            <th>After</th>
                            <th>Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonResult.test_differences.map((td, idx) => (
                            <tr key={idx}>
                              <td className="mono" style={{ fontSize: '0.8rem' }}>{td.test_name}</td>
                              <td><span className="badge badge-neutral">{td.before_result}</span></td>
                              <td><span className="badge badge-neutral">{td.after_result}</span></td>
                              <td>
                                <span className={`badge ${td.change === 'IMPROVED' ? 'badge-healthy' : td.change === 'WORSENED' ? 'badge-fault' : 'badge-neutral'}`}>
                                  {td.change}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#10b981" />
              Mark Session Resolved: {resolveTarget.session_id}
            </h2>

            <div className="form-group">
              <label className="form-label">Corrective Action Taken in Packet Tracer</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="e.g. Configured missing static route on R1, verified ping from PC1..."
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setResolveTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveResolution}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
