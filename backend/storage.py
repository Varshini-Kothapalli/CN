import os
import json
import threading
from typing import List, Dict, Any, Optional
from backend.sample_data import get_sample_network

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
NETWORKS_FILE = os.path.join(DATA_DIR, "networks.json")
DIAGNOSTICS_FILE = os.path.join(DATA_DIR, "diagnostics.json")

_lock = threading.Lock()


def _ensure_data_files():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(NETWORKS_FILE):
        sample = get_sample_network()
        _atomic_write_json(NETWORKS_FILE, [sample])
    if not os.path.exists(DIAGNOSTICS_FILE) or os.path.getsize(DIAGNOSTICS_FILE) == 0:
        _atomic_write_json(DIAGNOSTICS_FILE, [])


def _atomic_write_json(filepath: str, data: Any):
    tmp_path = f"{filepath}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, filepath)


def load_networks() -> List[Dict[str, Any]]:
    with _lock:
        _ensure_data_files()
        try:
            with open(NETWORKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []


def save_networks(networks: List[Dict[str, Any]]) -> None:
    with _lock:
        _ensure_data_files()
        _atomic_write_json(NETWORKS_FILE, networks)


def get_network(network_id: str) -> Optional[Dict[str, Any]]:
    networks = load_networks()
    for net in networks:
        if net["id"] == network_id:
            return net
    return None


def save_network(network: Dict[str, Any]) -> Dict[str, Any]:
    networks = load_networks()
    for i, net in enumerate(networks):
        if net["id"] == network["id"]:
            networks[i] = network
            save_networks(networks)
            return network
    networks.append(network)
    save_networks(networks)
    return network


def update_network(network_id: str, network: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Replace an existing profile atomically and report when it no longer exists."""
    with _lock:
        _ensure_data_files()
        with open(NETWORKS_FILE, "r", encoding="utf-8") as f:
            networks = json.load(f)

        if not isinstance(networks, list):
            raise ValueError("Stored network profiles must be a JSON array")

        for index, stored_network in enumerate(networks):
            if stored_network.get("id") == network_id:
                networks[index] = network
                _atomic_write_json(NETWORKS_FILE, networks)
                return network

        return None


def delete_network(network_id: str) -> bool:
    networks = load_networks()
    original_len = len(networks)
    networks = [net for net in networks if net["id"] != network_id]
    if len(networks) < original_len:
        save_networks(networks)
        return True
    return False


def reset_sample_network() -> Dict[str, Any]:
    sample = get_sample_network()
    networks = load_networks()
    found = False
    for i, net in enumerate(networks):
        if net["id"] == sample["id"]:
            networks[i] = sample
            found = True
            break
    if not found:
        networks.append(sample)
    save_networks(networks)
    return sample


def load_diagnostics() -> List[Dict[str, Any]]:
    with _lock:
        _ensure_data_files()
        try:
            with open(DIAGNOSTICS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []


def save_diagnostics(diagnostics: List[Dict[str, Any]]) -> None:
    with _lock:
        _ensure_data_files()
        _atomic_write_json(DIAGNOSTICS_FILE, diagnostics)


def get_diagnostic(diagnostic_id: str) -> Optional[Dict[str, Any]]:
    diagnostics = load_diagnostics()
    for diag in diagnostics:
        if diag.get("id") == diagnostic_id or diag.get("session_id") == diagnostic_id:
            return diag
    return None


def save_diagnostic(report: Dict[str, Any]) -> Dict[str, Any]:
    diagnostics = load_diagnostics()
    for i, diag in enumerate(diagnostics):
        if diag["id"] == report["id"] or diag.get("session_id") == report.get("session_id"):
            diagnostics[i] = report
            save_diagnostics(diagnostics)
            return report
    diagnostics.insert(0, report)
    save_diagnostics(diagnostics)
    return report


def delete_diagnostic(diagnostic_id: str) -> bool:
    diagnostics = load_diagnostics()
    original_len = len(diagnostics)
    diagnostics = [d for d in diagnostics if d["id"] != diagnostic_id and d.get("session_id") != diagnostic_id]
    if len(diagnostics) < original_len:
        save_diagnostics(diagnostics)
        return True
    return False


def update_diagnostic_resolution(diagnostic_id: str, is_resolved: bool, resolution_notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    diagnostics = load_diagnostics()
    for diag in diagnostics:
        if diag["id"] == diagnostic_id or diag.get("session_id") == diagnostic_id:
            diag["is_resolved"] = is_resolved
            diag["resolution_notes"] = resolution_notes
            diag["recovery_verification_status"] = "VERIFIED_RESOLVED" if is_resolved else "STILL_FAILING"
            save_diagnostics(diagnostics)
            return diag
    return None
