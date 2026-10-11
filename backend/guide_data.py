from typing import List, Dict, Any, Optional

GUIDE_TOPICS: List[Dict[str, Any]] = [
    {
        "id": "incorrect-ip-address",
        "title": "Incorrect IP Address Assignment",
        "category": "Host & Layer 3 Addressing",
        "symptoms": [
            "Source PC cannot ping default gateway or local peers.",
            "Destination unreachable message when sending ICMP packets.",
            "Host placed in incorrect network segment or overlaps with foreign subnet."
        ],
        "packet_tracer_commands": [
            "PC Command Prompt: ipconfig /all",
            "Router CLI: show ip interface brief",
            "Router CLI: show arp"
        ],
        "verification_steps": [
            "Check IP address and subnet mask in PC Desktop -> IP Configuration.",
            "Verify whether the IP belongs to the network prefix assigned to the router's LAN interface.",
            "Check ARP table on the router to see if the host IP resolves to a MAC address."
        ],
        "corrective_actions": [
            "Reassign an available host IP within the proper subnet (e.g. 192.168.10.10/24 on PC1).",
            "Ensure host IP is not identical to the router default gateway (e.g. 192.168.10.1)."
        ],
        "recovery_verification": [
            "Execute 'ipconfig /all' to verify the new IP is active.",
            "Ping the local router gateway interface ('ping 192.168.10.1') and verify 100% reply rate."
        ],
        "ios_examples": """# On Cisco Router (if configuring interface):
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip address 192.168.10.1 255.255.255.0
Router(config-if)# no shutdown
Router(config-if)# exit"""
    },
    {
        "id": "incorrect-subnet-mask",
        "title": "Incorrect Subnet Mask",
        "category": "Host & Layer 3 Addressing",
        "symptoms": [
            "Host can ping some hosts on the local subnet but fails to reach the gateway.",
            "Host treats remote subnets as local (mask too short) and attempts ARP instead of routing.",
            "Host treats local subnet addresses as remote (mask too long) and sends them to the gateway unnecessarily."
        ],
        "packet_tracer_commands": [
            "PC Command Prompt: ipconfig /all",
            "PC Command Prompt: arp -a",
            "Router CLI: show running-config interface GigabitEthernet0/0"
        ],
        "verification_steps": [
            "Compare the subnet mask on the PC with the subnet mask configured on the router LAN interface.",
            "Example: PC configured with 255.255.0.0 (/16) while router expects 255.255.255.0 (/24)."
        ],
        "corrective_actions": [
            "Change the subnet mask in PC Desktop -> IP Configuration to match the network design (e.g., 255.255.255.0).",
            "Flush the ARP cache in the PC prompt using 'arp -d *'."
        ],
        "recovery_verification": [
            "Ping default gateway and verify prompt shows reply time <1ms.",
            "Ping remote subnets to verify packets forward through gateway."
        ],
        "ios_examples": """# Checking mask on Cisco Router:
Router# show ip interface GigabitEthernet0/0
# Internet address is 192.168.10.1/24
# Broadcast address is 192.168.10.255
# Subnet mask must match on all LAN hosts!"""
    },
    {
        "id": "incorrect-default-gateway",
        "title": "Incorrect Default Gateway",
        "category": "Host & Layer 3 Addressing",
        "symptoms": [
            "PC can ping other PCs in its local subnet successfully.",
            "PC CANNOT ping any devices on remote subnets (e.g. Server1 or PC2).",
            "Packet Tracer simulation shows ARP requests sent for remote IPs if gateway is blank, or ARP sent to non-existent gateway IP."
        ],
        "packet_tracer_commands": [
            "PC Command Prompt: ipconfig /all",
            "PC Command Prompt: ping <gateway_ip>",
            "PC Command Prompt: tracert <destination_ip>"
        ],
        "verification_steps": [
            "Examine PC Default Gateway setting in Desktop -> IP Configuration.",
            "Verify the gateway IP exactly matches the router interface on the local LAN segment (e.g. 192.168.10.1 for PC1).",
            "Ping the gateway directly."
        ],
        "corrective_actions": [
            "Set Default Gateway on PC1 to the router's LAN IP (192.168.10.1).",
            "Ensure the default gateway belongs to the same subnet as the PC."
        ],
        "recovery_verification": [
            "Run 'ping 192.168.10.1' from PC1 prompt (must succeed).",
            "Run 'ping 192.168.30.10' (Server1) from PC1 prompt (must succeed)."
        ],
        "ios_examples": """# Verify router LAN IP:
R1# show ip interface brief
Interface              IP-Address      OK? Method Status  Protocol
GigabitEthernet0/0      192.168.10.1    YES manual up      up
# Note: R1 G0/0 IP must be configured as Default Gateway on all PC1 LAN devices."""
    },
    {
        "id": "duplicate-ip-address",
        "title": "Duplicate IP Address Conflict",
        "category": "Host & Layer 3 Addressing",
        "symptoms": [
            "Intermittent ping replies (e.g., 2 replies succeeded, 2 timed out).",
            "Packet Tracer simulation shows ARP reply conflicts where two devices claim the same IP.",
            "Router ARP table flips between two MAC addresses."
        ],
        "packet_tracer_commands": [
            "PC Command Prompt: arp -a",
            "Router CLI: show arp",
            "Router CLI: show logging"
        ],
        "verification_steps": [
            "Inspect MAC addresses in router ARP table for the conflicting IP.",
            "In Packet Tracer, click on each PC/Server on the segment and inspect their FastEthernet MAC addresses."
        ],
        "corrective_actions": [
            "Assign a unique, unused IP address to the conflicting host.",
            "Clear router ARP table using 'clear arp-cache' on Cisco IOS."
        ],
        "recovery_verification": [
            "Run continuous ping ('ping -t <ip>') to ensure 100% steady replies without dropouts.",
            "Verify 'show arp' shows a single stable MAC address."
        ],
        "ios_examples": """# Clearing ARP cache on Router:
Router# clear arp-cache
Router# show arp
# Look for unique IP-to-MAC bindings."""
    },
    {
        "id": "router-interface-admin-down",
        "title": "Router Interface Administratively Down",
        "category": "Router Interfaces & Ports",
        "symptoms": [
            "Packet Tracer shows a RED triangle on the router interface port.",
            "show ip interface brief displays 'administratively down' for Status and 'down' for Protocol.",
            "Any traffic arriving or attempting to egress that port is dropped immediately."
        ],
        "packet_tracer_commands": [
            "Router CLI: show ip interface brief",
            "Router CLI: show interfaces <interface-id>",
            "Router CLI: show running-config interface <interface-id>"
        ],
        "verification_steps": [
            "Run 'show ip interface brief' in router privileged EXEC mode.",
            "Look for 'administratively down' in the Status column for the path interface (e.g. Serial0/1/0 or GigabitEthernet0/0)."
        ],
        "corrective_actions": [
            "Access configuration mode for the specific interface.",
            "Issue the 'no shutdown' command."
        ],
        "recovery_verification": [
            "Run 'show ip interface brief' and verify Status changes to 'up' and Protocol changes to 'up'.",
            "Port indicator triangle in Packet Tracer turns GREEN."
        ],
        "ios_examples": """# Enabling an administratively disabled interface:
Router# configure terminal
Router(config)# interface Serial0/1/0
Router(config-if)# no shutdown
Router(config-if)# end
Router# show ip interface brief"""
    },
    {
        "id": "physical-link-failure",
        "title": "Physical Link / Cable Disconnection",
        "category": "Physical Layer & Media",
        "symptoms": [
            "Interface status shows 'down' and protocol shows 'down'.",
            "Packet Tracer link indicator shows RED or disconnected cable icon.",
            "Serial links show 'down / down' if cable is disconnected or DCE clock rate is omitted."
        ],
        "packet_tracer_commands": [
            "Router CLI: show ip interface brief",
            "Router CLI: show controllers <interface-id> (e.g. Serial0/1/0)",
            "Switch CLI: show interfaces status"
        ],
        "verification_steps": [
            "Inspect physical connections in Packet Tracer workspace.",
            "Check for Serial DTE/DCE cable: verify DCE side has clock rate set.",
            "Verify Ethernet cable type: Straight-Through for PC-to-Switch; Cross-Over for Router-to-Router (unless Auto-MDIX is enabled)."
        ],
        "corrective_actions": [
            "Reconnect the appropriate cable in Packet Tracer.",
            "On Serial DCE interface, configure clock rate: 'clock rate 64000'.",
            "Ensure the remote peer interface is also enabled with 'no shutdown'."
        ],
        "recovery_verification": [
            "Verify link lights turn GREEN.",
            "Run 'show ip interface brief' to confirm Status is 'up' and Protocol is 'up'."
        ],
        "ios_examples": """# Configuring Clock Rate on Serial DCE side:
R1# show controllers Serial0/1/0
# If DCE cable detected:
R1(config)# interface Serial0/1/0
R1(config-if)# clock rate 64000
R1(config-if)# no shutdown"""
    },
    {
        "id": "missing-static-route",
        "title": "Missing Static Route",
        "category": "Routing & Forwarding",
        "symptoms": [
            "Traceroute stops at a specific router and shows '* * *' or 'Destination host unreachable'.",
            "Router responds with ICMP Type 3 Code 0 (Net Unreachable).",
            "Router routing table does not contain a prefix matching the destination IP."
        ],
        "packet_tracer_commands": [
            "Router CLI: show ip route",
            "Router CLI: show ip route <destination-network>",
            "PC Command Prompt: tracert <destination-ip>"
        ],
        "verification_steps": [
            "On each router along the path, execute 'show ip route'.",
            "Search for a route entry covering the target network (e.g. 192.168.30.0/24 on R1).",
            "Verify Gateway of Last Resort is not set, meaning non-matching packets are discarded."
        ],
        "corrective_actions": [
            "Configure a static route directing traffic toward the next-hop router interface.",
            "Also check the return path! The remote destination router must have a route back to the source subnet."
        ],
        "recovery_verification": [
            "Run 'show ip route' on the router and confirm the 'S' code entry appears.",
            "Test end-to-end ping from source host to destination."
        ],
        "ios_examples": """# Adding missing static route on R1 toward Server1:
R1(config)# ip route 192.168.30.0 255.255.255.0 10.0.12.2
# Remember the return route on R3 back to PC1:
R3(config)# ip route 192.168.10.0 255.255.255.0 10.0.23.1
R1# show ip route"""
    },
    {
        "id": "incorrect-next-hop-address",
        "title": "Incorrect Next-Hop Address",
        "category": "Routing & Forwarding",
        "symptoms": [
            "Static route exists in configuration but does not appear in 'show ip route' (next-hop unreachable).",
            "Packets are sent to a non-existent or wrong IP on the point-to-point link.",
            "ARP requests for next hop fail or timeout."
        ],
        "packet_tracer_commands": [
            "Router CLI: show running-config | include ip route",
            "Router CLI: show ip route",
            "Router CLI: ping <next-hop-ip>"
        ],
        "verification_steps": [
            "Check 'ip route' commands in 'show running-config'.",
            "Verify the next-hop IP belongs to the directly connected WAN link subnet.",
            "Ping the next-hop IP directly from the router prompt."
        ],
        "corrective_actions": [
            "Remove the incorrect static route: 'no ip route <net> <mask> <wrong-next-hop>'.",
            "Add the correct static route with the valid neighbor IP (e.g. 10.0.12.2 on R1)."
        ],
        "recovery_verification": [
            "Ping next-hop IP (must return 5/5 '!!!!!').",
            "Verify route enters routing table in 'show ip route'."
        ],
        "ios_examples": """# Fixing incorrect next hop on R1:
R1(config)# no ip route 192.168.30.0 255.255.255.0 10.0.99.2
R1(config)# ip route 192.168.30.0 255.255.255.0 10.0.12.2
R1# ping 10.0.12.2"""
    },
    {
        "id": "incorrect-vlan-configuration",
        "title": "Incorrect VLAN Assignment / Trunk Mismatch",
        "category": "Switching & Layer 2",
        "symptoms": [
            "PC connected to switch port cannot communicate with router or other hosts on same intended VLAN.",
            "Ping fails with 0% success despite link lights being green.",
            "Switch access port is assigned to default VLAN 1 instead of target VLAN (e.g. VLAN 10)."
        ],
        "packet_tracer_commands": [
            "Switch CLI: show vlan brief",
            "Switch CLI: show interfaces trunk",
            "Switch CLI: show mac address-table"
        ],
        "verification_steps": [
            "Run 'show vlan brief' on the switch and find the port connecting to the PC (e.g. Fa0/1).",
            "Verify whether it is assigned to the correct VLAN ID.",
            "On trunk links, verify native VLAN matches on both ends ('Native VLAN mismatch' syslog warning)."
        ],
        "corrective_actions": [
            "Assign access port to correct VLAN: 'switchport mode access' followed by 'switchport access vlan <ID>'.",
            "Create the VLAN in the VLAN database if it does not exist: 'vlan <ID>'."
        ],
        "recovery_verification": [
            "Run 'show vlan brief' to confirm port is listed under the proper VLAN.",
            "Ping default gateway from the connected PC."
        ],
        "ios_examples": """# Assigning port Fa0/1 to VLAN 10 on Cisco Switch:
SW1(config)# vlan 10
SW1(config-vlan)# name LAN_PC1
SW1(config-vlan)# exit
SW1(config)# interface FastEthernet0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10
SW1(config-if)# exit"""
    },
    {
        "id": "acl-blocking-traffic",
        "title": "Access Control List (ACL) Blocking Traffic",
        "category": "Network Security & Filtering",
        "symptoms": [
            "Router responds with 'Destination Host Unreachable' or 'Communication Administratively Prohibited'.",
            "Ping fails while routing table and interfaces are completely healthy.",
            "show access-lists displays incrementing match counters on 'deny' statements."
        ],
        "packet_tracer_commands": [
            "Router CLI: show access-lists",
            "Router CLI: show ip interface <interface-id>",
            "Router CLI: show running-config | include access-list"
        ],
        "verification_steps": [
            "Run 'show access-lists' on the router to inspect rules and deny match counts.",
            "Run 'show ip interface <id>' to identify if an inbound or outbound ACL is applied ('Inbound access list is 101').",
            "Check whether the implicit 'deny ip any any' at the end of the ACL is dropping legitimate packets."
        ],
        "corrective_actions": [
            "Add a permit statement for the required traffic (e.g. 'permit icmp any any' or 'permit ip 192.168.10.0 0.0.0.255 any').",
            "Alternatively, remove the access-group from the interface during troubleshooting: 'no ip access-group <ACL_ID> in'."
        ],
        "recovery_verification": [
            "Run 'show access-lists' and re-run ping; observe permit counter incrementing.",
            "Ping completes successfully."
        ],
        "ios_examples": """# Troubleshooting and modifying ACL:
R1# show access-lists
# Standard IP access list 10
#     10 deny 192.168.10.10 (4 matches)
# Fix by permitting traffic:
R1(config)# access-list 10 permit 192.168.10.10
# Or removing ACL from interface:
R1(config)# interface GigabitEthernet0/0
R1(config-if)# no ip access-group 10 in"""
    },
    {
        "id": "destination-device-unavailable",
        "title": "Destination Device Unavailable / Offline",
        "category": "End Hosts & Services",
        "symptoms": [
            "All intermediate router hops respond to traceroute up to the destination's local gateway.",
            "Last hop router responds with 'Request timed out' or ARP timeout for the destination IP.",
            "Destination server or PC has power off, NIC disabled, or firewall dropping ICMP echo."
        ],
        "packet_tracer_commands": [
            "Destination PC/Server: ipconfig /all",
            "Destination Router: show arp",
            "Destination Router: ping <destination-ip>"
        ],
        "verification_steps": [
            "Check if destination device in Packet Tracer is turned ON (green power light).",
            "Ping the destination IP from its local default gateway router (e.g. ping Server1 192.168.30.10 from R3).",
            "Inspect R3 ARP table: if incomplete or missing, destination host is not responding to ARP."
        ],
        "corrective_actions": [
            "Power on the device in Packet Tracer.",
            "Verify FastEthernet cable is connected to the destination host.",
            "Ensure IP configuration on the destination device matches its local LAN subnet."
        ],
        "recovery_verification": [
            "Ping destination from local router (R3# ping 192.168.30.10 -> '!!!!!').",
            "Ping destination from remote source (PC1) -> 100% success."
        ],
        "ios_examples": """# Check ARP on destination router (R3):
R3# show arp
# Internet  192.168.30.10   -   0001.9612.ABCD  ARPA  GigabitEthernet0/0
# Ping destination directly:
R3# ping 192.168.30.10
# Success rate is 100 percent (5/5)"""
    }
]


def get_all_guide_topics() -> List[Dict[str, Any]]:
    return GUIDE_TOPICS


def get_guide_topic_by_id(topic_id: str) -> Optional[Dict[str, Any]]:
    for topic in GUIDE_TOPICS:
        if topic["id"] == topic_id:
            return topic
    return None
