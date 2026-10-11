from typing import List, Dict, Any

SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": "scenario-healthy",
        "title": "Scenario 1: Healthy End-to-End Network",
        "description": "PC1 pings Server1 across 3 routers (R1, R2, R3). All gateways, interfaces, and routes are healthy.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "configured_source_ip": "192.168.10.10",
            "configured_subnet_mask": "255.255.255.0",
            "configured_default_gateway": "192.168.10.1",
            "default_gateway_ping": "PASS",
            "intermediate_hops": [
                {"hop_device": "R1", "hop_ip": "192.168.10.1", "reachability": "PASS"},
                {"hop_device": "R2", "hop_ip": "10.0.12.2", "reachability": "PASS"},
                {"hop_device": "R3", "hop_ip": "10.0.23.2", "reachability": "PASS"}
            ],
            "destination_ping": "PASS",
            "interface_observations": [
                {"router_name": "R1", "interface_name": "GigabitEthernet0/0", "operational_status": "up", "administrative_status": "up"},
                {"router_name": "R1", "interface_name": "Serial0/1/0", "operational_status": "up", "administrative_status": "up"},
                {"router_name": "R2", "interface_name": "Serial0/1/1", "operational_status": "up", "administrative_status": "up"}
            ],
            "routing_observations": [
                {"router_name": "R1", "destination_network": "192.168.30.0/24", "route_found": "YES", "next_hop": "10.0.12.2"}
            ],
            "link_status_observation": "ALL_UP"
        },
        "raw_evidence": {
            "ping_output": "Pinging 192.168.30.10 with 32 bytes of data:\nReply from 192.168.30.10: bytes=32 time=2ms TTL=126\nReply from 192.168.30.10: bytes=32 time=1ms TTL=126\nPackets: Sent = 4, Received = 4, Lost = 0 (0% loss)",
            "traceroute_output": "Tracing route to 192.168.30.10 over a maximum of 30 hops:\n  1   <1 ms    <1 ms    <1 ms  192.168.10.1\n  2    1 ms     1 ms     1 ms  10.0.12.2\n  3    2 ms     1 ms     2 ms  10.0.23.2\n  4    2 ms     2 ms     2 ms  192.168.30.10\nTrace complete."
        }
    },
    {
        "id": "scenario-bad-gateway",
        "title": "Scenario 2: Incorrect Default Gateway on PC1",
        "description": "PC1 has default gateway misconfigured as 192.168.10.99 instead of 192.168.10.1. Cannot reach gateway or remote destinations.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "FAIL",
            "configured_source_ip": "192.168.10.10",
            "configured_subnet_mask": "255.255.255.0",
            "configured_default_gateway": "192.168.10.99",
            "default_gateway_ping": "FAIL",
            "intermediate_hops": [],
            "destination_ping": "FAIL",
            "link_status_observation": "UNKNOWN"
        },
        "raw_evidence": {
            "ping_output": "Pinging 192.168.10.99 with 32 bytes of data:\nRequest timed out.\nRequest timed out.\nPackets: Sent = 4, Received = 0, Lost = 4 (100% loss)"
        }
    },
    {
        "id": "scenario-admin-down",
        "title": "Scenario 3: Router Interface Administratively Down",
        "description": "Serial0/1/0 interface on R1 was shut down ('administratively down'). WAN link between R1 and R2 is offline.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "configured_source_ip": "192.168.10.10",
            "configured_subnet_mask": "255.255.255.0",
            "configured_default_gateway": "192.168.10.1",
            "default_gateway_ping": "PASS",
            "intermediate_hops": [
                {"hop_device": "R1", "reachability": "PASS"},
                {"hop_device": "R2", "reachability": "FAIL"}
            ],
            "destination_ping": "FAIL",
            "interface_observations": [
                {"router_name": "R1", "interface_name": "Serial0/1/0", "operational_status": "down", "administrative_status": "administratively down"}
            ],
            "link_status_observation": "LINK_DOWN"
        },
        "raw_evidence": {
            "show_ip_int_brief": "Interface                  IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0          192.168.10.1    YES manual up                    up      \nSerial0/1/0                10.0.12.1       YES manual administratively down down    \nSerial0/1/1                unassigned      YES unset  administratively down down"
        }
    },
    {
        "id": "scenario-missing-route",
        "title": "Scenario 4: Missing Static Route on R1",
        "description": "R1 has no routing table entry for destination network 192.168.30.0/24. Packets to Server1 are dropped at R1.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "configured_source_ip": "192.168.10.10",
            "configured_subnet_mask": "255.255.255.0",
            "configured_default_gateway": "192.168.10.1",
            "default_gateway_ping": "PASS",
            "intermediate_hops": [
                {"hop_device": "R1", "reachability": "PASS"}
            ],
            "destination_ping": "FAIL",
            "routing_observations": [
                {"router_name": "R1", "destination_network": "192.168.30.0/24", "route_found": "NO", "next_hop": "10.0.12.2"}
            ]
        },
        "raw_evidence": {
            "show_ip_route": "Gateway of last resort is not set\n     10.0.0.0/8 is variably subnetted, 2 subnets, 2 masks\nC       10.0.12.0/30 is directly connected, Serial0/1/0\nL       10.0.12.1/32 is directly connected, Serial0/1/0\nC       192.168.10.0/24 is directly connected, GigabitEthernet0/0\nL       192.168.10.1/32 is directly connected, GigabitEthernet0/0",
            "ping_output": "Pinging 192.168.30.10 with 32 bytes of data:\nReply from 192.168.10.1: Destination host unreachable.\nReply from 192.168.10.1: Destination host unreachable.\nPackets: Sent = 4, Received = 0, Lost = 4 (100% loss)"
        }
    },
    {
        "id": "scenario-inter-router-link",
        "title": "Scenario 5: Inter-Router Link Failure (R2 to R3)",
        "description": "PC1 reaches R1 and R2, but connection between R2 and R3 is broken. Failure region is isolated to the R2-R3 WAN link.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "configured_source_ip": "192.168.10.10",
            "configured_subnet_mask": "255.255.255.0",
            "configured_default_gateway": "192.168.10.1",
            "default_gateway_ping": "PASS",
            "intermediate_hops": [
                {"hop_device": "R1", "reachability": "PASS"},
                {"hop_device": "R2", "reachability": "PASS"},
                {"hop_device": "R3", "reachability": "FAIL"}
            ],
            "destination_ping": "FAIL",
            "link_status_observation": "LINK_DOWN",
            "failed_link_id": "link-r2-r3"
        },
        "raw_evidence": {
            "traceroute_output": "Tracing route to 192.168.30.10 over a maximum of 30 hops:\n  1   <1 ms    <1 ms    <1 ms  192.168.10.1\n  2    1 ms     1 ms     1 ms  10.0.12.2\n  3    *        *        *     Request timed out."
        }
    },
    {
        "id": "scenario-unreachable-no-evidence",
        "title": "Scenario 6: Destination Unreachable with No Additional Evidence",
        "description": "Ping to Server1 fails, gateway ping is OK, but user supplied no router or interface logs. Engine reports POSSIBLE FAULT / INSUFFICIENT EVIDENCE rather than guessing.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "UNKNOWN",
            "default_gateway_ping": "PASS",
            "destination_ping": "FAIL",
            "intermediate_hops": [],
            "interface_observations": [],
            "routing_observations": []
        },
        "raw_evidence": {
            "ping_output": "Pinging 192.168.30.10 with 32 bytes of data:\nRequest timed out.\nRequest timed out.\nPackets: Sent = 4, Received = 0, Lost = 4 (100% loss)"
        }
    },
    {
        "id": "scenario-contradictory",
        "title": "Scenario 7: Contradictory Evidence",
        "description": "User reports destination ping as PASS, but gateway ping as FAIL. Engine flags inconsistency and requests re-test.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "default_gateway_ping": "FAIL",
            "destination_ping": "PASS",
            "intermediate_hops": [],
            "interface_observations": [],
            "routing_observations": []
        },
        "raw_evidence": {
            "ping_output": "Reply from 192.168.30.10: bytes=32 time=2ms TTL=126"
        }
    },
    {
        "id": "scenario-acl-deny",
        "title": "Scenario 8: ACL Denying Traffic on R1",
        "description": "Access-list on R1 explicitly denies traffic from PC1 to Server1. Verified via ACL observation and show access-lists output.",
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "default_gateway_ping": "PASS",
            "destination_ping": "FAIL",
            "intermediate_hops": [
                {"hop_device": "R1", "reachability": "PASS"}
            ],
            "acl_vlan_observation": {
                "device_name": "R1",
                "issue_type": "ACL_DENY",
                "details": "Standard IP access list 10 deny host 192.168.10.10 matches dropped packets"
            }
        },
        "raw_evidence": {
            "show_running_config": "access-list 10 deny host 192.168.10.10\naccess-list 10 permit any\ninterface GigabitEthernet0/0\n ip access-group 10 in"
        }
    }
]

def get_all_scenarios() -> List[Dict[str, Any]]:
    return SCENARIOS
