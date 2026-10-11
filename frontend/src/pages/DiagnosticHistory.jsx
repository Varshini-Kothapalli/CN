import React, { useState, useEffect } from 'react';
import {
  History,
  BookOpen,
  Trash2,
  Eye,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import ReportView from '../components/ReportView';
import {
  fetchDiagnostics,
  deleteDiagnostic,
  fetchGuideTopics
} from '../api';

export default function DiagnosticHistory({ setActiveTab }) {
  const [sessions, setSessions] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubtab, setActiveSubtab] = useState('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGuide, setExpandedGuide] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await fetchDiagnostics();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGuides() {
    try {
      const data = await fetchGuideTopics();
      setGuides(data);
      if (data.length > 0 && !expandedGuide) {
        setExpandedGuide(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load guides', err);
    }
  }

  useEffect(() => {
    loadSessions();
    loadGuides();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diagnostic report permanently?')) return;
    try {
      await deleteDiagnostic(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selectedReport?.id === id) setSelectedReport(null);
    } catch (err) {
      alert(`Error deleting report: ${err.message}`);
    }
  };

  const handleViewReport = (session) => {
    setSelectedReport(session);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredGuides = guides.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    if (status === 'HEALTHY') return { class: 'badge-healthy', color: 'var(--status-healthy)' };
    if (status === 'FAULT DETECTED') return { class: 'badge-fault', color: 'var(--status-fault)' };
    if (status === 'POSSIBLE FAULT') return { class: 'badge-possible', color: 'var(--status-warning)' };
    return { class: 'badge-insufficient', color: 'var(--status-neutral)' };
  };

  // If viewing a report
  if (selectedReport) {
    return (
      <div>
        <DisclaimerBanner />
        <div style={{ marginBottom: '14px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCloseReport}>
            &larr; Back to History
          </button>
        </div>
        <ReportView
          reportId={selectedReport.id}
          onBack={handleCloseReport}
          onReportDeleted={(id) => {
            setSessions(prev => prev.filter(s => s.id !== id));
            setSelectedReport(null);
          }}
        />
      </div>
    );
  }

  // Normal view with subtabs
  return (
    <div>
      <DisclaimerBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <History size={26} color="var(--brand-blue)" />
            History &amp; Guide
          </h1>
          <p className="page-desc">
            Review past diagnostic sessions or browse the troubleshooting guide.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="subtabs">
        <button
          className={`subtab-btn ${activeSubtab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveSubtab('history'); setSearchQuery(''); }}
        >
          <History size={14} />
          Diagnostic History
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'guide' ? 'active' : ''}`}
          onClick={() => { setActiveSubtab('guide'); setSearchQuery(''); }}
        >
          <BookOpen size={14} />
          Troubleshooting Guide
        </button>
      </div>

      {/* === History Subtab === */}
      {activeSubtab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Saved Diagnostic Sessions ({sessions.length})</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadSessions}>
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <RefreshCw size={24} className="spin" />
              <div style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>Loading sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No diagnostic sessions recorded yet.
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '12px' }}
                onClick={() => setActiveTab('diagnosis')}
              >
                Run First Diagnosis
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Date</th>
                    <th>Source &rarr; Destination</th>
                    <th>Diagnosis</th>
                    <th>Confidence</th>
                    <th>Recovery</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(item => {
                    const badge = getStatusBadge(item.overall_status);
                    return (
                      <tr key={item.id}>
                        <td className="mono" style={{ color: 'var(--brand-blue)', fontSize: '0.82rem' }}>
                          {item.session_id}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.86rem' }}>
                          <span style={{ fontWeight: 600 }}>{item.source_device}</span>
                          {' \u{2192} '}
                          <span style={{ fontWeight: 600 }}>{item.destination_device}</span>
                        </td>
                        <td>
                          <span className={`badge ${badge.class}`}>{item.overall_status}</span>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
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
                            <span className="badge badge-healthy" style={{ fontSize: '0.74rem' }}>
                              Resolved
                            </span>
                          ) : (
                            <span className="badge badge-insufficient" style={{ fontSize: '0.74rem' }}>
                              {item.recovery_verification_status || 'PENDING'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px' }}
                              title="View Report"
                              onClick={() => handleViewReport(item)}
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '4px 8px' }}
                              title="Delete"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === Guide Subtab === */}
      {activeSubtab === 'guide' && (
        <div>
          <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                className="form-input"
                style={{ border: 'none', background: 'transparent', padding: '6px 0', fontSize: '0.92rem' }}
                placeholder="Search troubleshooting topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredGuides.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
              No matching topics found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredGuides.map(topic => {
                const isExpanded = expandedGuide === topic.id;
                return (
                  <div key={topic.id} className="card">
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedGuide(isExpanded ? null : topic.id)}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {topic.category}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {topic.title}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--status-fault)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Symptoms
                        </h3>
                        <ul style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', paddingLeft: '16px', marginBottom: '12px' }}>
                          {topic.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>

                        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-blue)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Verification Commands
                        </h3>
                        <ul style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', paddingLeft: '16px', marginBottom: '12px' }}>
                          {topic.packet_tracer_commands.map((cmd, i) => <li key={i}>{cmd}</li>)}
                        </ul>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.82rem' }}>
                          <div>
                            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Verify Suspected Cause</h4>
                            <ol style={{ paddingLeft: '16px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                              {topic.verification_steps.map((s, i) => <li key={i}>{s}</li>)}
                            </ol>
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Corrective Action</h4>
                            <ol style={{ paddingLeft: '16px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                              {topic.corrective_actions.map((a, i) => <li key={i}>{a}</li>)}
                            </ol>
                          </div>
                        </div>

                        {topic.ios_examples && (
                          <div style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Cisco IOS Configuration Syntax
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                onClick={() => handleCopyCode(topic.id, topic.ios_examples)}
                              >
                                {copiedId === topic.id ? <><Copy size={11} color="var(--status-healthy)" /> Copied</> : <><Copy size={11} /> Copy</>}
                              </button>
                            </div>
                            <pre className="code-block">{topic.ios_examples}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
