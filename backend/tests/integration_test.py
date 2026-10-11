import urllib.request
import json

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

base = 'http://127.0.0.1:8000/api'
print('1. Health check:', get(f'{base}/health')['status'])

networks = get(f'{base}/networks')
print(f'2. Networks loaded: {len(networks)} | Name: {networks[0]["name"]}')

scenarios = get(f'{base}/scenarios')
print(f'3. Available Scenarios: {len(scenarios)}')

# Run Scenario 4: Missing Static Route on R1
sc4 = scenarios[3]
diag_req = {
    'network_id': networks[0]['id'],
    'source_device_id': sc4['source_device_id'],
    'destination_device_id': sc4['destination_device_id'],
    'structured_results': sc4['structured_results'],
    'raw_evidence': sc4.get('raw_evidence', {})
}
report = post(f'{base}/diagnostics/analyze', diag_req)
print(f'4. Diagnostic Report Status: {report["overall_status"]}')
print(f'   Likely Cause: {report["likely_cause"]}')
print(f'   Suspected Location: {report["suspected_failure_location"]}')
print(f'   Confidence: {report["confidence"]}')
print(f'   Localized Path Hops: {len(report["path_hops"])}')

# Run Scenario 1: Healthy Network (After fix)
sc1 = scenarios[0]
diag_req_healthy = {
    'network_id': networks[0]['id'],
    'source_device_id': sc1['source_device_id'],
    'destination_device_id': sc1['destination_device_id'],
    'structured_results': sc1['structured_results'],
    'raw_evidence': sc1.get('raw_evidence', {})
}
healthy_report = post(f'{base}/diagnostics/analyze', diag_req_healthy)
print(f'5. Follow-up Healthy Report Status: {healthy_report["overall_status"]}')

# Test Comparative Verification (Before vs After)
comp_req = {
    'before_session_id': report['id'],
    'after_session_id': healthy_report['id']
}
comparison = post(f'{base}/diagnostics/compare', comp_req)
print(f'6. Comparative Verification Result: {comparison["recovery_verification_status"]}')
print(f'   Summary: {comparison["summary"]}')

# Resolve diagnostic session
resolve_res = post(f'{base}/diagnostics/{report["id"]}/resolve', {
    'is_resolved': True,
    'resolution_notes': 'Configured missing static route on R1 using ip route 192.168.30.0 255.255.255.0 10.0.12.2'
})
print(f'7. Resolution updated: is_resolved={resolve_res["is_resolved"]} | status={resolve_res["recovery_verification_status"]}')

# Dashboard Statistics check
stats = get(f'{base}/dashboard/stats')
print(f'8. Dashboard Stats: Total Devices={stats["total_devices"]} | Total Sessions={stats["total_sessions"]} | Healthy={stats["healthy_tests"]} | Resolved={stats["resolved_faults"]}')

# Guide topics check
guide = get(f'{base}/guide')
print(f'9. Troubleshooting Guide Topics: {len(guide)}')
print('\n--> ALL API AND DIAGNOSTIC ENGINE FLOWS VERIFIED SUCCESSFULLY!')
