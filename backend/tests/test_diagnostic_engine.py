import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import (
    DiagnosticRequest,
    StructuredTestResults,
    RawCommandEvidence,
    NetworkProfile,
    HopReachability,
    InterfaceObservation,
    RoutingObservation
)
from backend.sample_data import get_sample_network
from backend.diagnostic_engine import analyze_diagnostics
from backend.report_service import compare_diagnostic_sessions

client = TestClient(app)


@pytest.fixture
def sample_network():
    return NetworkProfile(**get_sample_network())


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_1_healthy_network(sample_network):
    """Test 1: Healthy network -> Expected: HEALTHY"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            configured_source_ip="192.168.10.10",
            configured_default_gateway="192.168.10.1",
            default_gateway_ping="PASS",
            intermediate_hops=[
                HopReachability(hop_device="R1", reachability="PASS"),
                HopReachability(hop_device="R2", reachability="PASS"),
                HopReachability(hop_device="R3", reachability="PASS"),
            ],
            destination_ping="PASS",
            link_status_observation="ALL_UP"
        )
    )
    report = analyze_diagnostics(req, sample_network)
    assert report.overall_status == "HEALTHY"
    assert report.confidence == "High"
    assert "healthy" in report.likely_cause.lower() or "fully operational" in report.likely_cause.lower()


def test_2_incorrect_default_gateway(sample_network):
    """Test 2: Incorrect default gateway -> Expected: Source configuration mismatch identified"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="FAIL",
            configured_source_ip="192.168.10.10",
            configured_default_gateway="192.168.10.99",  # Wrong gateway (should be 192.168.10.1)
            default_gateway_ping="FAIL",
            destination_ping="FAIL"
        )
    )
    report = analyze_diagnostics(req, sample_network)
    assert report.overall_status == "FAULT DETECTED"
    assert "configuration" in report.likely_cause.lower() or "source" in report.likely_cause.lower()
    assert "192.168.10.99" in str(report.supporting_evidence)


def test_3_interface_administratively_down(sample_network):
    """Test 3: Router interface administratively down -> Expected: Interface identified and evaluated"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            configured_default_gateway="192.168.10.1",
            default_gateway_ping="PASS",
            destination_ping="FAIL",
            interface_observations=[
                InterfaceObservation(
                    router_name="R1",
                    interface_name="Serial0/1/0",
                    operational_status="down",
                    administrative_status="administratively down"
                )
            ]
        )
    )
    report = analyze_diagnostics(req, sample_network)
    assert report.overall_status == "FAULT DETECTED"
    assert "administratively down" in report.likely_cause.lower()
    assert "Serial0/1/0" in report.suspected_failure_location
    assert report.confidence == "High"


def test_4_missing_static_route(sample_network):
    """Test 4: Missing static route -> Expected: Routing problem identified"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            default_gateway_ping="PASS",
            destination_ping="FAIL",
            routing_observations=[
                RoutingObservation(
                    router_name="R1",
                    destination_network="192.168.30.0/24",
                    expected_route="via 10.0.12.2",
                    route_found="NO",
                    next_hop="10.0.12.2"
                )
            ]
        )
    )
    report = analyze_diagnostics(req, sample_network)
    assert report.overall_status == "FAULT DETECTED"
    assert "route" in report.likely_cause.lower()
    assert "192.168.30.0/24" in report.likely_cause
    assert report.confidence == "High"


def test_5_inter_router_link_failure(sample_network):
    """Test 5: Inter-router link failure -> Expected: Failure region localized to R2-R3 segment"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            default_gateway_ping="PASS",
            intermediate_hops=[
                HopReachability(hop_device="R1", reachability="PASS"),
                HopReachability(hop_device="R2", reachability="PASS"),
                HopReachability(hop_device="R3", reachability="FAIL")
            ],
            destination_ping="FAIL"
        )
    )
    report = analyze_diagnostics(req, sample_network)
    assert report.overall_status == "FAULT DETECTED"
    assert report.localized_link is not None
    assert "R2" in report.suspected_failure_location and "R3" in report.suspected_failure_location


def test_6_destination_unreachable_no_evidence(sample_network):
    """Test 6: Destination unreachable with no additional evidence -> Expected: POSSIBLE FAULT or INSUFFICIENT EVIDENCE"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="UNKNOWN",
            default_gateway_ping="PASS",
            destination_ping="FAIL",
            intermediate_hops=[],
            interface_observations=[],
            routing_observations=[]
        )
    )
    report = analyze_diagnostics(req, sample_network)
    # Must NOT fabricate a definitive root cause
    assert report.overall_status in ["POSSIBLE FAULT", "INSUFFICIENT EVIDENCE"]
    assert "remote" in report.likely_cause.lower() or "indeterminate" in report.likely_cause.lower()
    # Next diagnostic commands recommended
    assert len(report.recommended_actions) > 0


def test_7_contradictory_evidence(sample_network):
    """Test 7: Contradictory evidence -> Expected: Flags inconsistency and requests re-test"""
    req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            default_gateway_ping="FAIL",  # Gateway failed
            destination_ping="PASS"       # But destination passed!
        )
    )
    report = analyze_diagnostics(req, sample_network)
    assert report.overall_status == "POSSIBLE FAULT"
    assert report.confidence == "Low"
    assert any("contradiction" in s.lower() for s in report.identified_symptoms)


def test_8_recovery_verification(sample_network):
    """Test 8: Recovery verification -> Expected: Compares before-and-after results and reports RECOVERED"""
    before_req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            default_gateway_ping="PASS",
            destination_ping="FAIL"
        )
    )
    before_report = analyze_diagnostics(before_req, sample_network)

    after_req = DiagnosticRequest(
        network_id=sample_network.id,
        source_device_id="dev-pc1",
        destination_device_id="dev-server1",
        structured_results=StructuredTestResults(
            source_config_valid="PASS",
            default_gateway_ping="PASS",
            destination_ping="PASS"
        )
    )
    after_report = analyze_diagnostics(after_req, sample_network)

    comparison = compare_diagnostic_sessions(before_report, after_report)
    assert comparison.recovery_verification_status == "RECOVERED"
    assert comparison.status_change == "IMPROVED"
    assert "Recovery Verified" in comparison.summary


def test_api_network_crud():
    # Test GET networks
    res = client.get("/api/networks")
    assert res.status_code == 200
    networks = res.json()
    assert len(networks) >= 1
    sample_id = networks[0]["id"]

    # Test GET single network
    res_single = client.get(f"/api/networks/{sample_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == sample_id

    # Test GET guide topics
    res_guide = client.get("/api/guide")
    assert res_guide.status_code == 200
    assert len(res_guide.json()) == 11

    # Test GET scenarios
    res_scenarios = client.get("/api/scenarios")
    assert res_scenarios.status_code == 200
    assert len(res_scenarios.json()) >= 8


def test_preset_scenarios_execution(sample_network):
    """Verifies that all 8 predefined scenarios execute successfully through the diagnostics API"""
    scenarios_res = client.get("/api/scenarios")
    scenarios = scenarios_res.json()
    assert len(scenarios) >= 8

    for sc in scenarios:
        payload = {
            "network_id": sample_network.id,
            "source_device_id": sc["source_device_id"],
            "destination_device_id": sc["destination_device_id"],
            "structured_results": sc["structured_results"],
            "raw_evidence": sc.get("raw_evidence", {})
        }
        res = client.post("/api/diagnostics/analyze", json=payload)
        assert res.status_code == 201, f"Scenario '{sc['id']}' failed with {res.text}"
        data = res.json()
        assert "overall_status" in data
        assert "confidence" in data
        assert "likely_cause" in data

