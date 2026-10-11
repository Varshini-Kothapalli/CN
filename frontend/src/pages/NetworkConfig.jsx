import React, { useState, useEffect } from 'react';
import {
  Network,
  Plus,
  Trash2,
  Edit,
  Server,
  Laptop,
  Layers,
  Router as RouterIcon,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Link as LinkIcon,
  Save,
  X,
  FolderPlus,
  Info
} from 'lucide-react';
import {
  fetchNetworks,
  createNetwork,
  updateNetwork,
  deleteNetwork,
  resetSampleNetwork
} from '../api';

const DEVICE_ICONS = {
  PC: Laptop,
  Server: Server,
  Switch: Layers,
  Router: RouterIcon,
};

function isValidIp(ip) {
  if (!ip) return true; // Optional for switches
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

export default function NetworkConfig() {
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Create Network Profile Modal state
  const [showCreateNetworkModal, setShowCreateNetworkModal] = useState(false);
  const [newNetworkForm, setNewNetworkForm] = useState({
    name: '',
    description: '',
    template: 'empty' // 'empty' or 'cisco_sample'
  });

  // Device Modal state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    id: '',
    name: '',
    type: 'PC',
    ip_address: '',
    subnet_mask: '255.255.255.0',
    default_gateway: '',
    interfaces: []
  });

  // Link Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({
    id: '',
    source_device: '',
    source_interface: '',
    target_device: '',
    target_interface: '',
    status: 'up'
  });

  // New Interface state inside Device modal
  const [newInterface, setNewInterface] = useState({
    name: '',
    ip_address: '',
    subnet_mask: '255.255.255.0',
    status: 'up',
    protocol: 'up'
  });

  const loadAllNetworks = async () => {
    try {
      setLoading(true);
      const data = await fetchNetworks();
      setNetworks(data);
      if (data.length > 0) {
        setSelectedNetwork(prev => (prev ? data.find(n => n.id === prev.id) || data[0] : data[0]));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllNetworks();
  }, []);

  const handleSelectNetwork = (netId) => {
    const net = networks.find(n => n.id === netId);
    if (net) setSelectedNetwork(net);
  };

  const handleCreateNetworkSubmit = async (e) => {
    e.preventDefault();
    if (!newNetworkForm.name.trim()) {
      alert('Please enter a network profile name.');
      return;
    }
    const newId = `net-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const newProfile = {
      id: newId,
      name: newNetworkForm.name.trim(),
      description: newNetworkForm.description.trim() || 'Custom Network Topology',
      devices: [],
      links: [],
      created_at: now,
      updated_at: now
    };

    try {
      const created = await createNetwork(newProfile);
      setSuccessMsg(`Network profile "${created.name}" created successfully! Now add devices below.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setShowCreateNetworkModal(false);
      setNewNetworkForm({ name: '', description: '', template: 'empty' });
      await loadAllNetworks();
      setSelectedNetwork(created);
    } catch (err) {
      alert(`Error creating network profile: ${err.message}`);
    }
  };

  const handleDeleteCurrentNetwork = async () => {
    if (networks.length <= 1) {
      alert('You must keep at least one network profile. To reset it, click "Load Sample Cisco Topology".');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete network profile "${selectedNetwork.name}" and all its registered devices and links?`)) return;

    try {
      await deleteNetwork(selectedNetwork.id);
      setSuccessMsg(`Network profile "${selectedNetwork.name}" deleted.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadAllNetworks();
    } catch (err) {
      alert(`Error deleting network profile: ${err.message}`);
    }
  };

  const handleResetSample = async () => {
    if (!window.confirm('Reload the standard Cisco Packet Tracer multi-router lab topology?')) return;
    try {
      const sample = await resetSampleNetwork();
      setSuccessMsg('Standard Cisco sample topology reloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadAllNetworks();
      setSelectedNetwork(sample);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenDeviceModal = (device = null) => {
    if (device) {
      setEditingDevice(device);
      setDeviceForm({ ...device, interfaces: [...(device.interfaces || [])] });
    } else {
      const newId = `dev-${Date.now().toString().slice(-6)}`;
      setEditingDevice(null);
      setDeviceForm({
        id: newId,
        name: `Node-${newId.slice(-3)}`,
        type: 'PC',
        ip_address: '',
        subnet_mask: '255.255.255.0',
        default_gateway: '',
        interfaces: []
      });
    }
    setShowDeviceModal(true);
  };

  const handleAddInterface = () => {
    if (!newInterface.name) return;
    setDeviceForm(prev => ({
      ...prev,
      interfaces: [...prev.interfaces, { ...newInterface }]
    }));
    setNewInterface({
      name: '',
      ip_address: '',
      subnet_mask: '255.255.255.0',
      status: 'up',
      protocol: 'up'
    });
  };

  const handleRemoveInterface = (idx) => {
    setDeviceForm(prev => ({
      ...prev,
      interfaces: prev.interfaces.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveDevice = async () => {
    if (deviceForm.ip_address && !isValidIp(deviceForm.ip_address)) {
      alert(`Invalid IP address format: '${deviceForm.ip_address}'`);
      return;
    }
    if (deviceForm.default_gateway && !isValidIp(deviceForm.default_gateway)) {
      alert(`Invalid default gateway format: '${deviceForm.default_gateway}'`);
      return;
    }

    if (!editingDevice) {
      const isDuplicate = selectedNetwork.devices.some(
        d => d.id === deviceForm.id || d.name.toLowerCase() === deviceForm.name.toLowerCase()
      );
      if (isDuplicate) {
        alert(`Device ID or Name '${deviceForm.name}' already exists in this network profile!`);
        return;
      }
    }

    const updatedDevices = editingDevice
      ? selectedNetwork.devices.map(d => (d.id === editingDevice.id ? { ...deviceForm } : d))
      : [...selectedNetwork.devices, { ...deviceForm }];

    const updatedProfile = { ...selectedNetwork, devices: updatedDevices };

    try {
      const saved = await updateNetwork(selectedNetwork.id, updatedProfile);
      setSelectedNetwork(saved);
      setShowDeviceModal(false);
      setSuccessMsg('Device saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadAllNetworks();
    } catch (err) {
      alert(`Error saving device: ${err.message}`);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Delete this device and its associated links?')) return;
    const updatedDevices = selectedNetwork.devices.filter(d => d.id !== deviceId);
    const updatedLinks = selectedNetwork.links.filter(l => l.source_device !== deviceId && l.target_device !== deviceId);
    const updatedProfile = { ...selectedNetwork, devices: updatedDevices, links: updatedLinks };

    try {
      const saved = await updateNetwork(selectedNetwork.id, updatedProfile);
      setSelectedNetwork(saved);
      setSuccessMsg('Device deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadAllNetworks();
    } catch (err) {
      alert(`Error deleting device: ${err.message}`);
    }
  };

  const handleOpenLinkModal = () => {
    if (selectedNetwork.devices.length < 2) {
      alert('You need at least two devices to create a physical connection link.');
      return;
    }
    const devA = selectedNetwork.devices[0];
    const devB = selectedNetwork.devices[1];
    setLinkForm({
      id: `link-${Date.now().toString().slice(-6)}`,
      source_device: devA.id,
      source_interface: devA.interfaces?.[0]?.name || 'FastEthernet0/1',
      target_device: devB.id,
      target_interface: devB.interfaces?.[0]?.name || 'FastEthernet0/1',
      status: 'up'
    });
    setShowLinkModal(true);
  };

  const handleSaveLink = async () => {
    if (linkForm.source_device === linkForm.target_device) {
      alert('Source and target devices cannot be the same!');
      return;
    }

    const updatedLinks = [...selectedNetwork.links, { ...linkForm }];
    const updatedProfile = { ...selectedNetwork, links: updatedLinks };

    try {
      const saved = await updateNetwork(selectedNetwork.id, updatedProfile);
      setSelectedNetwork(saved);
      setShowLinkModal(false);
      setSuccessMsg('Link connection added.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadAllNetworks();
    } catch (err) {
      alert(`Error saving link: ${err.message}`);
    }
  };

  const handleDeleteLink = async (linkId) => {
    const updatedLinks = selectedNetwork.links.filter(l => l.id !== linkId);
    const updatedProfile = { ...selectedNetwork, links: updatedLinks };

    try {
      const saved = await updateNetwork(selectedNetwork.id, updatedProfile);
      setSelectedNetwork(saved);
      loadAllNetworks();
    } catch (err) {
      alert(`Error deleting link: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Network size={26} color="#3b82f6" />
            Network Profile & Topology Manager
          </h1>
          <p className="page-desc">
            Create custom network profiles or edit devices, interfaces, IP addresses, and links
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateNetworkModal(true)}>
            <FolderPlus size={14} />
            Create New Network Profile
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleResetSample}>
            <RotateCcw size={14} />
            Reload Cisco Sample Lab
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem'
        }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Network Profile Selection & Guide Card */}
      <div className="card" style={{ marginBottom: '24px', borderColor: 'rgba(59, 130, 246, 0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Active Network Profile:
            </label>
            <select
              className="form-select"
              style={{ fontWeight: 600, fontSize: '0.92rem', color: '#60a5fa' }}
              value={selectedNetwork?.id || ''}
              onChange={e => handleSelectNetwork(e.target.value)}
            >
              {networks.map(net => (
                <option key={net.id} value={net.id}>
                  {net.name} ({net.devices?.length || 0} devices, {net.links?.length || 0} links)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenDeviceModal()}>
              <Plus size={14} /> Add Device
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenLinkModal}>
              <LinkIcon size={14} /> Add Link
            </button>
            {networks.length > 1 && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteCurrentNetwork} title="Delete active network profile">
                <Trash2 size={14} /> Delete Profile
              </button>
            )}
          </div>
        </div>

        {/* Quick Instructions Banner */}
        <div style={{
          background: '#090d16',
          borderRadius: '8px',
          padding: '12px 16px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)'
        }}>
          <Info size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>How to set up your simulated Packet Tracer network:</strong>
            <div style={{ marginTop: '4px', lineHeight: 1.5 }}>
              1. <strong>Select or Create a Profile</strong> above (e.g. your lab assignment name).<br/>
              2. Click <strong>"Add Device"</strong> to register each PC, Switch, Router, or Server with its IP, subnet mask, and default gateway.<br/>
              3. Click <strong>"Add Link"</strong> to connect interfaces (e.g., PC1 FastEthernet0 to Switch1, Router1 Serial0/1/0 to Router2 Serial0/1/0).<br/>
              4. Head to the <strong>"Run Diagnostics"</strong> tab to diagnose failures and localize faults!
            </div>
          </div>
        </div>
      </div>

      {selectedNetwork && (
        <>
          {/* Topology Visual Preview */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">
                  <Network size={18} color="#38bdf8" />
                  {selectedNetwork.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedNetwork.description || 'No description provided'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-healthy">
                  {selectedNetwork.devices.length} Devices
                </span>
                <span className="badge badge-possible">
                  {selectedNetwork.links.length} Links
                </span>
              </div>
            </div>

            {/* Visual Topology Diagram */}
            <div className="topology-view">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Simulated Packet Tracer Communication Layout:
              </div>
              {selectedNetwork.devices.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '10px' }}>
                  {selectedNetwork.devices.map((device, idx) => {
                    const Icon = DEVICE_ICONS[device.type] || Server;
                    return (
                      <React.Fragment key={device.id}>
                        <div className="topology-node" style={{ cursor: 'pointer' }} onClick={() => handleOpenDeviceModal(device)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                            <Icon size={24} color={device.type === 'Router' ? '#38bdf8' : device.type === 'Switch' ? '#a78bfa' : '#34d399'} />
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {device.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {device.type}
                          </div>
                          {device.ip_address && (
                            <div className="mono" style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '4px' }}>
                              {device.ip_address}
                            </div>
                          )}
                        </div>
                        {idx < selectedNetwork.devices.length - 1 && (
                          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            <ChevronRight size={18} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No devices added to this network profile yet. Click "Add Device" to get started!
                </div>
              )}
            </div>
          </div>

          {/* Devices Table & Links Grid */}
          <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
            {/* Registered Devices List */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Server size={18} color="#3b82f6" />
                  Devices & IP Configuration ({selectedNetwork.devices.length})
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenDeviceModal()}>
                  <Plus size={14} /> Add Device
                </button>
              </div>

              {selectedNetwork.devices.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Device</th>
                        <th>Type</th>
                        <th>IP / Gateway</th>
                        <th>Interfaces</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNetwork.devices.map(device => {
                        const Icon = DEVICE_ICONS[device.type] || Server;
                        return (
                          <tr key={device.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon size={16} color="#60a5fa" />
                                <strong style={{ fontSize: '0.88rem' }}>{device.name}</strong>
                              </div>
                              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                ID: {device.id}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {device.type}
                              </span>
                            </td>
                            <td>
                              {device.ip_address ? (
                                <div className="mono" style={{ fontSize: '0.8rem' }}>
                                  {device.ip_address}
                                  {device.default_gateway && (
                                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      GW: {device.default_gateway}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>N/A (L2 Switch)</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                                {device.interfaces?.length || 0} Port(s)
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 8px' }}
                                  title="Edit Device"
                                  onClick={() => handleOpenDeviceModal(device)}
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '4px 8px' }}
                                  title="Delete Device"
                                  onClick={() => handleDeleteDevice(device.id)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No devices registered yet.
                </div>
              )}
            </div>

            {/* Links / Connections List */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <LinkIcon size={18} color="#10b981" />
                  Network Connections (Links) ({selectedNetwork.links.length})
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleOpenLinkModal}>
                  <Plus size={14} /> Add Link
                </button>
              </div>

              {selectedNetwork.links.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Link ID</th>
                        <th>Endpoint A</th>
                        <th>Endpoint B</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNetwork.links.map(link => {
                        const devA = selectedNetwork.devices.find(d => d.id === link.source_device);
                        const devB = selectedNetwork.devices.find(d => d.id === link.target_device);
                        return (
                          <tr key={link.id}>
                            <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {link.id}
                            </td>
                            <td>
                              <strong>{devA?.name || link.source_device}</strong>
                              <div className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                                {link.source_interface}
                              </div>
                            </td>
                            <td>
                              <strong>{devB?.name || link.target_device}</strong>
                              <div className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                                {link.target_interface}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-pass">{link.status}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '4px 8px' }}
                                title="Delete Link"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No links created yet. Click "Add Link" to connect device interfaces!
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal: Create New Network Profile */}
      {showCreateNetworkModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} color="#3b82f6" />
                Create New Network Profile
              </h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setShowCreateNetworkModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNetworkSubmit}>
              <div className="form-group">
                <label className="form-label">Network Profile Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. College Lab Assignment 3, WAN OSPF Topology..."
                  value={newNetworkForm.name}
                  onChange={e => setNewNetworkForm({ ...newNetworkForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Objective</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. 2 Routers, 2 Switches connecting Accounting PC to Database Server in Packet Tracer..."
                  value={newNetworkForm.description}
                  onChange={e => setNewNetworkForm({ ...newNetworkForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateNetworkModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Add/Edit Modal */}
      {showDeviceModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={20} color="#3b82f6" />
                {editingDevice ? `Edit Device: ${editingDevice.name}` : 'Register New Device'}
              </h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setShowDeviceModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Device Identifier (ID)</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={deviceForm.id}
                  disabled={!!editingDevice}
                  onChange={e => setDeviceForm({ ...deviceForm, id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Device Display Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. PC1, R1, Server1, SW1"
                  value={deviceForm.name}
                  onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Device Role / Type</label>
                <select
                  className="form-select"
                  value={deviceForm.type}
                  onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}
                >
                  <option value="PC">PC (Workstation)</option>
                  <option value="Server">Server</option>
                  <option value="Router">Router</option>
                  <option value="Switch">Switch (L2)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Primary IP Address</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. 192.168.10.10"
                  value={deviceForm.ip_address || ''}
                  onChange={e => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subnet Mask</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. 255.255.255.0"
                  value={deviceForm.subnet_mask || ''}
                  onChange={e => setDeviceForm({ ...deviceForm, subnet_mask: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Default Gateway (Host)</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. 192.168.10.1"
                  value={deviceForm.default_gateway || ''}
                  onChange={e => setDeviceForm({ ...deviceForm, default_gateway: e.target.value })}
                />
              </div>
            </div>

            {/* Router/Switch Interfaces Section */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Configured Interfaces & Ports ({deviceForm.interfaces.length})
              </h3>

              {deviceForm.interfaces.length > 0 && (
                <div style={{ marginBottom: '14px', maxHeight: '160px', overflowY: 'auto' }}>
                  {deviceForm.interfaces.map((intf, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#0d1424',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        marginBottom: '6px'
                      }}
                    >
                      <div>
                        <strong className="mono" style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{intf.name}</strong>
                        {intf.ip_address && (
                          <span className="mono" style={{ marginLeft: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            IP: {intf.ip_address}
                          </span>
                        )}
                        <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: intf.status === 'up' ? '#34d399' : '#f87171' }}>
                          Status: {intf.status}
                        </span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '2px 6px' }}
                        onClick={() => handleRemoveInterface(idx)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Interface Inline Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Interface Name</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="e.g. GigabitEthernet0/0, Serial0/1/0"
                    value={newInterface.name}
                    onChange={e => setNewInterface({ ...newInterface, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Interface IP (optional)</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="e.g. 10.0.12.1"
                    value={newInterface.ip_address}
                    onChange={e => setNewInterface({ ...newInterface, ip_address: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Port Status</label>
                  <select
                    className="form-select"
                    value={newInterface.status}
                    onChange={e => setNewInterface({ ...newInterface, status: e.target.value })}
                  >
                    <option value="up">up</option>
                    <option value="down">down</option>
                    <option value="administratively down">admin down</option>
                  </select>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddInterface}>
                  <Plus size={14} /> Add Port
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeviceModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveDevice}>
                <Save size={15} /> Save Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Add Modal */}
      {showLinkModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={20} color="#10b981" />
                Connect Devices (Physical Link)
              </h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setShowLinkModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Link Identifier</label>
              <input
                type="text"
                className="form-input mono"
                value={linkForm.id}
                onChange={e => setLinkForm({ ...linkForm, id: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Source Node</label>
                <select
                  className="form-select"
                  value={linkForm.source_device}
                  onChange={e => {
                    const dev = selectedNetwork.devices.find(d => d.id === e.target.value);
                    setLinkForm({
                      ...linkForm,
                      source_device: e.target.value,
                      source_interface: dev?.interfaces?.[0]?.name || 'FastEthernet0'
                    });
                  }}
                >
                  {selectedNetwork.devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Source Port / Interface</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. GigabitEthernet0/0"
                  value={linkForm.source_interface}
                  onChange={e => setLinkForm({ ...linkForm, source_interface: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target Node</label>
                <select
                  className="form-select"
                  value={linkForm.target_device}
                  onChange={e => {
                    const dev = selectedNetwork.devices.find(d => d.id === e.target.value);
                    setLinkForm({
                      ...linkForm,
                      target_device: e.target.value,
                      target_interface: dev?.interfaces?.[0]?.name || 'FastEthernet0'
                    });
                  }}
                >
                  {selectedNetwork.devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Port / Interface</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. GigabitEthernet0/1"
                  value={linkForm.target_interface}
                  onChange={e => setLinkForm({ ...linkForm, target_interface: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveLink}>
                <Save size={15} /> Save Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
