import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  History,
  Network,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { fetchDashboardStats } from '../api';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard({ setActiveTab, setSelectedReportId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !stats) {
    return (
      <div>
        <DisclaimerBanner />
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
          <div style={{ marginTop: '12px' }}>Loading network diagnostics telemetry...</div>
        </div>
      </div>
    );
  }

  const chartData = stats?.fault_distribution || [];
  const recentSessions = stats?.recent_sessions || [];

  return (
    <div>
      <DisclaimerBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={26} color="#3b82f6" />
            Network Operations & Diagnostics Dashboard
          </h1>
          <p className="page-desc">
            Evidence-based failure localization overview for Cisco Packet Tracer simulations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadStats}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('diagnostics')}>
            <Activity size={14} />
            Run New Diagnosis
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Registered Devices</div>
            <div className="stat-value">{stats?.total_devices ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Across {stats?.total_networks ?? 1} topology profile(s)
            </div>
          </div>
          <div className="stat-icon blue">
            <Server size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Healthy Sessions</div>
            <div className="stat-value" style={{ color: '#34d399' }}>{stats?.healthy_tests ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Full end-to-end reachability
            </div>
          </div>
          <div className="stat-icon green">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Suspected Faults</div>
            <div className="stat-value" style={{ color: '#f87171' }}>{stats?.suspected_faults ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Localized failure points
            </div>
          </div>
          <div className="stat-icon red">
            <XCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Resolved Faults</div>
            <div className="stat-value" style={{ color: '#a78bfa' }}>{stats?.resolved_faults ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Packet Tracer recovery verified
            </div>
          </div>
          <div className="stat-icon purple">
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Rows */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Fault Distribution Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} color="#f59e0b" />
              Fault Category Breakdown
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Rule-Engine Inferences</span>
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="category"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      fontSize: '0.85rem'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.8rem', color: '#9ca3af' }}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: 240,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.88rem'
            }}>
              <CheckCircle size={36} color="#10b981" style={{ opacity: 0.6, marginBottom: '8px' }} />
              <div>No active network faults recorded yet.</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Run a diagnostic session or load a sample scenario.</div>
            </div>
          )}
        </div>

        {/* Quick Actions & System Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <div className="card-title">
                <Network size={18} color="#3b82f6" />
                Network Health Summary & Actions
              </div>
            </div>

            <div style={{
              background: '#0d1424',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>System Operational State:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Ready for Packet Tracer Inputs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Diagnostic Rules Active:</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>Rules A through I (Config, Route, Link, Admin, ACL)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Localization Engine:</span>
                <span style={{ color: '#a78bfa', fontWeight: 600 }}>Graph BFS & Hop-by-Hop Disconnect Analysis</span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Use this system after executing troubleshooting commands in your Packet Tracer lab. Enter connectivity test results or paste raw command outputs from routers and workstations to pinpoint the root cause.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '18px' }}>
            <button className="btn btn-secondary" onClick={() => setActiveTab('network')}>
              <Network size={15} />
              View Topology
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab('diagnostics')}>
              <Activity size={15} />
              Run Diagnosis
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('guide')}>
              <ArrowRight size={15} />
              Failure Guide
            </button>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} color="#60a5fa" />
            Recent Diagnostic Sessions
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
            View All History
            <ArrowRight size={14} />
          </button>
        </div>

        {recentSessions.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Timestamp</th>
                  <th>Source Host</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Likely Cause</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => {
                  let badgeClass = 'badge-neutral';
                  if (session.overall_status === 'HEALTHY') badgeClass = 'badge-healthy';
                  else if (session.overall_status === 'FAULT DETECTED') badgeClass = 'badge-fault';
                  else if (session.overall_status === 'POSSIBLE FAULT') badgeClass = 'badge-possible';
                  else if (session.overall_status === 'INSUFFICIENT EVIDENCE') badgeClass = 'badge-insufficient';

                  return (
                    <tr key={session.id}>
                      <td className="mono" style={{ color: '#38bdf8', fontSize: '0.82rem' }}>
                        {session.session_id}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(session.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <strong>{session.source_device}</strong>
                        {session.source_ip && <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{session.source_ip}</span>}
                      </td>
                      <td>
                        <strong>{session.destination_device}</strong>
                        {session.destination_ip && <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{session.destination_ip}</span>}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{session.overall_status}</span>
                      </td>
                      <td>
                        <span className={`confidence-meter confidence-${(session.confidence || 'low').toLowerCase()}`}>
                          {session.confidence}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.likely_cause}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedReportId(session.id);
                            setActiveTab('report');
                          }}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No diagnostic sessions performed yet. Click "Run Diagnosis" above to test a scenario!
          </div>
        )}
      </div>
    </div>
  );
}
