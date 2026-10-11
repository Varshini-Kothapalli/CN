import React from 'react';
import { LayoutDashboard, Activity, History } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, backendOnline }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'diagnosis', label: 'Run Diagnosis', icon: Activity },
    { id: 'history', label: 'History & Guide', icon: History },
  ];

  return (
    <header className="header-nav no-print">
      <div className="nav-container">
        <div
          className="brand-section"
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="brand-title">NetDiag Suite</span>
          <span className="brand-subtitle">Network Connectivity Diagnosis &amp; Failure Localization</span>
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

        <div className={`backend-status ${backendOnline ? 'online' : 'offline'}`}>
          <span className="dot" style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: backendOnline ? 'var(--status-healthy)' : 'var(--status-fault)'
          }}></span>
          {backendOnline ? 'Engine Online' : 'Connecting...'}
        </div>
      </div>
    </header>
  );
}
