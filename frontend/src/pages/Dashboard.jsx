import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { fetchDiagnostics } from '../api';

export default function Dashboard({ setActiveTab, setReportId }) {
  const [recentReport, setRecentReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        setLoading(true);
        const sessions = await fetchDiagnostics();
        if (sessions.length > 0) {
          setRecentReport(sessions[0]);
        }
      } catch (err) {
        console.error('Failed to load diagnostics', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  const handleRunDiagnosis = () => {
    setReportId(null);
    setActiveTab('diagnosis');
  };

  const handleViewReport = () => {
    setReportId(recentReport.id);
    setActiveTab('diagnosis');
  };

  const getStatBadge = (status) => {
    if (status === 'HEALTHY') return { class: 'badge-healthy', label: 'Healthy', color: 'var(--status-healthy)' };
    if (status === 'FAULT DETECTED') return { class: 'badge-fault', label: 'Fault Detected', color: 'var(--status-fault)' };
    if (status === 'POSSIBLE FAULT') return { class: 'badge-possible', label: 'Possible Fault', color: 'var(--status-warning)' };
    return { class: 'badge-insufficient', label: 'Insufficient Evidence', color: 'var(--status-neutral)' };
  };

  return (
    <div>
      <DisclaimerBanner />

      {/* Project Description */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">
          <Activity size={26} color="var(--brand-blue)" />
          NetDiag Suite
        </h1>
        <p className="page-desc" style={{ marginTop: '8px', fontSize: '1rem', lineHeight: 1.7, maxWidth: '720px' }}>
          An offline, evidence-based network diagnostic tool for Cisco Packet Tracer simulations.
          After running diagnostic commands in Packet Tracer, enter your test results or paste raw
          command outputs to automatically detect connectivity failures and localize them to specific
          routers, interfaces, or links.
        </p>
      </div>

      {/* Primary Action */}
      <div className="card" style={{ textAlign: 'center', padding: '36px 24px', marginBottom: '24px' }}>
        <button className="btn btn-primary btn-lg" onClick={handleRunDiagnosis}>
          <Activity size={20} />
          Run a New Diagnosis
        </button>
      </div>

      {/* Most Recent Diagnostic Result */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--brand-blue)" />
          Most Recent Diagnostic Result
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" />
            <div style={{ marginTop: '10px', fontSize: '0.88rem' }}>Loading recent diagnostics...</div>
          </div>
        ) : !recentReport ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '0.88rem' }}>No diagnostic sessions recorded yet.</div>
            <div style={{ fontSize: '0.82rem', marginTop: '6px' }}>
              Click "Run a New Diagnosis" above to begin.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className={`badge ${getStatBadge(recentReport.overall_status).class}`}>
                {getStatBadge(recentReport.overall_status).label}
              </span>
              <span className={`badge ${`confidence-${(recentReport.confidence || 'low').toLowerCase()}`}`}>
                {recentReport.confidence} Confidence
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Likely Cause
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {recentReport.likely_cause}
              </div>
            </div>

            <div style={{ marginBottom: '10px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{recentReport.source_device}</span>
              {' \u{2192} '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{recentReport.destination_device}</span>
              {'  \u{B7}  '}
              <span style={{ color: 'var(--text-muted)' }}>
                {new Date(recentReport.timestamp).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleViewReport}>
                View Full Report
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
                View All History
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
