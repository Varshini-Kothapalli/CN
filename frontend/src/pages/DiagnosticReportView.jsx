import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Server,
  Laptop,
  Cpu,
  Layers,
  ChevronRight,
  RefreshCw,
  GitCompare,
  CornerDownRight
} from 'lucide-react';
import { fetchDiagnostic, resolveDiagnostic } from '../api';

export default function DiagnosticReportView({ reportId, setActiveTab, setCompareBeforeId, setCompareAfterId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolution Notes Modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [isResolved, setIsResolved] = useState(true);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadReport = async () => {
    if (!reportId) return;
    try {
      setLoading(true);
      const data = await fetchDiagnostic(reportId);
      setReport(data);
      setIsResolved(data.is_resolved || false);
      setResolutionNotes(data.resolution_notes || '');
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diagnostic_Report_${report.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveResolution = async () => {
    try {
      const updated = await resolveDiagnostic(report.id, isResolved, resolutionNotes);
      setReport(updated);
      setShowResolveModal(false);
    } catch (err) {
      alert(`Error updating resolution: ${err.message}`);
    }
  };

  const handleInitiateComparison = () => {
    setCompareBeforeId(report.id);
    setActiveTab('history');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
        <div style={{ marginTop: '12px' }}>Loading diagnostic report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Report Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{error || 'Unable to locate session report.'}</p>
        <button className="btn btn-secondary" onClick={() => setActiveTab('diagnostics')}>
          Back to Diagnostics
        </button>
      </div>
    );
  }

  let statusBadgeClass = 'badge-insufficient';
  let statusIcon = HelpCircle;
  let statusColor = '#94a3b8';

  if (report.overall_status === 'HEALTHY') {
    statusBadgeClass = 'badge-healthy';
    statusIcon = CheckCircle;
    statusColor = '#10b981';
  } else if (report.overall_status === 'FAULT DETECTED') {
    statusBadgeClass = 'badge-fault';
    statusIcon = XCircle;
    statusColor = '#ef4444';
  } else if (report.overall_status === 'POSSIBLE FAULT') {
    statusBadgeClass = 'badge-possible';
    statusIcon = AlertTriangle;
    statusColor = '#f59e0b';
  }

  const StatusIconComponent = statusIcon;

  return (
    <div>
      {/* Header & Report Actions */}
      <div className="page-header no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">
              <FileText size={24} color="#3b82f6" />
              Diagnostic Evaluation Report
            </h1>
            <span className={`badge ${statusBadgeClass}`}>
              {report.overall_status}
            </span>
          </div>
          <p className="page-desc mono" style={{ fontSize: '0.82rem' }}>
            Session: {report.session_id} • Analyzed: {new Date(report.timestamp).toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            Print Report
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadJson}>
            <Download size={14} />
            Download JSON
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleInitiateComparison}>
            <GitCompare size={14} />
            Compare Session
          </button>
          <button
            className={`btn btn-sm ${report.is_resolved ? 'btn-success' : 'btn-primary'}`}
            onClick={() => setShowResolveModal(true)}
          >
            <ShieldCheck size={14} />
            {report.is_resolved ? 'Fault Resolved' : 'Mark Resolved'}
          </button>
        </div>
      </div>

      {/* Printable Title Block (shown only on print) */}
      <div style={{ display: 'none' }} className="print-only">
        <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>NetDiag Network Diagnostic & Localization Report</h1>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '16px' }}>
          Session ID: {report.session_id} | Date: {new Date(report.timestamp).toLocaleString()} | Network: {report.network_name}
        </p>
      </div>

      {/* Overview Status Card */}
      <div className="card" style={{ marginBottom: '22px', borderLeft: `5px solid ${statusColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Primary Diagnostic Conclusion
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {report.likely_cause}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#38bdf8', marginTop: '4px' }}>
              Suspected Location: <strong>{report.suspected_failure_location}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Diagnostic Confidence
            </div>
            <span className={`confidence-meter confidence-${(report.confidence || 'low').toLowerCase()}`}>
              {report.confidence} Confidence
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '240px' }}>
              {report.confidence_reason}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Path & Failure Localization Diagram */}
      <div className="card" style={{ marginBottom: '22px' }}>
        <div className="card-header">
          <div className="card-title">
            <Cpu size={18} color="#38bdf8" />
            Topology Path Failure Localization
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Hop-by-hop reachability along tested route
          </span>
        </div>

        <div className="topology-view">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {report.path_hops && report.path_hops.length > 0 ? (
              report.path_hops.map((hop, idx) => {
                let hopClass = 'topology-node';
                let tagColor = '#94a3b8';
                if (hop.reachability === 'PASS') {
                  hopClass += ' healthy';
                  tagColor = '#34d399';
                } else if (hop.reachability === 'FAIL' || hop.is_fault_region) {
                  hopClass += ' fault';
                  tagColor = '#f87171';
                }

                return (
                  <React.Fragment key={hop.device_id || idx}>
                    <div className={hopClass}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{hop.device_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hop.device_type}</div>
                      {hop.ip && <div className="mono" style={{ fontSize: '0.7rem', color: '#60a5fa' }}>{hop.ip}</div>}
                      <div style={{ marginTop: '4px', fontSize: '0.68rem', fontWeight: 600, color: tagColor }}>
                        {hop.reachability}
                      </div>
                    </div>
                    {idx < report.path_hops.length - 1 && (
                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <ChevronRight size={18} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Path hops not isolated for this session.
              </div>
            )}
          </div>

          {report.localized_link && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem'
            }}>
              <strong>Localized Disconnect Region: </strong>
              {report.localized_link.description} (Physical connection or line protocol interrupted)
            </div>
          )}
        </div>
      </div>

      {/* Symptoms & Evidence Grid */}
      <div className="grid-cols-2" style={{ marginBottom: '22px' }}>
        {/* Identified Symptoms */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} color="#f59e0b" />
              Identified Network Symptoms
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {report.identified_symptoms && report.identified_symptoms.length > 0 ? (
              report.identified_symptoms.map((symptom, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem'
                  }}
                >
                  <CornerDownRight size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>{symptom}</span>
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No anomalies flagged.</li>
            )}
          </ul>
        </div>

        {/* Supporting Diagnostic Evidence */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileText size={18} color="#3b82f6" />
              Supporting Diagnostic Evidence
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {report.supporting_evidence && report.supporting_evidence.length > 0 ? (
              report.supporting_evidence.map((ev, idx) => (
                <li
                  key={idx}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem'
                  }}
                >
                  <span className="mono" style={{ fontSize: '0.74rem', color: '#38bdf8', textTransform: 'uppercase', display: 'block' }}>
                    [{ev.source}]
                  </span>
                  <span>{ev.description}</span>
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No raw evidence records supplied.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Individual Tests Summary */}
      <div className="card" style={{ marginBottom: '22px' }}>
        <div className="card-header">
          <div className="card-title">
            <CheckCircle size={18} color="#10b981" />
            Individual Test Results Matrix
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Result</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {report.individual_tests && Object.entries(report.individual_tests).map(([key, val]) => {
                let badgeClass = 'badge-unknown';
                if (val === 'PASS') badgeClass = 'badge-pass';
                else if (val === 'FAIL') badgeClass = 'badge-fail';

                return (
                  <tr key={key}>
                    <td className="mono" style={{ fontSize: '0.85rem' }}>{key}</td>
                    <td><span className={`badge ${badgeClass}`}>{val}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {val === 'PASS' ? 'Passed connectivity criteria' : val === 'FAIL' ? 'Failed - packet loss or timeout observed' : 'Not executed or unverified'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Troubleshooting Actions & Next Tests */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Recommended Actions */}
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} color="#3b82f6" />
              Recommended Corrective Actions (Packet Tracer)
            </div>
          </div>
          <ol style={{ paddingLeft: '20px', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {report.recommended_actions && report.recommended_actions.length > 0 ? (
              report.recommended_actions.map((act, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>
                  {act}
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--text-muted)' }}>No corrective actions required. Network healthy.</li>
            )}
          </ol>
        </div>

        {/* Unresolved Questions & Next Tests */}
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="card-header">
            <div className="card-title">
              <HelpCircle size={18} color="#f59e0b" />
              Recommended Follow-Up Tests
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.88rem' }}>
            {report.unresolved_questions && report.unresolved_questions.length > 0 ? (
              report.unresolved_questions.map((q, idx) => (
                <li key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <ArrowRight size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{q}</span>
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--text-muted)' }}>All diagnostic criteria verified without open questions.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Resolution Notes Modal */}
      {showResolveModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#10b981" />
              Update Fault Resolution Status
            </h2>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={isResolved}
                  onChange={e => setIsResolved(e.target.checked)}
                />
                <span>Fault has been resolved in Cisco Packet Tracer</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Resolution Notes / Action Taken</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="e.g. Added missing static route on R1 using 'ip route 192.168.30.0 255.255.255.0 10.0.12.2'..."
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveResolution}>Save Status</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
