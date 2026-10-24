import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from collections import deque

from backend.models import (
    DiagnosticRequest,
    DiagnosticReport,
    DiagnosticEvidenceItem,
    OverallStatus,
    ConfidenceLevel,
    NetworkProfile,
    Device,
    Link,
    HopStatusInfo,
    StructuredTestResults,
    RawCommandEvidence
)
from backend.parsers import (
    parse_ping_output,
    parse_traceroute_output,
    parse_show_ip_int_brief,
    parse_show_ip_route,
    parse_acl_or_vlan_evidence
)
from backend.rules import (
    evaluate_contradictions,
    apply_rule_a_source_config,
    apply_rule_b_gateway_unreachable,
    apply_rule_c_interface_admin_down,
    apply_rule_d_physical_link_failure,
    apply_rule_e_missing_route,
    apply_rule_f_destination_unreachable,
    apply_rule_g_healthy,
    apply_rule_h_insufficient_evidence,
    apply_rule_i_acl_or_vlan
)


def find_network_path(
    network_profile: NetworkProfile,
    source_id: str,
    target_id: str
) -> Tuple[List[Device], List[Link], List[str]]:
    """
    Finds the communication path between source and target devices using BFS.
    Returns: (ordered_devices, ordered_links, list_of_interface_names_on_path)
    """
    device_map = {d.id: d for d in network_profile.devices}
    if source_id not in device_map or target_id not in device_map:
        return ([], [], [])

    # Build adjacency list: node_id -> list of (neighbor_id, link)
    adj: Dict[str, List[Tuple[str, Link]]] = {d.id: [] for d in network_profile.devices}
    for link in network_profile.links:
        adj[link.source_device].append((link.target_device, link))
        adj[link.target_device].append((link.source_device, link))

    queue = deque([[source_id]])
    visited = {source_id}
    path_node_ids = []

    while queue:
        path = queue.popleft()
        current = path[-1]
        if current == target_id:
            path_node_ids = path
            break
        for nbr, _ in adj.get(current, []):
            if nbr not in visited:
                visited.add(nbr)
                queue.append(path + [nbr])

    if not path_node_ids:
        # Fallback if no direct link in profile: return source and dest
        return ([device_map[source_id], device_map[target_id]], [], [])

    ordered_devices = [device_map[nid] for nid in path_node_ids]
    ordered_links: List[Link] = []
    path_interfaces: List[str] = []

    for i in range(len(path_node_ids) - 1):
        u = path_node_ids[i]
        v = path_node_ids[i + 1]
        for nbr, link in adj.get(u, []):
            if nbr == v:
                ordered_links.append(link)
                path_interfaces.append(link.source_interface)
                path_interfaces.append(link.target_interface)
                break

    return (ordered_devices, ordered_links, path_interfaces)


def analyze_diagnostics(
    request: DiagnosticRequest,
    network_profile: NetworkProfile
) -> DiagnosticReport:
    """
    Main diagnostic engine function:
    1. Parses raw CLI evidence if provided.
    2. Builds network path and correlates observations.
    3. Checks for contradictory inputs.
    4. Evaluates Rules A through I.
    5. Localizes failure region.
    6. Formats and returns DiagnosticReport.
    """
    raw = request.raw_evidence or RawCommandEvidence()
    sr = request.structured_results

    # Parse raw outputs
    parsed_ping = parse_ping_output(raw.ping_output) if raw.ping_output else {}
    parsed_trace = parse_traceroute_output(raw.traceroute_output) if raw.traceroute_output else {}
    parsed_intf = parse_show_ip_int_brief(raw.show_ip_int_brief) if raw.show_ip_int_brief else []
    parsed_routes = parse_show_ip_route(raw.show_ip_route) if raw.show_ip_route else []
    parsed_acl = parse_acl_or_vlan_evidence(raw.show_running_config or sr.additional_observations)

    # Enrich structured results from raw evidence if structured was UNKNOWN/NOT_TESTED
    if sr.destination_ping in ["UNKNOWN", "NOT_TESTED"] and parsed_ping.get("status"):
        if parsed_ping["status"] == "PASS":
            sr.destination_ping = "PASS"
        elif parsed_ping["status"] == "FAIL":
            sr.destination_ping = "FAIL"

    # Merge interface status from parsed show ip int brief
    for p_if in parsed_intf:
        if p_if["status"] in ["administratively down", "down"]:
            # Check if already present in observations
            exists = any(obs.interface_name.lower() == p_if["interface"].lower() for obs in sr.interface_observations)
            if not exists:
                sr.interface_observations.append(
                    models_InterfaceObservation(
                        router_name="ParsedRouter",
                        interface_name=p_if["interface"],
                        operational_status=p_if["protocol"],
                        administrative_status=p_if["status"]
                    )
                )

    # Locate source and destination devices
    source_dev = next((d for d in network_profile.devices if d.id == request.source_device_id or d.name.lower() == request.source_device_id.lower()), None)
    dest_dev = next((d for d in network_profile.devices if d.id == request.destination_device_id or d.name.lower() == request.destination_device_id.lower()), None)

    source_name = source_dev.name if source_dev else request.source_device_id
    source_ip = sr.configured_source_ip or (source_dev.ip_address if source_dev else None)
    dest_name = dest_dev.name if dest_dev else request.destination_device_id
    dest_ip = sr.configured_destination_ip or (dest_dev.ip_address if dest_dev else None)

    # Discover network path
    path_devices, path_links, path_interfaces = find_network_path(
        network_profile,
        source_dev.id if source_dev else request.source_device_id,
        dest_dev.id if dest_dev else request.destination_device_id
    )

    # Check for contradictions
    contradictions = evaluate_contradictions(request, parsed_ping)

    # Compile supporting evidence items
    supporting_evidence: List[DiagnosticEvidenceItem] = []
    if raw.ping_output:
        supporting_evidence.append(DiagnosticEvidenceItem(
            source="ping",
            description=parsed_ping.get("details", "Raw ping output analyzed."),
            status="SUPPORTING" if not contradictions else "INCONSISTENT"
        ))
    if raw.traceroute_output:
        supporting_evidence.append(DiagnosticEvidenceItem(
            source="traceroute",
            description=parsed_trace.get("details", "Traceroute hops analyzed."),
            status="SUPPORTING"
        ))
    if raw.show_ip_int_brief:
        supporting_evidence.append(DiagnosticEvidenceItem(
            source="show ip int brief",
            description=f"Parsed {len(parsed_intf)} interface status records.",
            status="SUPPORTING"
        ))
    if raw.show_ip_route:
        supporting_evidence.append(DiagnosticEvidenceItem(
            source="show ip route",
            description=f"Parsed {len(parsed_routes)} routing table entries.",
            status="SUPPORTING"
        ))
    if sr.additional_observations:
        supporting_evidence.append(DiagnosticEvidenceItem(
            source="user_observation",
            description=sr.additional_observations,
            status="SUPPORTING"
        ))

    # Evaluate intermediate hops status
    hop_status_map: Dict[str, str] = {}
    for h in sr.intermediate_hops:
        hop_status_map[h.hop_device.lower()] = h.reachability

    # Build path hops info for visual reporting
    path_hops: List[HopStatusInfo] = []
    last_reachable_hop: Optional[str] = None
    first_unreachable_hop: Optional[str] = None
    fault_device_id: Optional[str] = None

    for idx, d in enumerate(path_devices):
        dev_reachability = "UNKNOWN"
        if idx == 0:
            dev_reachability = "PASS" if sr.source_config_valid != "FAIL" else "FAIL"
            if dev_reachability == "PASS":
                last_reachable_hop = d.name
        elif d.type == "Router":
            # Check gateway or intermediate hops
            if d.name == (source_dev.default_gateway if source_dev else "") or idx <= 2:
                # Gateway router
                dev_reachability = sr.default_gateway_ping
            else:
                dev_reachability = hop_status_map.get(d.name.lower(), "NOT_TESTED")
        elif idx == len(path_devices) - 1:
            # Destination device
            dev_reachability = sr.destination_ping
        else:
            # Switch or intermediate
            dev_reachability = "UNKNOWN"

        if dev_reachability == "PASS":
            last_reachable_hop = d.name
        elif dev_reachability == "FAIL" and first_unreachable_hop is None:
            first_unreachable_hop = d.name
            fault_device_id = d.id

        path_hops.append(HopStatusInfo(
            device_id=d.id,
            device_name=d.name,
            device_type=d.type.value if hasattr(d.type, 'value') else str(d.type),
            ip=d.ip_address,
            reachability=dev_reachability,
            is_fault_region=False
        ))

    # Isolate localized link if consecutive hops show PASS -> FAIL
    localized_link_info: Optional[Dict[str, Any]] = None
    if last_reachable_hop and first_unreachable_hop:
        # Search path_links connecting reachable and unreachable
        for link in path_links:
            # Check if this link connects last reachable and first unreachable
            src_dev_obj = next((d for d in path_devices if d.id == link.source_device), None)
            dst_dev_obj = next((d for d in path_devices if d.id == link.target_device), None)
            if src_dev_obj and dst_dev_obj:
                names = [src_dev_obj.name.lower(), dst_dev_obj.name.lower()]
                if last_reachable_hop.lower() in names and first_unreachable_hop.lower() in names:
                    localized_link_info = {
                        "link_id": link.id,
                        "device_a": src_dev_obj.name,
                        "interface_a": link.source_interface,
                        "device_b": dst_dev_obj.name,
                        "interface_b": link.target_interface,
                        "description": f"{src_dev_obj.name} ({link.source_interface}) <-> {dst_dev_obj.name} ({link.target_interface})"
                    }
                    break

    # Mark fault region on path_hops
    if fault_device_id:
        for ph in path_hops:
            if ph.device_id == fault_device_id:
                ph.is_fault_region = True

    # Individual test summary dictionary
    individual_tests: Dict[str, str] = {
        "source_ip_configuration": sr.source_config_valid,
        "default_gateway_ping": sr.default_gateway_ping,
        "destination_ping": sr.destination_ping,
        "link_state": sr.link_status_observation or "UNKNOWN"
    }
    for hop in sr.intermediate_hops:
        individual_tests[f"hop_{hop.hop_device}_reachability"] = hop.reachability

    # Diagnostic Rules Decision Pipeline

    # 1. Contradictions Check
    if len(contradictions) > 0:
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.POSSIBLE_FAULT.value,
            confidence=ConfidenceLevel.LOW.value,
            confidence_reason="Contradictory diagnostic test results provided. Inferences cannot be guaranteed.",
            likely_cause="Inconsistent / Contradictory Test Findings",
            location="Unresolved (Data Inconsistency)",
            symptoms=contradictions,
            actions=[
                "Re-run ping to default gateway from source host.",
                "Re-run ping to destination host from source host.",
                "Verify that IP addresses used in tests match the actual network topology in Packet Tracer.",
                "Ensure ICMP echo is not selectively permitted on intermediate routers while blocking gateway."
            ],
            questions=[
                "Why did remote ping succeed while local gateway ping failed?",
                "Are multiple active paths/interfaces present?"
            ],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 2. Rule A: Invalid Source Configuration
    rule_a_result = apply_rule_a_source_config(request, source_dev)
    if rule_a_result:
        for ev in rule_a_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="source_config", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=rule_a_result["confidence"],
            confidence_reason=rule_a_result["confidence_reason"],
            likely_cause=rule_a_result["likely_cause"],
            location=rule_a_result["failure_location"],
            symptoms=[rule_a_result["symptom"]],
            actions=rule_a_result["actions"],
            questions=[],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 3. Rule C: Interface Administratively Down
    rule_c_result = apply_rule_c_interface_admin_down(request, path_interfaces)
    if rule_c_result:
        for ev in rule_c_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="interface_state", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=rule_c_result["confidence"],
            confidence_reason=rule_c_result["confidence_reason"],
            likely_cause=rule_c_result["likely_cause"],
            location=rule_c_result["failure_location"],
            symptoms=[rule_c_result["symptom"]],
            actions=rule_c_result["actions"],
            questions=[],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 4. Rule D: Physical Link Failure
    rule_d_result = apply_rule_d_physical_link_failure(request, path_links)
    if rule_d_result:
        for ev in rule_d_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="link_state", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=rule_d_result["confidence"],
            confidence_reason=rule_d_result["confidence_reason"],
            likely_cause=rule_d_result["likely_cause"],
            location=rule_d_result["failure_location"],
            symptoms=[rule_d_result["symptom"]],
            actions=rule_d_result["actions"],
            questions=[],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 5. Rule E: Missing Static Route
    rule_e_result = apply_rule_e_missing_route(request, dest_ip)
    if rule_e_result:
        for ev in rule_e_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="routing_table", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=rule_e_result["confidence"],
            confidence_reason=rule_e_result["confidence_reason"],
            likely_cause=rule_e_result["likely_cause"],
            location=rule_e_result["failure_location"],
            symptoms=[rule_e_result["symptom"]],
            actions=rule_e_result["actions"],
            questions=[],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 6. Rule I: ACL / VLAN Problem
    rule_i_result = apply_rule_i_acl_or_vlan(request)
    if rule_i_result:
        for ev in rule_i_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="acl_vlan", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=rule_i_result["confidence"],
            confidence_reason=rule_i_result["confidence_reason"],
            likely_cause=rule_i_result["likely_cause"],
            location=rule_i_result["failure_location"],
            symptoms=[rule_i_result["symptom"]],
            actions=rule_i_result["actions"],
            questions=[],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 7. Rule B: Default Gateway Unreachable
    rule_b_result = apply_rule_b_gateway_unreachable(request, source_dev, network_profile)
    if rule_b_result:
        for ev in rule_b_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="gateway_ping", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=rule_b_result["confidence"],
            confidence_reason=rule_b_result["confidence_reason"],
            likely_cause=rule_b_result["likely_cause"],
            location=rule_b_result["failure_location"],
            symptoms=[rule_b_result["symptom"]],
            actions=rule_b_result["actions"],
            questions=rule_b_result.get("next_tests", []),
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 8. Rule G: Healthy Connectivity requires positive evidence for both pings.
    if sr.destination_ping == "PASS" and sr.default_gateway_ping == "PASS":
        rule_g_result = apply_rule_g_healthy(request, source_dev, dest_dev)
        for ev in rule_g_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="connectivity_test", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.HEALTHY.value,
            confidence=rule_g_result["confidence"],
            confidence_reason=rule_g_result["confidence_reason"],
            likely_cause=rule_g_result["likely_cause"],
            location=rule_g_result["failure_location"],
            symptoms=[rule_g_result["symptom"]],
            actions=rule_g_result["actions"],
            questions=[],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=None,
            individual_tests=individual_tests
        )

    # 9. Inter-Router Localization (if intermediate hops show a specific breakpoint)
    if last_reachable_hop and first_unreachable_hop and localized_link_info:
        # We know exactly where the path broke!
        loc_desc = localized_link_info["description"]
        symptom = f"Communication interrupted between {last_reachable_hop} and {first_unreachable_hop}"
        cause = f"Inter-Router Link or Interface Interruption on {loc_desc}"
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.FAULT_DETECTED.value,
            confidence=ConfidenceLevel.HIGH.value,
            confidence_reason=f"Hop-by-hop diagnostics verified reachability to {last_reachable_hop} but failure reaching {first_unreachable_hop}, localizing fault to the {last_reachable_hop}-{first_unreachable_hop} segment.",
            likely_cause=cause,
            location=f"Connection {localized_link_info['description']}",
            symptoms=[symptom, f"Last responding device: {last_reachable_hop}", f"First non-responding device: {first_unreachable_hop}"],
            actions=[
                f"Verify physical or serial link status between {last_reachable_hop} and {first_unreachable_hop} in Packet Tracer.",
                f"Run 'show ip interface brief' on {last_reachable_hop} ({localized_link_info['interface_a']}) and {first_unreachable_hop} ({localized_link_info['interface_b']}).",
                "Ensure both interfaces show status UP and protocol UP.",
                "Check IP addressing and subnet masks on both link interfaces (must share same /30 subnet)."
            ],
            questions=[
                f"Is the serial clock rate configured on the DCE side of {loc_desc}?",
                "Are keepalive or encapsulation settings mismatched (e.g. HDLC vs PPP)?"
            ],
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 10. Destination Ping Failed with no other evidence -> Rule F & Rule H (Do not fabricate root cause!)
    if sr.destination_ping == "FAIL":
        rule_f_result = apply_rule_f_destination_unreachable(request, dest_dev, last_reachable_hop)
        for ev in rule_f_result["evidence"]:
            supporting_evidence.append(DiagnosticEvidenceItem(source="destination_ping", description=ev, status="SUPPORTING"))
        return _build_report(
            request=request,
            network_profile=network_profile,
            overall_status=OverallStatus.POSSIBLE_FAULT.value,
            confidence=ConfidenceLevel.MEDIUM.value,
            confidence_reason="Ping to destination failed, but no intermediate router or interface evidence was supplied to isolate the root cause.",
            likely_cause=rule_f_result["likely_cause"],
            location=rule_f_result["failure_location"],
            symptoms=[rule_f_result["symptom"]],
            actions=rule_f_result["actions"],
            questions=rule_f_result.get("next_tests", []),
            evidence=supporting_evidence,
            path_hops=path_hops,
            localized_link=localized_link_info,
            individual_tests=individual_tests
        )

    # 11. Insufficient Evidence (All UNKNOWN or NOT TESTED)
    rule_h_result = apply_rule_h_insufficient_evidence(request)
    return _build_report(
        request=request,
        network_profile=network_profile,
        overall_status=OverallStatus.INSUFFICIENT_EVIDENCE.value,
        confidence=ConfidenceLevel.LOW.value,
        confidence_reason="No conclusive test outputs or command logs were submitted.",
        likely_cause=rule_h_result["likely_cause"],
        location=rule_h_result["failure_location"],
        symptoms=[rule_h_result["symptom"]],
        actions=rule_h_result["actions"],
        questions=rule_h_result.get("next_tests", []),
        evidence=supporting_evidence,
        path_hops=path_hops,
        localized_link=None,
        individual_tests=individual_tests
    )


def _build_report(
    request: DiagnosticRequest,
    network_profile: NetworkProfile,
    overall_status: str,
    confidence: str,
    confidence_reason: str,
    likely_cause: str,
    location: str,
    symptoms: List[str],
    actions: List[str],
    questions: List[str],
    evidence: List[DiagnosticEvidenceItem],
    path_hops: List[HopStatusInfo],
    localized_link: Optional[Dict[str, Any]],
    individual_tests: Dict[str, str]
) -> DiagnosticReport:
    report_id = f"diag-{uuid.uuid4().hex[:8]}"
    session_id = f"SES-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()

    source_dev = next((d for d in network_profile.devices if d.id == request.source_device_id or d.name.lower() == request.source_device_id.lower()), None)
    dest_dev = next((d for d in network_profile.devices if d.id == request.destination_device_id or d.name.lower() == request.destination_device_id.lower()), None)

    return DiagnosticReport(
        id=report_id,
        session_id=session_id,
        timestamp=timestamp,
        network_id=network_profile.id,
        network_name=network_profile.name,
        source_device=source_dev.name if source_dev else request.source_device_id,
        source_ip=request.structured_results.configured_source_ip or (source_dev.ip_address if source_dev else None),
        destination_device=dest_dev.name if dest_dev else request.destination_device_id,
        destination_ip=request.structured_results.configured_destination_ip or (dest_dev.ip_address if dest_dev else None),
        overall_status=overall_status,
        confidence=confidence,
        confidence_reason=confidence_reason,
        individual_tests=individual_tests,
        identified_symptoms=symptoms,
        likely_cause=likely_cause,
        suspected_failure_location=location,
        path_hops=path_hops,
        localized_link=localized_link,
        supporting_evidence=evidence,
        recommended_actions=actions,
        unresolved_questions=questions,
        is_resolved=False,
        resolution_notes=None,
        recovery_verification_status="PENDING",
        raw_evidence=request.raw_evidence,
        structured_results=request.structured_results
    )


# Helper function for interface observation instantiation
def models_InterfaceObservation(router_name: str, interface_name: str, operational_status: str, administrative_status: str):
    from backend.models import InterfaceObservation
    return InterfaceObservation(
        router_name=router_name,
        interface_name=interface_name,
        operational_status=operational_status,
        administrative_status=administrative_status
    )
