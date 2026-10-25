import ipaddress
from typing import Dict, Any, List, Optional, Tuple
from backend.models import (
    DiagnosticRequest,
    DiagnosticReport,
    DiagnosticEvidenceItem,
    OverallStatus,
    ConfidenceLevel,
    NetworkProfile,
    Device,
    Link,
    HopStatusInfo
)
from backend.parsers import interfaces_match, canonical_short_interface



def evaluate_contradictions(request: DiagnosticRequest, parsed_ping: Dict[str, Any]) -> List[str]:
    """
    Checks for illogical or contradictory inputs.
    Example: Destination ping reported as PASS, but Default Gateway ping reported as FAIL.
    """
    contradictions = []
    sr = request.structured_results
    dest_pass = (sr.destination_ping == "PASS") or (parsed_ping.get("status") == "PASS")
    gw_fail = (sr.default_gateway_ping == "FAIL")

    if dest_pass and gw_fail:
        contradictions.append(
            "Contradiction detected: The destination was reported as reachable (PASS), "
            "but the default gateway ping failed (FAIL). In a routed multi-hop network, "
            "remote packets must traverse the local gateway."
        )

    if dest_pass and sr.source_config_valid == "FAIL":
        contradictions.append(
            "Contradiction detected: The destination was reported as reachable (PASS), "
            "yet the source IP configuration was marked invalid (FAIL)."
        )

    # Check intermediate hop contradictions: hop N failed, but hop N+1 passed
    hops = sr.intermediate_hops
    failed_found = False
    for hop in hops:
        if hop.reachability == "FAIL":
            failed_found = True
        elif hop.reachability == "PASS" and failed_found:
            contradictions.append(
                f"Contradiction detected: Router hop {hop.hop_device} responded as reachable after a preceding hop had failed."
            )
            break

    return contradictions


def apply_rule_a_source_config(
    request: DiagnosticRequest,
    source_device: Optional[Device]
) -> Optional[Dict[str, Any]]:
    """
    Rule A: Invalid Source Configuration
    Flags source configuration problems with specific mismatch detection against intended profile.
    """
    sr = request.structured_results
    mismatches = []

    # Explicit report of invalid config
    is_explicit_invalid = (sr.source_config_valid == "FAIL")

    if source_device:
        if sr.configured_source_ip and source_device.ip_address and sr.configured_source_ip.strip() != source_device.ip_address.strip():
            mismatches.append(f"Configured IP '{sr.configured_source_ip}' does not match intended network design '{source_device.ip_address}'")
        if sr.configured_subnet_mask and source_device.subnet_mask and sr.configured_subnet_mask.strip() != source_device.subnet_mask.strip():
            mismatches.append(f"Configured Subnet Mask '{sr.configured_subnet_mask}' does not match intended '{source_device.subnet_mask}'")
        if sr.configured_default_gateway and source_device.default_gateway and sr.configured_default_gateway.strip() != source_device.default_gateway.strip():
            mismatches.append(f"Configured Default Gateway '{sr.configured_default_gateway}' does not match intended '{source_device.default_gateway}'")

    if is_explicit_invalid or len(mismatches) > 0:
        cause = "Source Host IP Configuration Mismatch" if mismatches else "Source IP Configuration Reported Invalid"
        return {
            "rule": "Rule A",
            "symptom": f"Host configuration error on {source_device.name if source_device else 'source host'}",
            "likely_cause": cause,
            "failure_location": f"{source_device.name if source_device else 'Source Host'} Network Settings",
            "evidence": mismatches if mismatches else ["Source configuration was explicitly flagged as invalid by user."],
            "confidence": "High" if mismatches else "Medium",
            "confidence_reason": "Direct comparison against network profile verified configuration mismatch." if mismatches else "Source configuration was marked invalid without specific parameters.",
            "actions": [
                f"Verify IP address, subnet mask, and default gateway on {source_device.name if source_device else 'source host'}.",
                f"In Packet Tracer, open {source_device.name if source_device else 'PC'} -> Desktop -> IP Configuration and ensure Default Gateway matches the local router interface IP.",
                "Run 'ipconfig /all' in the PC command prompt to verify settings."
            ]
        }
    return None


def apply_rule_b_gateway_unreachable(
    request: DiagnosticRequest,
    source_device: Optional[Device],
    network_profile: Optional[NetworkProfile]
) -> Optional[Dict[str, Any]]:
    """
    Rule B: Default Gateway Unreachable
    Reports local connectivity problem without guessing single cause without proof.
    """
    sr = request.structured_results
    if sr.default_gateway_ping == "FAIL":
        gw_ip = sr.configured_default_gateway or (source_device.default_gateway if source_device else "Default Gateway")
        src_name = source_device.name if source_device else "Source host"

        return {
            "rule": "Rule B",
            "symptom": f"Source host ({src_name}) cannot reach default gateway ({gw_ip})",
            "likely_cause": "Local Segment Connectivity Failure (Multiple plausible causes)",
            "failure_location": f"Local Access Network between {src_name} and Default Gateway ({gw_ip})",
            "evidence": [
                f"Ping from {src_name} to default gateway {gw_ip} failed.",
                "No higher-level router diagnostic evidence confirms whether switch, cable, or gateway interface is down."
            ],
            "confidence": "Medium",
            "confidence_reason": "Gateway ping failure confirmed, but exact failure entity (cable, switch port, router interface) requires further isolation.",
            "actions": [
                "Verify physical link light on the cable between PC and Switch in Packet Tracer (green vs red/amber).",
                f"Verify the router interface configured with {gw_ip} is active using 'show ip interface brief'.",
                "Check switch port status using 'show interface status' or Packet Tracer visual port dots.",
                f"Verify the PC IP address is in the same subnet as the gateway {gw_ip}."
            ],
            "next_tests": [
                "Execute 'show ip interface brief' on the local default gateway router.",
                "Verify link state between PC and local switch in Packet Tracer."
            ]
        }
    return None


def apply_rule_c_interface_admin_down(
    request: DiagnosticRequest,
    path_interfaces: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Rule C: Router Interface Administratively Down
    Evaluates interface status and whether it lies on the relevant communication path.
    """
    sr = request.structured_results
    admin_down_items = []

    for obs in sr.interface_observations:
        if obs.administrative_status.lower() in ["administratively down", "admin down", "down"]:
            is_on_path = False
            # Check if this interface matches any path interface or router
            for pi in path_interfaces:
                if interfaces_match(obs.interface_name, pi) or obs.interface_name.lower() in pi.lower() or pi.lower() in obs.interface_name.lower():
                    is_on_path = True
                    break
            # Also if router is part of path
            admin_down_items.append({
                "router": obs.router_name,
                "interface": obs.interface_name,
                "on_path": is_on_path
            })

    if admin_down_items:
        # Prioritize on-path items
        on_path_items = [item for item in admin_down_items if item["on_path"]]
        target = on_path_items[0] if on_path_items else admin_down_items[0]

        confidence = "High" if target["on_path"] else "Medium"
        reason = (
            f"Interface {target['interface']} on {target['router']} is explicitly reported as administratively down and lies on the active communication path."
            if target["on_path"]
            else f"Interface {target['interface']} on {target['router']} is administratively down, but its relevance to the communication path is unconfirmed."
        )

        return {
            "rule": "Rule C",
            "symptom": f"Router interface {target['interface']} on {target['router']} is administratively disabled (shutdown)",
            "likely_cause": f"Interface {target['interface']} Administratively Down ('shutdown' state)",
            "failure_location": f"{target['router']} [{target['interface']}]",
            "evidence": [
                f"{target['router']} interface {target['interface']} has administrative status: 'administratively down'.",
                f"Path relevance: {'Confirmed on active route' if target['on_path'] else 'Off-path or unverified'}"
            ],
            "confidence": confidence,
            "confidence_reason": reason,
            "actions": [
                f"Access router {target['router']} CLI in Packet Tracer.",
                f"Enter global configuration mode: 'configure terminal'.",
                f"Select interface: 'interface {target['interface']}'.",
                "Issue command: 'no shutdown' to administratively enable the port.",
                "Verify interface comes up using 'show ip interface brief'."
            ],
            "next_tests": [
                f"Run 'show ip interface brief' on {target['router']} after issuing 'no shutdown'.",
                "Re-test end-to-end ping."
            ]
        }
    return None


def apply_rule_d_physical_link_failure(
    request: DiagnosticRequest,
    path_links: List[Link]
) -> Optional[Dict[str, Any]]:
    """
    Rule D: Physical Link Failure
    Distinguishes confirmed link disconnection from mere connectivity loss.
    """
    sr = request.structured_results
    if sr.link_status_observation == "LINK_DOWN" or sr.failed_link_id:
        link_id = sr.failed_link_id or "unknown-link"
        matched_link = next((l for l in path_links if l.id == link_id), None)

        loc = f"Link {link_id}"
        evidence = ["Physical link failure or cable disconnection explicitly indicated in observations."]
        if matched_link:
            loc = f"Physical link between {matched_link.source_device} ({matched_link.source_interface}) and {matched_link.target_device} ({matched_link.target_interface})"
            evidence.append(f"Link {matched_link.id} connects {matched_link.source_device} and {matched_link.target_device}.")

        return {
            "rule": "Rule D",
            "symptom": f"Physical transmission medium or layer-1 link disconnected: {loc}",
            "likely_cause": "Layer 1 Physical Link Interruption / Cable Disconnection",
            "failure_location": loc,
            "evidence": evidence,
            "confidence": "High",
            "confidence_reason": "Direct evidence of physical link failure or interface line protocol down provided.",
            "actions": [
                "Inspect physical cable connections in Cisco Packet Tracer between the connected devices.",
                "Check whether the correct cable type is used (e.g. Copper Straight-Through for PC-to-Switch, Serial DTE/DCE for WAN links).",
                "Verify DCE clock rate configuration if using Serial cables ('clock rate 64000').",
                "Verify both connected interfaces have protocol UP ('show ip interface brief')."
            ],
            "next_tests": [
                "Verify interface line protocol status on both endpoints.",
                "Re-test connectivity after reconnecting cable."
            ]
        }
    return None


def apply_rule_e_missing_route(
    request: DiagnosticRequest,
    destination_ip: Optional[str]
) -> Optional[Dict[str, Any]]:
    """
    Rule E: Missing Route
    Flags absence of static/dynamic route in intermediate routing table.
    """
    sr = request.structured_results
    for ro in sr.routing_observations:
        if ro.route_found == "NO":
            router = ro.router_name
            target_net = ro.destination_network
            next_hop = ro.next_hop or "Expected WAN Next-Hop"

            mask = "255.255.255.0"
            try:
                if "/" in target_net:
                    mask = str(ipaddress.IPv4Network(target_net, strict=False).netmask)
            except Exception:
                pass

            return {
                "rule": "Rule E",
                "symptom": f"Missing routing table entry for destination network {target_net} on router {router}",
                "likely_cause": f"Missing Static Route to {target_net} on {router}",
                "failure_location": f"Routing Table of {router}",
                "evidence": [
                    f"Routing table check on {router} confirmed route to {target_net} is absent (route_found = NO).",
                    f"Destination traffic to {target_net} cannot be forwarded past {router} without a matching route or default route."
                ],
                "confidence": "High",
                "confidence_reason": "Routing table inspection explicitly confirmed the absent routing prefix on intermediate router.",
                "actions": [
                    f"Access router {router} in Packet Tracer.",
                    f"Configure the missing static route: 'ip route {target_net.split('/')[0]} {mask} {next_hop}'.",
                    f"Confirm the route appears using 'show ip route'.",
                    f"Check reverse path route on destination router back to source network."
                ],
                "next_tests": [
                    f"Run 'show ip route {target_net.split('/')[0]}' on {router}.",
                    "Execute traceroute from source host to observe packet progression."
                ]
            }
    return None


def apply_rule_i_acl_or_vlan(
    request: DiagnosticRequest
) -> Optional[Dict[str, Any]]:
    """
    Rule I: ACL or VLAN Problems
    Only triggers with explicit evidence, never inferred purely from a failed ping.
    """
    sr = request.structured_results
    obs = sr.acl_vlan_observation
    if obs and obs.issue_type != "NONE":
        if obs.issue_type == "ACL_DENY":
            return {
                "rule": "Rule I",
                "symptom": f"Traffic denied by Access Control List on {obs.device_name}",
                "likely_cause": f"Access Control List (ACL) Filter Denying Traffic on {obs.device_name}",
                "failure_location": f"{obs.device_name} Access-List Rules",
                "evidence": [
                    f"Explicit ACL deny observation on {obs.device_name}: {obs.details or 'Inbound/Outbound ACL dropping ICMP or IP packets.'}"
                ],
                "confidence": "High",
                "confidence_reason": "Direct evidence of ACL drop rule or traffic rejection log provided.",
                "actions": [
                    f"Check active ACLs on {obs.device_name}: 'show access-lists'.",
                    "Verify interface access-group bindings: 'show ip interface'.",
                    "Update ACL with permit statement: e.g. 'access-list 101 permit ip any any' or adjust ACE sequence.",
                    "Verify counters using 'show access-lists' after re-testing."
                ]
            }
        elif obs.issue_type == "VLAN_MISMATCH":
            return {
                "rule": "Rule I",
                "symptom": f"VLAN Configuration Mismatch on {obs.device_name}",
                "likely_cause": f"Incorrect VLAN Assignment or Trunk Mismatch on {obs.device_name}",
                "failure_location": f"{obs.device_name} VLAN Configuration",
                "evidence": [
                    f"VLAN mismatch observed: {obs.details or 'Access port assigned to wrong VLAN ID or trunk missing native VLAN match.'}"
                ],
                "confidence": "High",
                "confidence_reason": "Direct evidence of VLAN database or port access VLAN mismatch provided.",
                "actions": [
                    f"Verify VLAN assignments in Packet Tracer: 'show vlan brief' on {obs.device_name}.",
                    "Verify trunk encapsulation and native VLAN: 'show interfaces trunk'.",
                    "Assign correct access VLAN: 'switchport access vlan <VLAN_ID>'."
                ]
            }
    return None


def apply_rule_f_destination_unreachable(
    request: DiagnosticRequest,
    destination_device: Optional[Device],
    last_reachable_hop: Optional[str]
) -> Dict[str, Any]:
    """
    Rule F: Destination Unreachable / Remote Connectivity Failure
    Gateway reached, but destination cannot be reached and exact root cause is not pinpointed.
    """
    dest_name = destination_device.name if destination_device else "Destination Device"
    dest_ip = destination_device.ip_address if destination_device else "Destination IP"

    loc = f"Remote Network Path beyond {last_reachable_hop or 'Local Gateway'}"
    return {
        "rule": "Rule F",
        "symptom": f"End-to-end destination reachability failure to {dest_name} ({dest_ip})",
        "likely_cause": "Remote Connectivity Failure (Downstream link, missing return route, or remote host offline)",
        "failure_location": loc,
        "evidence": [
            f"End-to-end ping to {dest_name} ({dest_ip}) failed.",
            f"Local gateway was reachable, local segment is functional.",
            f"Last verified hop: {last_reachable_hop or 'Default Gateway'}."
        ],
        "confidence": "Medium",
        "confidence_reason": "Failure confirmed between last responding hop and destination, but specific root cause requires hop-by-hop diagnostics.",
        "actions": [
            "Execute 'tracert' / 'traceroute' from source to destination to locate the exact drop-off point.",
            "Verify remote host IP configuration and default gateway in Packet Tracer.",
            "Verify reverse routing: check if destination router has a route back to the source subnet.",
            "Check intermediate router interfaces along the path using 'show ip interface brief'."
        ],
        "next_tests": [
            "Run 'traceroute' or 'tracert' from source PC.",
            f"Verify {dest_name} interface status and default gateway in Packet Tracer."
        ]
    }


def apply_rule_g_healthy(
    request: DiagnosticRequest,
    source_device: Optional[Device],
    destination_device: Optional[Device]
) -> Dict[str, Any]:
    """
    Rule G: Healthy Connectivity
    All required connectivity tests pass with no contradictory findings.
    """
    src_name = source_device.name if source_device else "Source"
    dst_name = destination_device.name if destination_device else "Destination"

    return {
        "rule": "Rule G",
        "symptom": "No anomalous symptoms detected. All connectivity tests passed.",
        "likely_cause": "None. Network connectivity is fully operational.",
        "failure_location": "N/A - Fully Functional",
        "evidence": [
            f"Ping to default gateway passed.",
            f"End-to-end ping from {src_name} to {dst_name} passed.",
            "All tested intermediate interfaces and routes are active."
        ],
        "confidence": "High",
        "confidence_reason": "All tested hops and end-to-end communications succeeded without contradictory evidence.",
        "actions": [
            "Network is healthy. No troubleshooting required.",
            "Save diagnostic report as baseline benchmark for future comparative analysis."
        ]
    }


def apply_rule_h_insufficient_evidence(
    request: DiagnosticRequest,
    details: str = "Insufficient test data provided"
) -> Dict[str, Any]:
    """
    Rule H: Insufficient Evidence
    Provides recommended next commands rather than fabricating a cause.
    """
    return {
        "rule": "Rule H",
        "symptom": "Insufficient or unverified diagnostic evidence to isolate root cause.",
        "likely_cause": "Indeterminate (Insufficient Evidence Provided)",
        "failure_location": "Unknown / Unverified",
        "evidence": [
            f"Available observations: {details}.",
            "Crucial tests (such as gateway ping, intermediate hops, or interface states) are UNKNOWN or NOT TESTED."
        ],
        "confidence": "Low",
        "confidence_reason": "Too few tests performed to conclusively identify or rule out fault locations.",
        "actions": [
            "Do not alter router or PC configurations prematurely.",
            "Execute Step 1: Ping local default gateway from source host.",
            "Execute Step 2: Execute 'tracert <destination_ip>' in PC command prompt to identify where packets halt.",
            "Execute Step 3: Run 'show ip interface brief' on routers along the path.",
            "Execute Step 4: Run 'show ip route' on routers along the path."
        ],
        "next_tests": [
            "Ping default gateway",
            "Traceroute to destination",
            "show ip interface brief on intermediate routers"
        ]
    }
