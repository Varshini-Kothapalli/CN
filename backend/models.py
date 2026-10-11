from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class DeviceType(str, Enum):
    PC = "PC"
    SERVER = "Server"
    SWITCH = "Switch"
    ROUTER = "Router"


class TestStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    UNKNOWN = "UNKNOWN"
    NOT_TESTED = "NOT_TESTED"


class OverallStatus(str, Enum):
    HEALTHY = "HEALTHY"
    FAULT_DETECTED = "FAULT DETECTED"
    POSSIBLE_FAULT = "POSSIBLE FAULT"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT EVIDENCE"


class ConfidenceLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class Interface(BaseModel):
    name: str
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    status: str = "up"  # up, down, administratively down
    protocol: Optional[str] = "up"  # up, down


class RouteEntry(BaseModel):
    destination_network: str
    next_hop: Optional[str] = None
    interface: Optional[str] = None
    route_type: str = "static"  # static, connected, dynamic


class Device(BaseModel):
    id: str
    name: str
    type: DeviceType
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    default_gateway: Optional[str] = None
    interfaces: List[Interface] = Field(default_factory=list)
    routes: List[RouteEntry] = Field(default_factory=list)


class Link(BaseModel):
    id: str
    source_device: str
    source_interface: str
    target_device: str
    target_interface: str
    status: str = "up"  # up, down, unknown


class NetworkProfile(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    devices: List[Device] = Field(default_factory=list)
    links: List[Link] = Field(default_factory=list)
    created_at: str
    updated_at: str


class HopReachability(BaseModel):
    hop_device: str
    hop_ip: Optional[str] = None
    reachability: str = "NOT_TESTED"  # PASS, FAIL, UNKNOWN, NOT_TESTED


class InterfaceObservation(BaseModel):
    router_name: str
    interface_name: str
    operational_status: str = "unknown"  # up, down, unknown
    administrative_status: str = "unknown"  # up, administratively down, unknown


class RoutingObservation(BaseModel):
    router_name: str
    destination_network: str
    expected_route: Optional[str] = None
    route_found: str = "UNKNOWN"  # YES, NO, UNKNOWN
    next_hop: Optional[str] = None


class AclVlanObservation(BaseModel):
    device_name: str
    issue_type: str = "NONE"  # NONE, ACL_DENY, VLAN_MISMATCH, PORT_INACTIVE
    details: Optional[str] = None


class StructuredTestResults(BaseModel):
    source_config_valid: str = "UNKNOWN"  # PASS, FAIL, UNKNOWN, NOT_TESTED
    configured_source_ip: Optional[str] = None
    configured_subnet_mask: Optional[str] = None
    configured_default_gateway: Optional[str] = None
    default_gateway_ping: str = "NOT_TESTED"  # PASS, FAIL, UNKNOWN, NOT_TESTED
    intermediate_hops: List[HopReachability] = Field(default_factory=list)
    destination_ping: str = "NOT_TESTED"  # PASS, FAIL, UNKNOWN, NOT_TESTED
    interface_observations: List[InterfaceObservation] = Field(default_factory=list)
    routing_observations: List[RoutingObservation] = Field(default_factory=list)
    acl_vlan_observation: Optional[AclVlanObservation] = None
    link_status_observation: Optional[str] = "UNKNOWN"  # ALL_UP, LINK_DOWN, UNKNOWN
    failed_link_id: Optional[str] = None
    additional_observations: Optional[str] = None


class RawCommandEvidence(BaseModel):
    ping_output: Optional[str] = None
    traceroute_output: Optional[str] = None
    show_ip_int_brief: Optional[str] = None
    show_ip_route: Optional[str] = None
    show_running_config: Optional[str] = None


class DiagnosticRequest(BaseModel):
    network_id: str
    source_device_id: str
    destination_device_id: str
    structured_results: StructuredTestResults
    raw_evidence: Optional[RawCommandEvidence] = None
    notes: Optional[str] = None


class DiagnosticEvidenceItem(BaseModel):
    source: str
    description: str
    status: str = "SUPPORTING"  # SUPPORTING, INCONSISTENT, INFO


class HopStatusInfo(BaseModel):
    device_id: str
    device_name: str
    device_type: str
    ip: Optional[str] = None
    reachability: str = "NOT_TESTED"  # PASS, FAIL, UNKNOWN, NOT_TESTED
    is_fault_region: bool = False


class DiagnosticReport(BaseModel):
    id: str
    session_id: str
    timestamp: str
    network_id: str
    network_name: str
    source_device: str
    source_ip: Optional[str] = None
    destination_device: str
    destination_ip: Optional[str] = None
    overall_status: str  # HEALTHY, FAULT DETECTED, POSSIBLE FAULT, INSUFFICIENT EVIDENCE
    confidence: str  # High, Medium, Low
    confidence_reason: str
    individual_tests: Dict[str, str] = Field(default_factory=dict)
    identified_symptoms: List[str] = Field(default_factory=list)
    likely_cause: str
    suspected_failure_location: str
    path_hops: List[HopStatusInfo] = Field(default_factory=list)
    localized_link: Optional[Dict[str, Any]] = None
    supporting_evidence: List[DiagnosticEvidenceItem] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    unresolved_questions: List[str] = Field(default_factory=list)
    is_resolved: bool = False
    resolution_notes: Optional[str] = None
    recovery_verification_status: Optional[str] = "PENDING"
    raw_evidence: Optional[RawCommandEvidence] = None
    structured_results: Optional[StructuredTestResults] = None


class ResolutionUpdate(BaseModel):
    is_resolved: bool
    resolution_notes: Optional[str] = None


class ComparisonRequest(BaseModel):
    before_session_id: str
    after_session_id: str


class ComparisonReport(BaseModel):
    before_session: DiagnosticReport
    after_session: DiagnosticReport
    status_change: str  # IMPROVED, REGRESSED, UNCHANGED
    recovery_verification_status: str  # RECOVERED, PARTIALLY_RECOVERED, UNRESOLVED, REGRESSED
    test_differences: List[Dict[str, Any]]
    summary: str
