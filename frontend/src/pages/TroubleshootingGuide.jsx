import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Terminal,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { fetchGuideTopics } from '../api';

export default function TroubleshootingGuide() {
  const [topics, setTopics] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedTopic, setExpandedTopic] = useState('incorrect-default-gateway');
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchGuideTopics();
        setTopics(data);
      } catch (err) {
        console.error('Failed to load guide topics', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredTopics = topics.filter(t => {
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.symptoms.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <DisclaimerBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BookOpen size={26} color="#3b82f6" />
            Computer Networks Troubleshooting & Knowledge Base
          </h1>
          <p className="page-desc">
            Diagnostic verification steps, Cisco IOS syntax, and recovery verification procedures for Packet Tracer labs
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '22px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            style={{ border: 'none', background: 'transparent', padding: '6px 0', fontSize: '0.95rem' }}
            placeholder="Search network failures (e.g., gateway, static route, admin down, ACL, subnet mask)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Diagnostic Warning Box */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '22px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.86rem',
        color: 'var(--text-secondary)'
      }}>
        <ShieldAlert size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
        <div>
          <strong>Core Diagnostic Principle: </strong>
          A single ping failure does not uniquely pinpoint a root cause. ICMP echo loss can stem from host configuration, local switch ports, WAN links, missing routing prefixes, or ACL filters. Always correlate ping with traceroute, ARP tables, and router interface status.
        </div>
      </div>

      {/* Topics Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredTopics.map(topic => {
          const isExpanded = expandedTopic === topic.id;
          return (
            <div key={topic.id} className="card" style={{ padding: '18px 22px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-possible" style={{ fontSize: '0.72rem' }}>
                      {topic.category}
                    </span>
                    <h2 style={{ fontSize: '1.08rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {topic.title}
                    </h2>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ID: {topic.id} • {topic.symptoms?.length || 0} Key Symptoms Documented
                  </div>
                </div>

                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="grid-cols-2" style={{ marginBottom: '18px' }}>
                    {/* Symptoms */}
                    <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Observable Symptoms in Packet Tracer:
                      </div>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        {topic.symptoms.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Verification Commands */}
                    <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Inspection & Verification Commands:
                      </div>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', lineHeight: 1.6, fontFamily: 'var(--font-mono)', color: '#93c5fd' }}>
                        {topic.packet_tracer_commands.map((cmd, i) => (
                          <li key={i}>{cmd}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Verification & Corrective Actions Grid */}
                  <div className="grid-cols-2" style={{ marginBottom: '18px' }}>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        How to Verify Suspected Cause:
                      </div>
                      <ol style={{ paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {topic.verification_steps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Recommended Corrective Action:
                      </div>
                      <ol style={{ paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {topic.corrective_actions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Recovery Verification */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '18px'
                  }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#34d399', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={15} />
                      How to Verify Recovery:
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {topic.recovery_verification.map((rv, i) => (
                        <li key={i}>{rv}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Cisco IOS Command Snippet */}
                  {topic.ios_examples && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Cisco IOS Configuration Syntax:
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleCopyCode(topic.id, topic.ios_examples)}
                        >
                          {copiedId === topic.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          {copiedId === topic.id ? 'Copied' : 'Copy IOS Code'}
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
    </div>
  );
}
