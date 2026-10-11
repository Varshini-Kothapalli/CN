import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import NetworkConfig from './pages/NetworkConfig';
import RunDiagnostics from './pages/RunDiagnostics';
import DiagnosticReportView from './pages/DiagnosticReportView';
import DiagnosticHistory from './pages/DiagnosticHistory';
import TroubleshootingGuide from './pages/TroubleshootingGuide';
import { fetchHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [compareBeforeId, setCompareBeforeId] = useState(null);
  const [compareAfterId, setCompareAfterId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      try {
        await fetchHealth();
        setBackendOnline(true);
      } catch (err) {
        setBackendOnline(false);
      }
    }
    checkBackend();
    const timer = setInterval(checkBackend, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-layout">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            setSelectedReportId={setSelectedReportId}
          />
        )}

        {activeTab === 'network' && (
          <NetworkConfig />
        )}

        {activeTab === 'diagnostics' && (
          <RunDiagnostics
            setActiveTab={setActiveTab}
            setSelectedReportId={setSelectedReportId}
          />
        )}

        {activeTab === 'report' && (
          <DiagnosticReportView
            reportId={selectedReportId}
            setActiveTab={setActiveTab}
            setCompareBeforeId={setCompareBeforeId}
            setCompareAfterId={setCompareAfterId}
          />
        )}

        {activeTab === 'history' && (
          <DiagnosticHistory
            setActiveTab={setActiveTab}
            setSelectedReportId={setSelectedReportId}
            compareBeforeId={compareBeforeId}
            setCompareBeforeId={setCompareBeforeId}
            compareAfterId={compareAfterId}
            setCompareAfterId={setCompareAfterId}
          />
        )}

        {activeTab === 'guide' && (
          <TroubleshootingGuide />
        )}
      </main>
    </div>
  );
}
