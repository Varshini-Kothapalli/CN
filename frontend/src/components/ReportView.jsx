import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Activity,
  RefreshCw,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { fetchDiagnostic, resolveDiagnostic, deleteDiagnostic } from '../api';

export default function ReportView({ reportId, onBack, onReportDeleted }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
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
    loadReport();
  }, [reportId]);

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NetDiag_Report_${report.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const css = '@page { margin: 20mm; }';
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this diagnostic report permanently?')) return;
    try {
      await deleteDiagnostic(report.id);
      if (onReportDeleted) onReportDeleted(report.id);
    } catch (err) {
      alert(`Error deleting report: ${err.message}`);
    }
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

  const getStatusBadge = (status) => {
    const map = {
      'HEALTHY': { class: 'badge-healthy', icon: CheckCircle, color: 'var(--status-healthy)', text: 'Healthy' },
      'FAULT DETECTED': { class: 'badge-fault', icon: XCircle, color: 'var(--status-fault)', text: 'Fault Detected' },
      'POSSIBLE FAULT': { class: 'badge-possible', icon: AlertTriangle, color: 'var(--status-warning)', text: 'Possible Fault' },
      'INSUFFICIENT EVIDENCE': { class: 'badge-insufficient', icon: HelpCircle, color: 'var(--status-neutral)', text: 'Insufficient Evidence' },
    };
    return map[status] || map['INSUFFICIENT EVIDENCE'];
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="spin" />
        <div style={{ marginTop: '12px' }}>Loading diagnostic report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={36} color="var(--status-fault)" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Report Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {error || 'Unable to locate this diagnostic session.'}
        </p>
        {onBack && (
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    );
  }

  const statusInfo = getStatusBadge(report.overall_status);
  const StatusIcon = statusInfo.icon;

  return (
    <div>
      {/* Report Header */}
      <div className="page-header no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="page-title">
              <FileText size={24} color="var(--brand-blue)" />
              Diagnostic Report
            </h1>
            <span className={`badge ${statusInfo.class}`}>
              {statusInfo.text}
            </span>
          </div>
          <p className="page-desc mono" style={{ fontSize: '0.84rem' }}>
            Session: {report.session_id} &middot; Analyzed: {new Date(report.timestamp).toLocaleString()} &middot; Network: {report.network_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onBack && (
            <button className="btn btn-secondary btn-sm" onClick={onBack}>
              Back
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            Print
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadJson}>
            <Download size={14} />
            Download JSON
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Diagnosis Summary */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <StatusIcon size={18} color={statusInfo.color} />
            Diagnosis Summary
          </div>
          <span className={`confidence-meter confidence-${(report.confidence || 'low').toLowerCase()}`}>
            {report.confidence} Confidence
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Problem Detected
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {report.likely_cause}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Affected Device / Suspected Location
            </div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
              {report.suspected_failure_location}
            </div>
          </div>

          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {report.confidence_reason}
          </div>
        </div>
      </div>

      {/* Two-column: Evidence | Actions & Next Tests */}
      <div className="grid-cols-2" style={{ marginBottom: '20px' }}>
        {/* Identified Symptoms */}
        <div className="card">
          <div className="card-title">
            <AlertTriangle size={16} color="var(--status-warning)" />
            Identified Symptoms
          </div>
          <ul style={{ listStyle: 'disc', paddingLeft: '18px', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: '10px' }}>
            {report.identified_symptoms && report.identified_symptoms.length > 0 ? (
              report.identified_symptoms.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li>No anomalies flagged.</li>
            )}
          </ul>
        </div>

        {/* Supporting Evidence */}
        <div className="card">
          <div className="card-title">
            <FileText size={16} color="var(--brand-blue)" />
            Supporting Evidence
          </div>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
            {report.supporting_evidence && report.supporting_evidence.length > 0 ? (
              report.supporting_evidence.map((ev, i) => (
                <li
                  key={i}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.86rem'
                  }}
                >
                  <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
                    [{ev.source}]
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{ev.description}</span>
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>No evidence records supplied.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Recommended Actions & Next Tests */}
      <div className="grid-cols-2" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="card-title" style={{ color: 'var(--status-healthy)' }}>
            <CheckCircle size={16} color="var(--status-healthy)" />
            Recommended Corrective Action
          </div>
          <ol style={{ paddingLeft: '18px', fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: '10px' }}>
            {report.recommended_actions && report.recommended_actions.length > 0 ? (
              report.recommended_actions.map((act, i) => <li key={i}>{act}</li>)
            ) : (
              <li>No corrective actions required. Network is healthy.</li>
            )}
          </ol>
        </div>

        <div className="card">
          <div className="card-title" style={{ color: 'var(--status-warning)' }}>
            <HelpCircle size={16} color="var(--status-warning)" />
            Next Test to Perform
          </div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.88rem', marginTop: '10px' }}>
            {report.unresolved_questions && report.unresolved_questions.length > 0 ? (
              report.unresolved_questions.map((q, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--brand-blue)' }}>&#8212;</span>
                  <span>{q}</span>
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--text-secondary)' }}>All diagnostic criteria verified.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Path Hops */}
      {report.path_hops && report.path_hops.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">
            <Activity size={16} color="var(--brand-blue)" />
            Path Reachability
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Type</th>
                  <th>IP Address</th>
                  <th>Reachability</th>
                </tr>
              </thead>
              <tbody>
                {report.path_hops.map((hop, i) => (
                  <tr key={hop.device_id || i}>
                    <td>
                      <strong>{hop.device_name}</strong>
                      {hop.is_fault_region && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--status-fault)', display: 'block' }}>
                          (fault region)
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{hop.device_type}</td>
                    <td className="mono" style={{ fontSize: '0.82rem' }}>{hop.ip || '&mdash;'}</td>
                    <td>
                      <span className={`badge ${hop.reachability === 'PASS' ? 'badge-pass' : hop.reachability === 'FAIL' ? 'badge-fail' : 'badge-neutral'}`}>
                        {hop.reachability}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Tests */}
      {report.individual_tests && Object.keys(report.individual_tests).length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">
            <CheckCircle size={16} color="var(--status-healthy)" />
            Individual Test Results
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.individual_tests).map(([key, val]) => (
                  <tr key={key}>
                    <td className="mono" style={{ fontSize: '0.82rem' }}>{key.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge ${val === 'PASS' ? 'badge-pass' : val === 'FAIL' ? 'badge-fail' : 'badge-neutral'}`}>
                        {val}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recovery Verification */}
      <div className="card">
        <div className="card-title">
          <ShieldCheck size={16} color={report.is_resolved ? 'var(--status-healthy)' : 'var(--status-warning)'} />
          Recovery Verification
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.86rem' }}>
            <span>
              Status: <strong style={{ color: report.is_resolved ? 'var(--status-healthy)' : 'var(--status-warning)' }}>
                {report.is_resolved ? 'Resolved' : 'Pending Verification'}
              </strong>
            </span>
            <span>
              Recovery: <strong>{report.recovery_verification_status || 'PENDING'}</strong>
            </span>
          </div>
          {report.resolution_notes && (
            <div style={{ marginTop: '10px', padding: '10px 14px', background: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {report.resolution_notes}
            </div>
          )}
        </div>
        <button
          className="btn btn-sm"
          style={{ marginTop: '12px' }}
          onClick={() => setShowResolveModal(true)}
        >
          <ShieldCheck size={14} />
          {report.is_resolved ? 'Update Resolution' : 'Mark Resolved'}
        </button>
      </div>

      {/* Resolution Modal */}
      {showResolveModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--status-healthy)" />
              Update Resolution Status
            </h2>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={isResolved}
                  onChange={e => setIsResolved(e.target.checked)}
                />
                <span>Fault has been resolved in Packet Tracer</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Resolution Notes</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="e.g. Added missing static route on R1: ip route 192.168.30.0 255.255.255.0 10.0.12.2"
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveResolution}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
