import re
from typing import Dict, Any, List, Optional


def parse_ping_output(text: Optional[str]) -> Dict[str, Any]:
    """
    Safely parses ping output from Cisco IOS or Packet Tracer PC command prompt.
    Returns:
      {
        "status": "PASS" | "FAIL" | "PARTIAL" | "UNKNOWN",
        "success_rate": Optional[float],
        "target_ip": Optional[str],
        "is_unreachable": bool,
        "is_timed_out": bool,
        "details": str
      }
    """
    if not text or not text.strip():
        return {"status": "UNKNOWN", "success_rate": None, "target_ip": None, "is_unreachable": False, "is_timed_out": False, "details": "No ping output provided"}

    clean = text.strip()

    # Cisco IOS Ping: "Success rate is X percent (Y/Z)"
    cisco_match = re.search(r"Success rate is\s+(\d+)\s+percent\s+\((\d+)/(\d+)\)", clean, re.IGNORECASE)
    if cisco_match:
        percent = float(cisco_match.group(1))
        sent = int(cisco_match.group(3))
        recv = int(cisco_match.group(2))
        status = "PASS" if percent >= 80 else ("FAIL" if percent == 0 else "PARTIAL")
        return {
            "status": status,
            "success_rate": percent,
            "sent": sent,
            "received": recv,
            "is_unreachable": "Destination unreachable" in clean or "U.U.U" in clean,
            "is_timed_out": percent == 0,
            "details": f"Cisco IOS Ping: {percent}% success ({recv}/{sent} received)"
        }

    # Packet Tracer PC ping: "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
    pt_match = re.search(r"Sent\s*=\s*(\d+),\s*Received\s*=\s*(\d+)(?:,\s*Lost\s*=\s*(\d+))?", clean, re.IGNORECASE)
    if pt_match:
        sent = int(pt_match.group(1))
        recv = int(pt_match.group(2))
        percent = (recv / sent * 100) if sent > 0 else 0
        status = "PASS" if percent >= 75 else ("FAIL" if percent == 0 else "PARTIAL")
        return {
            "status": status,
            "success_rate": percent,
            "sent": sent,
            "received": recv,
            "is_unreachable": "Destination host unreachable" in clean,
            "is_timed_out": "Request timed out" in clean and recv == 0,
            "details": f"Host Ping: {percent:.0f}% success ({recv}/{sent} received)"
        }

    # Fallback keyword checks
    if "Destination host unreachable" in clean or "Destination unreachable" in clean:
        return {"status": "FAIL", "success_rate": 0.0, "is_unreachable": True, "is_timed_out": False, "details": "Destination host unreachable"}

    if "Request timed out" in clean and "Reply from" not in clean:
        return {"status": "FAIL", "success_rate": 0.0, "is_unreachable": False, "is_timed_out": True, "details": "Request timed out (100% loss)"}

    if "Reply from" in clean and "Request timed out" not in clean:
        return {"status": "PASS", "success_rate": 100.0, "is_unreachable": False, "is_timed_out": False, "details": "ICMP Echo replies received"}

    return {"status": "UNKNOWN", "success_rate": None, "is_unreachable": False, "is_timed_out": False, "details": "Could not determine ping result from raw text"}


def parse_traceroute_output(text: Optional[str]) -> Dict[str, Any]:
    """
    Safely parses traceroute / tracert output.
    Returns:
      {
        "hops": List[Dict[str, Any]],
        "last_responding_ip": Optional[str],
        "timed_out_at_hop": Optional[int],
        "reached_destination": bool,
        "details": str
      }
    """
    if not text or not text.strip():
        return {"hops": [], "last_responding_ip": None, "timed_out_at_hop": None, "reached_destination": False, "details": "No traceroute output"}

    lines = text.strip().splitlines()
    hops = []
    last_ip = None
    timed_out_hop = None

    for line in lines:
        line_clean = line.strip()
        # Windows format: "  1   <1 ms    <1 ms    <1 ms  192.168.10.1"
        m_win = re.search(r"^\s*(\d+)\s+.*?(\d+\.\d+\.\d+\.\d+)", line_clean)
        # Timeout line: "  3    *        *        *     Request timed out."
        m_win_timeout = re.search(r"^\s*(\d+)\s+[\*\s]+Request timed out", line_clean)
        # Cisco format: "  1 192.168.10.1 2 msec 1 msec 1 msec"
        m_cisco = re.search(r"^\s*(\d+)\s+(\d+\.\d+\.\d+\.\d+)", line_clean)
        # Cisco timeout: "  3  *  *  *"
        m_cisco_timeout = re.search(r"^\s*(\d+)\s+[\*\s]+$", line_clean)

        if m_win:
            hop_num = int(m_win.group(1))
            ip = m_win.group(2)
            hops.append({"hop": hop_num, "ip": ip, "status": "RESPONDED"})
            last_ip = ip
        elif m_cisco:
            hop_num = int(m_cisco.group(1))
            ip = m_cisco.group(2)
            hops.append({"hop": hop_num, "ip": ip, "status": "RESPONDED"})
            last_ip = ip
        elif m_win_timeout:
            hop_num = int(m_win_timeout.group(1))
            hops.append({"hop": hop_num, "ip": None, "status": "TIMEOUT"})
            if timed_out_hop is None:
                timed_out_hop = hop_num
        elif m_cisco_timeout:
            hop_num = int(m_cisco_timeout.group(1))
            hops.append({"hop": hop_num, "ip": None, "status": "TIMEOUT"})
            if timed_out_hop is None:
                timed_out_hop = hop_num

    details = f"Traceroute: {len(hops)} hops parsed. Last responding: {last_ip or 'None'}."
    if timed_out_hop:
        details += f" Timed out at hop {timed_out_hop}."

    return {
        "hops": hops,
        "last_responding_ip": last_ip,
        "timed_out_at_hop": timed_out_hop,
        "reached_destination": timed_out_hop is None and len(hops) > 0,
        "details": details
    }


def normalize_interface_name(name: str) -> str:
    """
    Normalizes interface names to standard Cisco casing without inner whitespace.
    Examples:
      'GigabitEthernet 0/0/0' -> 'GigabitEthernet0/0/0'
      'gi0/0/0' -> 'GigabitEthernet0/0/0'
      'fa0/0' -> 'FastEthernet0/0'
      'se0/1/0' -> 'Serial0/1/0'
    """
    if not name:
        return ""
    s = re.sub(r"\s+", "", name).strip()
    prefixes = [
        ("tengigabitethernet", "TenGigabitEthernet"),
        ("gigabitethernet", "GigabitEthernet"),
        ("fastethernet", "FastEthernet"),
        ("serial", "Serial"),
        ("loopback", "Loopback"),
        ("vlan", "Vlan"),
        ("ethernet", "Ethernet"),
        ("port-channel", "Port-channel"),
        ("te", "TenGigabitEthernet"),
        ("gi", "GigabitEthernet"),
        ("fa", "FastEthernet"),
        ("se", "Serial"),
        ("lo", "Loopback"),
        ("vl", "Vlan"),
        ("eth", "Ethernet"),
    ]
    s_lower = s.lower()
    for short, canonical in prefixes:
        if s_lower.startswith(short):
            rest = s[len(short):]
            return canonical + rest
    return s


def canonical_short_interface(name: str) -> str:
    """Returns normalized short form for comparison, e.g. 'gi0/0/0', 'se0/1/0'"""
    if not name:
        return ""
    s = re.sub(r"\s+", "", name).lower()
    prefixes = [
        ("tengigabitethernet", "te"),
        ("gigabitethernet", "gi"),
        ("fastethernet", "fa"),
        ("serial", "se"),
        ("loopback", "lo"),
        ("vlan", "vl"),
        ("ethernet", "eth"),
        ("port-channel", "po"),
        ("te", "te"),
        ("gi", "gi"),
        ("fa", "fa"),
        ("se", "se"),
        ("lo", "lo"),
        ("vl", "vl"),
        ("eth", "eth"),
        ("po", "po"),
    ]
    for pfx, short in prefixes:
        if s.startswith(pfx):
            return short + s[len(pfx):]
    return s


def interfaces_match(name1: str, name2: str) -> bool:
    """Checks if two interface strings refer to the same interface (handles abbreviations and spaces)."""
    if not name1 or not name2:
        return False
    return canonical_short_interface(name1) == canonical_short_interface(name2)


def parse_show_ip_int_brief(text: Optional[str]) -> List[Dict[str, Any]]:
    """
    Parses 'show ip interface brief' table.
    Supports outputs with separate columns for Status and Protocol,
    including up/up, down/down, administratively down/down,
    spaces, variable column widths, and line wrapping.
    """
    if not text or not text.strip():
        return []

    raw_lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    unwrapped = []

    # Ignore prompt lines (e.g. Router#, R1#, Switch#)
    filtered_lines = []
    for line in raw_lines:
        if re.match(r"^[A-Za-z0-9_\-\.]+[#>]", line):
            continue
        filtered_lines.append(line)

    intf_start_re = re.compile(
        r"^(?:Interface|(?:[A-Za-z]+[\d/\.]|[A-Za-z]+\s+\d))",
        re.IGNORECASE
    )

    for line in filtered_lines:
        if not unwrapped:
            unwrapped.append(line)
        elif intf_start_re.match(line):
            unwrapped.append(line)
        else:
            # Continuation line caused by terminal line wrapping
            unwrapped[-1] += " " + line

    results = []
    record_re = re.compile(
        r"^\s*([A-Za-z]+(?:\s*\d+[\d/\.]*|\d+[\d/\.]*))\s+"
        r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|unassigned)\s+"
        r"(?:YES|NO|\w+)?\s*"
        r"(?:manual|unset|NVRAM|TFTP|DHCP|IPCP|\w+)?\s*"
        r"(administratively\s+down|admin\s+down|up|down)\s+"
        r"(up|down)\s*$",
        re.IGNORECASE
    )

    for line in unwrapped:
        # Skip table header lines
        if re.match(r"^Interface\s+", line, re.I):
            continue
        m = record_re.search(line)
        if m:
            raw_if = m.group(1).strip()
            clean_if = normalize_interface_name(raw_if)
            ip_raw = m.group(2).strip()
            ip_val = None if ip_raw.lower() == "unassigned" else ip_raw
            status_raw = m.group(3).strip().lower()
            status_val = "administratively down" if "admin" in status_raw else status_raw
            protocol_val = m.group(4).strip().lower()

            results.append({
                "interface": clean_if,
                "ip_address": ip_val,
                "status": status_val,
                "protocol": protocol_val
            })

    return results



def parse_show_ip_route(text: Optional[str]) -> List[Dict[str, Any]]:
    """
    Parses 'show ip route' output.
    Returns list of routes:
      {
        "code": "S" | "C" | "L" | "O" | "R" | "D",
        "network": "192.168.30.0/24",
        "next_hop": "10.0.12.2",
        "interface": "Serial0/1/0"
      }
    """
    if not text or not text.strip():
        return []

    routes = []
    lines = text.strip().splitlines()
    for line in lines:
        line = line.strip()
        # Static route: S 192.168.30.0/24 [1/0] via 10.0.12.2
        # or S 192.168.30.0/24 is directly connected, Serial0/1/0
        m_s = re.search(r"^([SCODRLB\*]+)\s+(\d+\.\d+\.\d+\.\d+(?:/\d+)?)(?:.*?via\s+(\d+\.\d+\.\d+\.\d+))?(?:.*?connected,\s*([\w/\.]+))?", line)
        if m_s:
            code = m_s.group(1).strip()
            net = m_s.group(2)
            via = m_s.group(3)
            iface = m_s.group(4)
            routes.append({
                "code": code,
                "network": net,
                "next_hop": via,
                "interface": iface,
                "raw": line
            })
    return routes


def parse_acl_or_vlan_evidence(text: Optional[str]) -> Dict[str, Any]:
    """
    Looks for ACL denial statements, access-group assignments, or VLAN mismatch indicators.
    """
    if not text or not text.strip():
        return {"has_acl_issue": False, "has_vlan_issue": False, "details": None}

    lower = text.lower()
    has_acl = "deny" in lower and ("access-list" in lower or "ip access-group" in lower or "denied" in lower)
    has_vlan = "vlan" in lower and ("mismatch" in lower or "native vlan" in lower or "access vlan" in lower)

    details = []
    if has_acl:
        details.append("Pasted evidence contains access-list deny conditions or packet drop logs.")
    if has_vlan:
        details.append("Pasted evidence contains VLAN mismatch or incorrect access-port configuration.")

    return {
        "has_acl_issue": has_acl,
        "has_vlan_issue": has_vlan,
        "details": " ".join(details) if details else None
    }
