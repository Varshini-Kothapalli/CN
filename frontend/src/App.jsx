import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import RunDiagnostics from './pages/RunDiagnostics';
import DiagnosticHistory from './pages/DiagnosticHistory';
import { fetchHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportId, setReportId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      try {
        await fetchHealth();
        setBackendOnline(true);
      } catch {
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
          <Dashboard setActiveTab={setActiveTab} setReportId={setReportId} />
        )}
        {activeTab === 'diagnosis' && (
          <RunDiagnostics reportId={reportId} setReportId={setReportId} />
        )}
        {activeTab === 'history' && (
          <DiagnosticHistory setActiveTab={setActiveTab} />
        )}
      </main>
    </div>
  );
}
