import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Terminal,
  Layers,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import DisclaimerBanner from '../components/DisclaimerBanner';
import {
  fetchNetworks,
  fetchScenarios,
  runDiagnostics
} from '../api';

const STATUS_OPTIONS = ['NOT_TESTED', 'PASS', 'FAIL', 'UNKNOWN'];

export default function RunDiagnostics({ setActiveTab, setSelectedReportId }) {
  const [networks, setNetworks] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  // Form State
  const [sourceDevId, setSourceDevId] = useState('');
  const [destDevId, setDestDevId] = useState('');
  const [sourceIp, setSourceIp] = useState('');
  const [destIp, setDestIp] = useState('');

  // Structured Tests
  const [sourceConfigValid, setSourceConfigValid] = useState('PASS');
  const [configuredGateway, setConfiguredGateway] = useState('');
  const [gatewayPing, setGatewayPing] = useState('NOT_TESTED');
  const [destPing, setDestPing] = useState('NOT_TESTED');
  const [linkStatusObs, setLinkStatusObs] = useState('UNKNOWN');
  const [additionalObs, setAdditionalObs] = useState('');

  // Intermediate Hops
  const [intermediateHops, setIntermediateHops] = useState([
    { hop_device: 'R1', reachability: 'NOT_TESTED' },
    { hop_device: 'R2', reachability: 'NOT_TESTED' },
    { hop_device: 'R3', reachability: 'NOT_TESTED' }
  ]);

  // Conditional Sections
  const [suspectInterface, setSuspectInterface] = useState(false);
  const [interfaceObs, setInterfaceObs] = useState({
    router_name: 'R1',
    interface_name: 'Serial0/1/0',
    operational_status: 'down',
    administrative_status: 'administratively down'
  });

  const [suspectRouting, setSuspectRouting] = useState(false);
  const [routingObs, setRoutingObs] = useState({
    router_name: 'R1',
    destination_network: '192.168.30.0/24',
    expected_route: 'via 10.0.12.2',
    route_found: 'NO',
    next_hop: '10.0.12.2'
  });

  const [suspectAcl, setSuspectAcl] = useState(false);
  const [aclObs, setAclObs] = useState({
    device_name: 'R1',
    issue_type: 'ACL_DENY',
    details: 'access-list 10 deny host 192.168.10.10 dropping ICMP'
  });

  // Raw CLI Evidence Accordion
  const [showRawCli, setShowRawCli] = useState(false);
  const [rawPing, setRawPing] = useState('');
  const [rawTrace, setRawTrace] = useState('');
  const [rawIntBrief, setRawIntBrief] = useState('');
  const [rawIpRoute, setRawIpRoute] = useState('');
  const [rawRunConfig, setRawRunConfig] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [netList, scList] = await Promise.all([fetchNetworks(), fetchScenarios()]);
        setNetworks(netList);
        setScenarios(scList);
        if (netList.length > 0) {
          const firstNet = netList[0];
          setSelectedNetworkId(firstNet.id);
          setSelectedNetwork(firstNet);

          const pc = firstNet.devices.find(d => d.type === 'PC') || firstNet.devices[0];
          const srv = firstNet.devices.find(d => d.type === 'Server') || firstNet.devices[firstNet.devices.length - 1];

          if (pc) {
            setSourceDevId(pc.id);
            setSourceIp(pc.ip_address || '');
            setConfiguredGateway(pc.default_gateway || '');
          }
          if (srv) {
            setDestDevId(srv.id);
            setDestIp(srv.ip_address || '');
          }
        }
      } catch (err) {
        setErrorMsg(err.message);
      }
    }
    init();
  }, []);

  const handleNetworkChange = (netId) => {
    setSelectedNetworkId(netId);
    const net = networks.find(n => n.id === netId);
    setSelectedNetwork(net);
    if (net && net.devices.length > 0) {
      const pc = net.devices.find(d => d.type === 'PC') || net.devices[0];
      const srv = net.devices.find(d => d.type === 'Server') || net.devices[net.devices.length - 1];
      if (pc) {
        setSourceDevId(pc.id);
        setSourceIp(pc.ip_address || '');
        setConfiguredGateway(pc.default_gateway || '');
      }
      if (srv) {
        setDestDevId(srv.id);
        setDestIp(srv.ip_address || '');
      }
    }
  };

  const handleSourceChange = (devId) => {
    setSourceDevId(devId);
    const dev = selectedNetwork?.devices.find(d => d.id === devId);
    if (dev) {
      setSourceIp(dev.ip_address || '');
      setConfiguredGateway(dev.default_gateway || '');
    }
  };

  const handleDestChange = (devId) => {
    setDestDevId(devId);
    const dev = selectedNetwork?.devices.find(d => d.id === devId);
    if (dev) {
      setDestIp(dev.ip_address || '');
    }
  };

  const handleLoadScenario = (scenario) => {
    const sr = scenario.structured_results;
    setSourceDevId(scenario.source_device_id);
    setDestDevId(scenario.destination_device_id);

    const srcDev = selectedNetwork?.devices.find(d => d.id === scenario.source_device_id);
    const dstDev = selectedNetwork?.devices.find(d => d.id === scenario.destination_device_id);
    setSourceIp(sr.configured_source_ip || srcDev?.ip_address || '');
    setDestIp(dstDev?.ip_address || '');

    setSourceConfigValid(sr.source_config_valid || 'PASS');
    setConfiguredGateway(sr.configured_default_gateway || srcDev?.default_gateway || '');
    setGatewayPing(sr.default_gateway_ping || 'NOT_TESTED');
    setDestPing(sr.destination_ping || 'NOT_TESTED');
    setLinkStatusObs(sr.link_status_observation || 'UNKNOWN');
    setAdditionalObs(sr.additional_observations || '');

    if (sr.intermediate_hops && sr.intermediate_hops.length > 0) {
      setIntermediateHops(sr.intermediate_hops);
    } else {
      setIntermediateHops([
        { hop_device: 'R1', reachability: 'NOT_TESTED' },
        { hop_device: 'R2', reachability: 'NOT_TESTED' },
        { hop_device: 'R3', reachability: 'NOT_TESTED' }
      ]);
    }

    if (sr.interface_observations && sr.interface_observations.length > 0) {
      setSuspectInterface(true);
      setInterfaceObs(sr.interface_observations[0]);
    } else {
      setSuspectInterface(false);
    }

    if (sr.routing_observations && sr.routing_observations.length > 0) {
      setSuspectRouting(true);
      setRoutingObs(sr.routing_observations[0]);
    } else {
      setSuspectRouting(false);
    }

    if (sr.acl_vlan_observation) {
      setSuspectAcl(true);
      setAclObs(sr.acl_vlan_observation);
    } else {
      setSuspectAcl(false);
    }

    const raw = scenario.raw_evidence || {};
    setRawPing(raw.ping_output || '');
    setRawTrace(raw.traceroute_output || '');
    setRawIntBrief(raw.show_ip_int_brief || '');
    setRawIpRoute(raw.show_ip_route || '');
    setRawRunConfig(raw.show_running_config || '');

    if (raw.ping_output || raw.show_ip_route || raw.show_ip_int_brief) {
      setShowRawCli(true);
    }
  };

  const handleHopReachabilityChange = (idx, value) => {
    setIntermediateHops(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], reachability: value };
      return next;
    });
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedNetworkId) {
      alert('Please select a network profile.');
      return;
    }
    if (!sourceDevId || !destDevId) {
      alert('Please select both source and destination devices.');
      return;
    }

    const payload = {
      network_id: selectedNetworkId,
      source_device_id: sourceDevId,
      destination_device_id: destDevId,
      structured_results: {
        source_config_valid: sourceConfigValid,
        configured_source_ip: sourceIp,
        configured_default_gateway: configuredGateway,
        default_gateway_ping: gatewayPing,
        intermediate_hops: intermediateHops,
        destination_ping: destPing,
        interface_observations: suspectInterface ? [interfaceObs] : [],
        routing_observations: suspectRouting ? [routingObs] : [],
        acl_vlan_observation: suspectAcl ? aclObs : null,
        link_status_observation: linkStatusObs,
        additional_observations: additionalObs || null
      },
      raw_evidence: {
        ping_output: rawPing || null,
        traceroute_output: rawTrace || null,
        show_ip_int_brief: rawIntBrief || null,
        show_ip_route: rawIpRoute || null,
        show_running_config: rawRunConfig || null
      }
    };

    try {
      setAnalyzing(true);
      const report = await runDiagnostics(payload);
      setSelectedReportId(report.id);
      setActiveTab('report');
    } catch (err) {
      alert(`Diagnosis Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <DisclaimerBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={26} color="#3b82f6" />
            Run Network Diagnostic Session
          </h1>
          <p className="page-desc">
            Enter Packet Tracer test findings or paste command outputs for automated rule-driven diagnosis
          </p>
        </div>
      </div>

      {/* 1-Click Scenario Preset Loader Bar */}
      <div className="card" style={{ marginBottom: '24px', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 600, color: '#60a5fa' }}>
            <Sparkles size={18} />
            Quick Scenario Presets (Instant Demonstration & Verification)
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Load verified Cisco Packet Tracer scenarios
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {scenarios.map(sc => (
            <button
              key={sc.id}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '6px 10px' }}
              onClick={() => handleLoadScenario(sc)}
            >
              {sc.title.split(':')[0]} ({sc.title.split(':')[1]?.trim() || sc.title})
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleAnalyze}>
        {/* Network & Endpoints Selection Card */}
        <div className="card" style={{ marginBottom: '22px' }}>
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} color="#3b82f6" />
              1. Diagnostic Session Scope & Endpoints
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Network Profile</label>
              <select
                className="form-select"
                value={selectedNetworkId}
                onChange={e => handleNetworkChange(e.target.value)}
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
                onChange={e => handleSourceChange(e.target.value)}
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
                onChange={e => handleDestChange(e.target.value)}
              >
                {selectedNetwork?.devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Configured Source IP Address</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="e.g. 192.168.10.10"
                value={sourceIp}
                onChange={e => setSourceIp(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Configured Source Default Gateway</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="e.g. 192.168.10.1"
                value={configuredGateway}
                onChange={e => setConfiguredGateway(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Destination IP Address</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="e.g. 192.168.30.10"
                value={destIp}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Structured Connectivity Tests Card */}
        <div className="card" style={{ marginBottom: '22px' }}>
          <div className="card-header">
            <div className="card-title">
              <Activity size={18} color="#10b981" />
              2. Structured Connectivity Test Results (from Packet Tracer)
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Select exact test outcome (Unknown/Not Tested is not treated as Pass)
            </span>
          </div>

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
              <label className="form-label">Default Gateway Reachability (Ping)</label>
              <select
                className="form-select"
                value={gatewayPing}
                onChange={e => setGatewayPing(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Reachability (End-to-End Ping)</label>
              <select
                className="form-select"
                value={destPing}
                onChange={e => setDestPing(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Physical Link Observation</label>
              <select
                className="form-select"
                value={linkStatusObs}
                onChange={e => setLinkStatusObs(e.target.value)}
              >
                <option value="ALL_UP">ALL_UP (All lights green)</option>
                <option value="LINK_DOWN">LINK_DOWN (Cable disconnected / red indicator)</option>
                <option value="UNKNOWN">UNKNOWN / Not Inspected</option>
              </select>
            </div>
          </div>

          {/* Intermediate Router Hops Reachability */}
          <div style={{ marginTop: '16px', background: '#0d1424', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#38bdf8' }}>
              Intermediate Router Hop Reachabilities (Traceroute / Direct Ping Check):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '10px' }}>
              {intermediateHops.map((hop, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{hop.hop_device} Reachability:</span>
                  <select
                    className="form-select"
                    style={{ width: '120px', padding: '6px' }}
                    value={hop.reachability}
                    onChange={e => handleHopReachabilityChange(idx, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conditional Diagnostic Findings Card */}
        <div className="card" style={{ marginBottom: '22px' }}>
          <div className="card-header">
            <div className="card-title">
              <Sliders size={18} color="#f59e0b" />
              3. Specific Component Suspicions & Conditional Evidence
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={suspectInterface}
                onChange={e => setSuspectInterface(e.target.checked)}
              />
              <span>Interface failure suspected</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={suspectRouting}
                onChange={e => setSuspectRouting(e.target.checked)}
              />
              <span>Routing problem suspected</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={suspectAcl}
                onChange={e => setSuspectAcl(e.target.checked)}
              />
              <span>ACL or VLAN issue suspected</span>
            </label>
          </div>

          {/* Conditional: Interface */}
          {suspectInterface && (
            <div style={{ background: '#0d1424', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f87171', marginBottom: '10px' }}>
                Suspected Router Interface Findings:
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Router Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={interfaceObs.router_name}
                    onChange={e => setInterfaceObs({ ...interfaceObs, router_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Interface Name</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={interfaceObs.interface_name}
                    onChange={e => setInterfaceObs({ ...interfaceObs, interface_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Operational Status (Line)</label>
                  <select
                    className="form-select"
                    value={interfaceObs.operational_status}
                    onChange={e => setInterfaceObs({ ...interfaceObs, operational_status: e.target.value })}
                  >
                    <option value="up">up</option>
                    <option value="down">down</option>
                    <option value="unknown">unknown</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Administrative Status</label>
                  <select
                    className="form-select"
                    value={interfaceObs.administrative_status}
                    onChange={e => setInterfaceObs({ ...interfaceObs, administrative_status: e.target.value })}
                  >
                    <option value="administratively down">administratively down</option>
                    <option value="up">up</option>
                    <option value="down">down</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Routing */}
          {suspectRouting && (
            <div style={{ background: '#0d1424', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fbbf24', marginBottom: '10px' }}>
                Routing Table Findings:
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Router Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={routingObs.router_name}
                    onChange={e => setRoutingObs({ ...routingObs, router_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination Network</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={routingObs.destination_network}
                    onChange={e => setRoutingObs({ ...routingObs, destination_network: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Route Found in Table?</label>
                  <select
                    className="form-select"
                    value={routingObs.route_found}
                    onChange={e => setRoutingObs({ ...routingObs, route_found: e.target.value })}
                  >
                    <option value="NO">NO (Route Missing)</option>
                    <option value="YES">YES (Route Exists)</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Next-Hop IP</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={routingObs.next_hop || ''}
                    onChange={e => setRoutingObs({ ...routingObs, next_hop: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: ACL / VLAN */}
          {suspectAcl && (
            <div style={{ background: '#0d1424', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#a78bfa', marginBottom: '10px' }}>
                ACL / VLAN Diagnostic Findings:
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Device Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={aclObs.device_name}
                    onChange={e => setAclObs({ ...aclObs, device_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Issue Category</label>
                  <select
                    className="form-select"
                    value={aclObs.issue_type}
                    onChange={e => setAclObs({ ...aclObs, issue_type: e.target.value })}
                  >
                    <option value="ACL_DENY">ACL_DENY (Access-list dropping traffic)</option>
                    <option value="VLAN_MISMATCH">VLAN_MISMATCH (Port on wrong VLAN)</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Observation Details</label>
                  <input
                    type="text"
                    className="form-input"
                    value={aclObs.details}
                    onChange={e => setAclObs({ ...aclObs, details: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional Raw Cisco CLI Evidence Accordion */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div
            className="card-header"
            style={{ cursor: 'pointer', marginBottom: showRawCli ? '18px' : 0, borderBottom: showRawCli ? '1px solid var(--border-subtle)' : 'none' }}
            onClick={() => setShowRawCli(!showRawCli)}
          >
            <div className="card-title">
              <Terminal size={18} color="#38bdf8" />
              4. Optional: Paste Raw Cisco IOS / Packet Tracer CLI Outputs
            </div>
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {showRawCli ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showRawCli && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                The backend parser safely analyzes pasted command outputs without executing shell commands on your system.
              </p>

              <div className="form-row" style={{ marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">ping Command Output</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="e.g. Success rate is 0 percent (0/5) or Destination host unreachable"
                    value={rawPing}
                    onChange={e => setRawPing(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">tracert / traceroute Output</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="e.g. 1 192.168.10.1, 2 10.0.12.2, 3 * * * Request timed out"
                    value={rawTrace}
                    onChange={e => setRawTrace(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">show ip interface brief Output</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Interface IP-Address OK? Method Status Protocol..."
                    value={rawIntBrief}
                    onChange={e => setRawIntBrief(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">show ip route Output</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Gateway of last resort is not set... S 192.168.30.0/24 [1/0] via 10.0.12.2"
                    value={rawIpRoute}
                    onChange={e => setRawIpRoute(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">show running-config / show access-lists (Snippets)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="access-list 10 deny host 192.168.10.10..."
                  value={rawRunConfig}
                  onChange={e => setRawRunConfig(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ minWidth: '280px', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' }}
            disabled={analyzing}
          >
            <Play size={18} />
            {analyzing ? 'Analyzing Network Telemetry...' : 'Analyze Network Connectivity'}
          </button>
        </div>
      </form>
    </div>
  );
}
