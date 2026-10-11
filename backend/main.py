from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone

from backend.models import (
    NetworkProfile,
    DiagnosticRequest,
    DiagnosticReport,
    ResolutionUpdate,
    ComparisonRequest,
    ComparisonReport
)
from backend.storage import (
    load_networks,
    save_network,
    get_network,
    delete_network,
    reset_sample_network,
    load_diagnostics,
    get_diagnostic,
    save_diagnostic,
    delete_diagnostic,
    update_diagnostic_resolution
)
from backend.diagnostic_engine import analyze_diagnostics
from backend.report_service import compare_diagnostic_sessions
from backend.guide_data import get_all_guide_topics, get_guide_topic_by_id
from backend.scenarios import get_all_scenarios

app = FastAPI(
    title="Automated Network Connectivity Diagnosis & Failure Localization System",
    description="Offline evidence-based diagnostic analyzer for networks simulated in Cisco Packet Tracer",
    version="1.0.0"
)

# Configure CORS for local React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Network Connectivity Diagnosis Engine",
        "mode": "Offline Cisco Packet Tracer Evidence Analyzer",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ==========================================
# Network Profile Endpoints
# ==========================================

@app.get("/api/networks", response_model=List[NetworkProfile])
def list_networks():
    raw_networks = load_networks()
    return raw_networks


@app.post("/api/networks", response_model=NetworkProfile, status_code=status.HTTP_201_CREATED)
def create_network(network: NetworkProfile):
    # Validation: unique device IDs
    dev_ids = set()
    for d in network.devices:
        if d.id in dev_ids:
            raise HTTPException(status_code=400, detail=f"Duplicate device ID found: '{d.id}'")
        dev_ids.add(d.id)

    # Validation: Link endpoints exist
    for link in network.links:
        if link.source_device not in dev_ids:
            raise HTTPException(status_code=400, detail=f"Link {link.id} references non-existent source device: '{link.source_device}'")
        if link.target_device not in dev_ids:
            raise HTTPException(status_code=400, detail=f"Link {link.id} references non-existent target device: '{link.target_device}'")

    saved = save_network(network.model_dump())
    return saved


@app.get("/api/networks/{network_id}", response_model=NetworkProfile)
def get_network_by_id(network_id: str):
    net = get_network(network_id)
    if not net:
        raise HTTPException(status_code=404, detail="Network profile not found")
    return net


@app.put("/api/networks/{network_id}", response_model=NetworkProfile)
def update_network(network_id: str, network: NetworkProfile):
    existing = get_network(network_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Network profile not found")

    network.id = network_id
    network.updated_at = datetime.now(timezone.utc).isoformat()
    saved = save_network(network.model_dump())
    return saved


@app.delete("/api/networks/{network_id}")
def remove_network(network_id: str):
    success = delete_network(network_id)
    if not success:
        raise HTTPException(status_code=404, detail="Network profile not found")
    return {"message": f"Network {network_id} successfully deleted"}


@app.post("/api/networks/reset-sample", response_model=NetworkProfile)
def reload_sample_network():
    return reset_sample_network()


# ==========================================
# Diagnostics Endpoints
# ==========================================

@app.post("/api/diagnostics", response_model=DiagnosticReport, status_code=status.HTTP_201_CREATED)
@app.post("/api/diagnostics/analyze", response_model=DiagnosticReport, status_code=status.HTTP_201_CREATED)
def run_diagnostic_analysis(request: DiagnosticRequest):
    net_data = get_network(request.network_id)
    if not net_data:
        raise HTTPException(status_code=404, detail=f"Network profile '{request.network_id}' not found")

    profile = NetworkProfile(**net_data)
    report = analyze_diagnostics(request, profile)
    save_diagnostic(report.model_dump())
    return report


@app.get("/api/diagnostics", response_model=List[DiagnosticReport])
def list_diagnostics():
    return load_diagnostics()


@app.get("/api/diagnostics/{diagnostic_id}", response_model=DiagnosticReport)
def get_diagnostic_report(diagnostic_id: str):
    diag = get_diagnostic(diagnostic_id)
    if not diag:
        raise HTTPException(status_code=404, detail=f"Diagnostic report '{diagnostic_id}' not found")
    return diag


@app.delete("/api/diagnostics/{diagnostic_id}")
def remove_diagnostic(diagnostic_id: str):
    success = delete_diagnostic(diagnostic_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Diagnostic report '{diagnostic_id}' not found")
    return {"message": f"Diagnostic report {diagnostic_id} successfully deleted"}


@app.post("/api/diagnostics/{diagnostic_id}/resolve", response_model=DiagnosticReport)
def resolve_diagnostic(diagnostic_id: str, payload: ResolutionUpdate):
    updated = update_diagnostic_resolution(diagnostic_id, payload.is_resolved, payload.resolution_notes)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Diagnostic report '{diagnostic_id}' not found")
    return updated


@app.post("/api/diagnostics/compare", response_model=ComparisonReport)
def compare_sessions(payload: ComparisonRequest):
    before_data = get_diagnostic(payload.before_session_id)
    if not before_data:
        raise HTTPException(status_code=404, detail=f"Before session '{payload.before_session_id}' not found")

    after_data = get_diagnostic(payload.after_session_id)
    if not after_data:
        raise HTTPException(status_code=404, detail=f"After session '{payload.after_session_id}' not found")

    before_report = DiagnosticReport(**before_data)
    after_report = DiagnosticReport(**after_data)

    comparison = compare_diagnostic_sessions(before_report, after_report)
    return comparison


# ==========================================
# Dashboard Stats & Analytics
# ==========================================

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    networks = load_networks()
    diagnostics = load_diagnostics()

    total_devices = sum(len(n.get("devices", [])) for n in networks)

    healthy_count = sum(1 for d in diagnostics if d.get("overall_status") == "HEALTHY")
    fault_count = sum(1 for d in diagnostics if d.get("overall_status") == "FAULT DETECTED")
    possible_fault_count = sum(1 for d in diagnostics if d.get("overall_status") == "POSSIBLE FAULT")
    insufficient_count = sum(1 for d in diagnostics if d.get("overall_status") == "INSUFFICIENT EVIDENCE")
    resolved_count = sum(1 for d in diagnostics if d.get("is_resolved") is True)

    # Fault causes breakdown
    causes_distribution: Dict[str, int] = {}
    for d in diagnostics:
        if d.get("overall_status") in ["FAULT DETECTED", "POSSIBLE FAULT"]:
            cause = d.get("likely_cause", "Unknown")
            # Group into clean categories
            if "Gateway" in cause:
                cat = "Default Gateway"
            elif "Interface" in cause or "Administratively Down" in cause:
                cat = "Interface State"
            elif "Route" in cause:
                cat = "Routing Problem"
            elif "Link" in cause:
                cat = "Physical Link"
            elif "Configuration" in cause or "Source" in cause:
                cat = "Host Configuration"
            elif "ACL" in cause:
                cat = "ACL Filter"
            elif "Remote" in cause:
                cat = "Remote Reachability"
            else:
                cat = "Other Fault"
            causes_distribution[cat] = causes_distribution.get(cat, 0) + 1

    chart_data = [{"category": k, "count": v} for k, v in causes_distribution.items()]

    recent_sessions = diagnostics[:8]

    return {
        "total_networks": len(networks),
        "total_devices": total_devices,
        "total_sessions": len(diagnostics),
        "healthy_tests": healthy_count,
        "failed_tests": fault_count + possible_fault_count,
        "suspected_faults": fault_count + possible_fault_count,
        "insufficient_evidence": insufficient_count,
        "resolved_faults": resolved_count,
        "fault_distribution": chart_data,
        "recent_sessions": recent_sessions
    }


# ==========================================
# Learning Guide & Scenarios
# ==========================================

@app.get("/api/guide")
def list_guide_topics():
    return get_all_guide_topics()


@app.get("/api/guide/{topic_id}")
def get_guide_topic(topic_id: str):
    topic = get_guide_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Guide topic '{topic_id}' not found")
    return topic


@app.get("/api/scenarios")
def list_preset_scenarios():
    return get_all_scenarios()
