import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  ChevronDown,
  ChevronUp,
  Terminal,
  Router as RouterIcon
} from 'lucide-react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import ReportView from '../components/ReportView';
import { fetchNetworks, fetchScenarios, runDiagnostics } from '../api';

const STATUS_OPTIONS = ['NOT_TESTED', 'PASS', 'FAIL', 'UNKNOWN'];

export default function RunDiagnostics({ reportId, setReportId }) {
  const [networks, setNetworks] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [showRawCli, setShowRawCli] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form state
  const [sourceDevId, setSourceDevId] = useState('');
  const [destDevId, setDestDevId] = useState('');
  const [sourceConfigValid, setSourceConfigValid] = useState('PASS');
  const [configuredGateway, setConfiguredGateway] = useState('');
  const [gatewayPing, setGatewayPing] = useState('NOT_TESTED');
  const [destPing, setDestPing] = useState('NOT_TESTED');
  const [intermediateHops, setIntermediateHops] = useState([]);

  // Optional sections
  const [showInterfaceObs, setShowInterfaceObs] = useState(false);
  const [interfaceObs, setInterfaceObs] = useState({
    router_name: '',
    interface_name: '',
    operational_status: 'down',
    administrative_status: 'administratively down'
  });

  const [showRoutingObs, setShowRoutingObs] = useState(false);
  const [routingObs, setRoutingObs] = useState({
    router_name: '',
    destination_network: '',
    route_found: 'NO',
    next_hop: ''
  });

  // Single raw CLI textarea
  const [rawCliOutput, setRawCliOutput] = useState('');

  const setDefaultEndpoints = (net) => {
    const pc = net.devices.find(d => d.type === 'PC') || net.devices.find(d => d.type === 'Server') || net.devices[0];
    const srv = net.devices.find(d => d.type === 'Server') || net.devices[net.devices.length - 1];
    if (pc) {
      setSourceDevId(pc.id);
      setConfiguredGateway(pc.default_gateway || '');
    }
    if (srv) {
      setDestDevId(srv.id);
    }
    const routers = net.devices.filter(d => d.type === 'Router').map(d => ({
      hop_device: d.name,
      hop_ip: d.ip_address || '',
      reachability: 'NOT_TESTED'
    }));
    setIntermediateHops(routers);
  };

  useEffect(() => {
    async function init() {
      try {
        const [netList, scList] = await Promise.all([fetchNetworks(), fetchScenarios()]);
        setNetworks(netList);
        setScenarios(scList);
        if (netList.length > 0) {
          const firstNet = netList[0];
          setSelectedNetwork(firstNet);
          setDefaultEndpoints(firstNet);
        }
      } catch (err) {
        setErrorMsg(err.message);
      }
    }
    init();
  }, []);

  const handleNetworkChange = (e) => {
    const netId = e.target.value;
    const net = networks.find(n => n.id === netId);
    setSelectedNetwork(net);
    if (net) setDefaultEndpoints(net);
  };

  const handleHopChange = (idx, value) => {
    setIntermediateHops(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], reachability: value };
      return next;
    });
  };

  const handleLoadScenario = (scenario) => {
    const sr = scenario.structured_results;
    setSuccessMsg(`Loaded: ${scenario.title}`);
    setTimeout(() => setSuccessMsg(null), 3000);

    // Reset optional sections
    setShowInterfaceObs(false);
    setShowRoutingObs(false);
    setRawCliOutput(scenario.raw_evidence?.ping_output || scenario.raw_evidence?.traceroute_output || scenario.raw_evidence?.show_ip_route || scenario.raw_evidence?.show_ip_int_brief || scenario.raw_evidence?.show_running_config || '');

    // Set source/dest from scenario if devices exist in network
    if (selectedNetwork) {
      const srcDev = selectedNetwork.devices.find(d => d.id === scenario.source_device_id);
      const dstDev = selectedNetwork.devices.find(d => d.id === scenario.destination_device_id);
      if (srcDev) {
        setSourceDevId(srcDev.id);
        setConfiguredGateway(sr.configured_default_gateway || srcDev.default_gateway || '');
      }
      if (dstDev) {
        setDestDevId(dstDev.id);
      }
    }

    setSourceConfigValid(sr.source_config_valid || 'PASS');
    setGatewayPing(sr.default_gateway_ping || 'NOT_TESTED');
    setDestPing(sr.destination_ping || 'NOT_TESTED');

    if (sr.intermediate_hops && sr.intermediate_hops.length > 0) {
      setIntermediateHops(sr.intermediate_hops);
    }

    if (sr.interface_observations && sr.interface_observations.length > 0) {
      setShowInterfaceObs(true);
      setInterfaceObs(sr.interface_observations[0]);
    }

    if (sr.routing_observations && sr.routing_observations.length > 0) {
      setShowRoutingObs(true);
      setRoutingObs(sr.routing_observations[0]);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedNetwork) {
      alert('Please select a network profile.');
      return;
    }
    if (!sourceDevId || !destDevId) {
      alert('Please select both source and destination devices.');
      return;
    }

    const srcDev = selectedNetwork.devices.find(d => d.id === sourceDevId);

    const payload = {
      network_id: selectedNetwork.id,
      source_device_id: sourceDevId,
      destination_device_id: destDevId,
      structured_results: {
        source_config_valid: sourceConfigValid,
        configured_source_ip: srcDev?.ip_address || '',
        configured_subnet_mask: srcDev?.subnet_mask || '',
        configured_default_gateway: configuredGateway,
        default_gateway_ping: gatewayPing,
        intermediate_hops: intermediateHops,
        destination_ping: destPing,
        interface_observations: showInterfaceObs ? [interfaceObs] : [],
        routing_observations: showRoutingObs ? [routingObs] : [],
        acl_vlan_observation: null,
        link_status_observation: 'UNKNOWN',
        additional_observations: null
      },
      raw_evidence: {
        ping_output: rawCliOutput || null,
        traceroute_output: null,
        show_ip_int_brief: null,
        show_ip_route: null,
        show_running_config: rawCliOutput || null
      }
    };

    try {
      setAnalyzing(true);
      setErrorMsg(null);
      const report = await runDiagnostics(payload);
      setActiveReport(report);
      setReportId(report.id);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // If viewing a report from history
  if (reportId && !activeReport) {
    return (
      <div>
        <DisclaimerBanner />
        <ReportView
          reportId={reportId}
          onBack={() => {
            setReportId(null);
            setActiveReport(null);
          }}
        />
      </div>
    );
  }

  // If a report was just generated, show it
  if (activeReport) {
    return (
      <div>
        <DisclaimerBanner />
        <ReportView
          reportId={activeReport.id}
          onBack={() => {
            setActiveReport(null);
            setReportId(null);
            setShowRawCli(false);
            setRawCliOutput('');
            setErrorMsg(null);
          }}
        />
      </div>
    );
  }

  // Form view
  const srcDev = selectedNetwork?.devices.find(d => d.id === sourceDevId);
  const dstDev = selectedNetwork?.devices.find(d => d.id === destDevId);

  return (
    <div>
      <DisclaimerBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={26} color="var(--brand-blue)" />
            Run Network Diagnosis
          </h1>
          <p className="page-desc">
            Select source and destination devices, enter test results from Packet Tracer, and run the diagnostic engine.
          </p>
        </div>
      </div>

      {/* Scenario Presets */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Quick Test Scenarios
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {scenarios.map(sc => (
            <button
              key={sc.id}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => handleLoadScenario(sc)}
            >
              {sc.title.split(':')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          color: 'var(--status-healthy)',
          borderRadius: '6px',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '0.86rem'
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: 'var(--status-fault)',
          borderRadius: '6px',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '0.86rem'
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleAnalyze}>
        {/* Network & Device Selection */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RouterIcon size={18} />
            Network &amp; Endpoints
          </h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Network Profile</label>
              <select
                className="form-select"
                value={selectedNetwork?.id || ''}
                onChange={handleNetworkChange}
              >
                {networks.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Source Device</label>
              <select
                className="form-select"
                value={sourceDevId}
                onChange={e => setSourceDevId(e.target.value)}
              >
                {selectedNetwork?.devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Device</label>
              <select
                className="form-select"
                value={destDevId}
                onChange={e => setDestDevId(e.target.value)}
              >
                {selectedNetwork?.devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Device IP Display */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.86rem', marginTop: '8px' }}>
            {srcDev && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Source:</span>
                <span className="mono" style={{ marginLeft: '6px', color: 'var(--text-primary)' }}>
                  IP {srcDev.ip_address || '&mdash;'}
                </span>
                {srcDev.default_gateway && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>
                    Gateway: {srcDev.default_gateway}
                  </span>
                )}
              </div>
            )}
            {dstDev && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Destination:</span>
                <span className="mono" style={{ marginLeft: '6px', color: 'var(--text-primary)' }}>
                  IP {dstDev.ip_address || '&mdash;'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connectivity Tests */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
            Connectivity Test Results
          </h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source IP Config Valid?</label>
              <select
                className="form-select"
                value={sourceConfigValid}
                onChange={e => setSourceConfigValid(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Gateway Ping</label>
              <select
                className="form-select"
                value={gatewayPing}
                onChange={e => setGatewayPing(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Ping (End-to-End)</label>
              <select
                className="form-select"
                value={destPing}
                onChange={e => setDestPing(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* Intermediate Hops */}
          {intermediateHops.length > 0 && (
            <div style={{ marginTop: '18px' }}>
              <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Intermediate Router Hops
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {intermediateHops.map((hop, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.86rem', minWidth: '60px' }}>{hop.hop_device}</span>
                    <select
                      className="form-select"
                      style={{ flex: 1, padding: '6px 10px' }}
                      value={hop.reachability}
                      onChange={e => handleHopChange(idx, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Optional: Interface Observation */}
        <div className="card">
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowInterfaceObs(!showInterfaceObs)}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              Interface Observation (optional)
            </h2>
            {showInterfaceObs ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {showInterfaceObs && (
            <div style={{ marginTop: '14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Router Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. R1"
                    value={interfaceObs.router_name}
                    onChange={e => setInterfaceObs({ ...interfaceObs, router_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Interface Name</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="e.g. Serial0/1/0"
                    value={interfaceObs.interface_name}
                    onChange={e => setInterfaceObs({ ...interfaceObs, interface_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Status</label>
                  <select
                    className="form-select"
                    value={interfaceObs.administrative_status}
                    onChange={e => setInterfaceObs({ ...interfaceObs, administrative_status: e.target.value })}
                  >
                    <option value="up">up</option>
                    <option value="down">down</option>
                    <option value="administratively down">administratively down</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional: Routing Observation */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowRoutingObs(!showRoutingObs)}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              Routing Observation (optional)
            </h2>
            {showRoutingObs ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {showRoutingObs && (
            <div style={{ marginTop: '14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Router Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. R1"
                    value={routingObs.router_name}
                    onChange={e => setRoutingObs({ ...routingObs, router_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination Network</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="e.g. 192.168.30.0/24"
                    value={routingObs.destination_network}
                    onChange={e => setRoutingObs({ ...routingObs, destination_network: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Route Found?</label>
                  <select
                    className="form-select"
                    value={routingObs.route_found}
                    onChange={e => setRoutingObs({ ...routingObs, route_found: e.target.value })}
                  >
                    <option value="NO">NO (Missing)</option>
                    <option value="YES">YES (Exists)</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Raw CLI Output */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowRawCli(!showRawCli)}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              <Terminal size={18} color="var(--text-secondary)" />
              Raw CLI Output (optional)
            </h2>
            {showRawCli ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {showRawCli && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Paste output from Packet Tracer commands (ping, traceroute, show ip interface brief, show ip route).
              </p>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="Paste CLI output here..."
                value={rawCliOutput}
                onChange={e => setRawCliOutput(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={analyzing}
            style={{ minWidth: '240px' }}
          >
            <Play size={18} />
            {analyzing ? 'Analyzing...' : 'Run Diagnosis'}
          </button>
        </div>
      </form>
    </div>
  );
}
