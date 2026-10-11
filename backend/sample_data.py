from datetime import datetime, timezone
from typing import Dict, Any, List

def get_sample_network() -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": "net-cisco-sample-01",
        "name": "Enterprise Campus & Branch Network",
        "description": "Standard Cisco Packet Tracer lab topology: Multi-router WAN with PC1, PC2 LANs and Server Farm",
        "created_at": now,
        "updated_at": now,
        "devices": [
            {
                "id": "dev-pc1",
                "name": "PC1",
                "type": "PC",
                "ip_address": "192.168.10.10",
                "subnet_mask": "255.255.255.0",
                "default_gateway": "192.168.10.1",
                "interfaces": [
                    {
                        "name": "FastEthernet0",
                        "ip_address": "192.168.10.10",
                        "subnet_mask": "255.255.255.0",
                        "status": "up",
                        "protocol": "up"
                    }
                ],
                "routes": []
            },
            {
                "id": "dev-sw1",
                "name": "SW1",
                "type": "Switch",
                "ip_address": "192.168.10.2",
                "subnet_mask": "255.255.255.0",
                "default_gateway": "192.168.10.1",
                "interfaces": [
                    {"name": "FastEthernet0/1", "status": "up", "protocol": "up"},
                    {"name": "GigabitEthernet0/1", "status": "up", "protocol": "up"}
                ],
                "routes": []
            },
            {
                "id": "dev-r1",
                "name": "R1",
                "type": "Router",
                "ip_address": "192.168.10.1",
                "subnet_mask": "255.255.255.0",
                "default_gateway": None,
                "interfaces": [
                    {
                        "name": "GigabitEthernet0/0",
                        "ip_address": "192.168.10.1",
                        "subnet_mask": "255.255.255.0",
                        "status": "up",
                        "protocol": "up"
                    },
                    {
                        "name": "Serial0/1/0",
                        "ip_address": "10.0.12.1",
                        "subnet_mask": "255.255.255.252",
                        "status": "up",
                        "protocol": "up"
                    }
                ],
                "routes": [
                    {"destination_network": "192.168.20.0/24", "next_hop": "10.0.12.2", "interface": "Serial0/1/0", "route_type": "static"},
                    {"destination_network": "10.0.23.0/30", "next_hop": "10.0.12.2", "interface": "Serial0/1/0", "route_type": "static"},
                    {"destination_network": "192.168.30.0/24", "next_hop": "10.0.12.2", "interface": "Serial0/1/0", "route_type": "static"}
                ]
            },
            {
                "id": "dev-r2",
                "name": "R2",
                "type": "Router",
                "ip_address": "192.168.20.1",
                "subnet_mask": "255.255.255.0",
                "default_gateway": None,
                "interfaces": [
                    {
                        "name": "GigabitEthernet0/0",
                        "ip_address": "192.168.20.1",
                        "subnet_mask": "255.255.255.0",
                        "status": "up",
                        "protocol": "up"
                    },
                    {
                        "name": "Serial0/1/0",
                        "ip_address": "10.0.12.2",
                        "subnet_mask": "255.255.255.252",
                        "status": "up",
                        "protocol": "up"
                    },
                    {
                        "name": "Serial0/1/1",
                        "ip_address": "10.0.23.1",
                        "subnet_mask": "255.255.255.252",
                        "status": "up",
                        "protocol": "up"
                    }
                ],
                "routes": [
                    {"destination_network": "192.168.10.0/24", "next_hop": "10.0.12.1", "interface": "Serial0/1/0", "route_type": "static"},
                    {"destination_network": "192.168.30.0/24", "next_hop": "10.0.23.2", "interface": "Serial0/1/1", "route_type": "static"}
                ]
            },
            {
                "id": "dev-pc2",
                "name": "PC2",
                "type": "PC",
                "ip_address": "192.168.20.10",
                "subnet_mask": "255.255.255.0",
                "default_gateway": "192.168.20.1",
                "interfaces": [
                    {
                        "name": "FastEthernet0",
                        "ip_address": "192.168.20.10",
                        "subnet_mask": "255.255.255.0",
                        "status": "up",
                        "protocol": "up"
                    }
                ],
                "routes": []
            },
            {
                "id": "dev-sw2",
                "name": "SW2",
                "type": "Switch",
                "ip_address": "192.168.20.2",
                "subnet_mask": "255.255.255.0",
                "default_gateway": "192.168.20.1",
                "interfaces": [
                    {"name": "FastEthernet0/1", "status": "up", "protocol": "up"},
                    {"name": "GigabitEthernet0/1", "status": "up", "protocol": "up"}
                ],
                "routes": []
            },
            {
                "id": "dev-r3",
                "name": "R3",
                "type": "Router",
                "ip_address": "192.168.30.1",
                "subnet_mask": "255.255.255.0",
                "default_gateway": None,
                "interfaces": [
                    {
                        "name": "GigabitEthernet0/0",
                        "ip_address": "192.168.30.1",
                        "subnet_mask": "255.255.255.0",
                        "status": "up",
                        "protocol": "up"
                    },
                    {
                        "name": "Serial0/1/0",
                        "ip_address": "10.0.23.2",
                        "subnet_mask": "255.255.255.252",
                        "status": "up",
                        "protocol": "up"
                    }
                ],
                "routes": [
                    {"destination_network": "192.168.10.0/24", "next_hop": "10.0.23.1", "interface": "Serial0/1/0", "route_type": "static"},
                    {"destination_network": "192.168.20.0/24", "next_hop": "10.0.23.1", "interface": "Serial0/1/0", "route_type": "static"},
                    {"destination_network": "10.0.12.0/30", "next_hop": "10.0.23.1", "interface": "Serial0/1/0", "route_type": "static"}
                ]
            },
            {
                "id": "dev-sw3",
                "name": "SW3",
                "type": "Switch",
                "ip_address": "192.168.30.2",
                "subnet_mask": "255.255.255.0",
                "default_gateway": "192.168.30.1",
                "interfaces": [
                    {"name": "FastEthernet0/1", "status": "up", "protocol": "up"},
                    {"name": "GigabitEthernet0/1", "status": "up", "protocol": "up"}
                ],
                "routes": []
            },
            {
                "id": "dev-server1",
                "name": "Server1",
                "type": "Server",
                "ip_address": "192.168.30.10",
                "subnet_mask": "255.255.255.0",
                "default_gateway": "192.168.30.1",
                "interfaces": [
                    {
                        "name": "FastEthernet0",
                        "ip_address": "192.168.30.10",
                        "subnet_mask": "255.255.255.0",
                        "status": "up",
                        "protocol": "up"
                    }
                ],
                "routes": []
            }
        ],
        "links": [
            {
                "id": "link-pc1-sw1",
                "source_device": "dev-pc1",
                "source_interface": "FastEthernet0",
                "target_device": "dev-sw1",
                "target_interface": "FastEthernet0/1",
                "status": "up"
            },
            {
                "id": "link-sw1-r1",
                "source_device": "dev-sw1",
                "source_interface": "GigabitEthernet0/1",
                "target_device": "dev-r1",
                "target_interface": "GigabitEthernet0/0",
                "status": "up"
            },
            {
                "id": "link-r1-r2",
                "source_device": "dev-r1",
                "source_interface": "Serial0/1/0",
                "target_device": "dev-r2",
                "target_interface": "Serial0/1/0",
                "status": "up"
            },
            {
                "id": "link-pc2-sw2",
                "source_device": "dev-pc2",
                "source_interface": "FastEthernet0",
                "target_device": "dev-sw2",
                "target_interface": "FastEthernet0/1",
                "status": "up"
            },
            {
                "id": "link-sw2-r2",
                "source_device": "dev-sw2",
                "source_interface": "GigabitEthernet0/1",
                "target_device": "dev-r2",
                "target_interface": "GigabitEthernet0/0",
                "status": "up"
            },
            {
                "id": "link-r2-r3",
                "source_device": "dev-r2",
                "source_interface": "Serial0/1/1",
                "target_device": "dev-r3",
                "target_interface": "Serial0/1/0",
                "status": "up"
            },
            {
                "id": "link-r3-sw3",
                "source_device": "dev-r3",
                "source_interface": "GigabitEthernet0/0",
                "target_device": "dev-sw3",
                "target_interface": "GigabitEthernet0/1",
                "status": "up"
            },
            {
                "id": "link-sw3-server1",
                "source_device": "dev-sw3",
                "source_interface": "FastEthernet0/1",
                "target_device": "dev-server1",
                "target_interface": "FastEthernet0",
                "status": "up"
            }
        ]
    }
