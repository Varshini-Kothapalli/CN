import React from 'react';
import {
  Network,
  Activity,
  History,
  BookOpen,
  LayoutDashboard,
  Radio,
  Cpu
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, backendOnline }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'network', label: 'Network Profiles', icon: Network },
    { id: 'diagnostics', label: 'Run Diagnostics', icon: Activity },
    { id: 'history', label: 'Diagnostic History', icon: History },
    { id: 'guide', label: 'Troubleshooting Guide', icon: BookOpen },
  ];

  return (
    <header className="header-nav no-print">
      <div className="nav-container">
        <div className="brand-section" onClick={() => setActiveTab('dashboard')}>
          <div className="brand-icon-box">
            <Radio size={22} />
          </div>
          <div>
            <div className="brand-title">NetDiag Suite</div>
            <div className="brand-subtitle">Packet Tracer Diagnostic & Localization Engine</div>
          </div>
        </div>

        <nav>
          <ul className="nav-tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '0.78rem',
            padding: '5px 10px',
            borderRadius: '9999px',
            background: backendOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: backendOnline ? '#34d399' : '#f87171',
            border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: backendOnline ? '#10b981' : '#ef4444',
              boxShadow: backendOnline ? '0 0 6px #10b981' : '0 0 6px #ef4444'
            }} />
            <span>{backendOnline ? 'Diagnostic Engine Online' : 'Connecting Engine...'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
