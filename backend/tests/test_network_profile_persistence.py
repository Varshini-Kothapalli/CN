import pytest
from fastapi.testclient import TestClient

from backend import storage
from backend.main import app


@pytest.fixture
def isolated_client(tmp_path, monkeypatch):
    """Keep API persistence tests away from the developer's working data files."""
    monkeypatch.setattr(storage, "DATA_DIR", str(tmp_path))
    monkeypatch.setattr(storage, "NETWORKS_FILE", str(tmp_path / "networks.json"))
    monkeypatch.setattr(storage, "DIAGNOSTICS_FILE", str(tmp_path / "diagnostics.json"))
    with TestClient(app) as client:
        yield client


def _sample_profile(client):
    response = client.get("/api/networks/net-cisco-sample-01")
    assert response.status_code == 200
    return response.json()


def _device(profile, device_id):
    return next(device for device in profile["devices"] if device["id"] == device_id)


def test_device_edits_persist_and_diagnosis_uses_latest_profile(isolated_client):
    client = isolated_client
    profile = _sample_profile(client)
    pc1 = _device(profile, "dev-pc1")
    pc1["name"] = "PC1-Lab"
    pc1["type"] = "Server"
    pc1["default_gateway"] = "192.168.10.254"
    pc1["interfaces"].append({
        "name": "FastEthernet1",
        "ip_address": "192.168.10.12",
        "subnet_mask": "255.255.255.0",
        "status": "down",
        "protocol": "down",
    })

    response = client.put(f"/api/networks/{profile['id']}", json=profile)
    assert response.status_code == 200
    saved_pc1 = _device(response.json(), "dev-pc1")
    assert saved_pc1["name"] == "PC1-Lab"
    assert saved_pc1["type"] == "Server"
    assert saved_pc1["default_gateway"] == "192.168.10.254"
    assert saved_pc1["interfaces"][1]["name"] == "FastEthernet1"
    assert saved_pc1["interfaces"][1]["status"] == "down"
    assert _device(client.get(f"/api/networks/{profile['id']}").json(), "dev-pc1")["default_gateway"] == "192.168.10.254"

    profile = _sample_profile(client)
    pc1 = _device(profile, "dev-pc1")
    pc1["ip_address"] = "192.168.10.11"
    pc1["subnet_mask"] = "255.255.255.128"
    pc1["interfaces"][0]["ip_address"] = "192.168.10.11"
    pc1["interfaces"][0]["subnet_mask"] = "255.255.255.128"
    pc1["interfaces"][0]["status"] = "down"
    pc1["interfaces"][1]["name"] = "FastEthernet1/0"
    response = client.put(f"/api/networks/{profile['id']}", json=profile)
    assert response.status_code == 200
    saved = client.get(f"/api/networks/{profile['id']}").json()
    assert _device(saved, "dev-pc1")["ip_address"] == "192.168.10.11"
    assert _device(saved, "dev-pc1")["subnet_mask"] == "255.255.255.128"
    assert _device(saved, "dev-pc1")["interfaces"][0]["ip_address"] == "192.168.10.11"
    assert _device(saved, "dev-pc1")["interfaces"][0]["subnet_mask"] == "255.255.255.128"
    assert _device(saved, "dev-pc1")["interfaces"][0]["status"] == "down"
    assert _device(saved, "dev-pc1")["interfaces"][1]["name"] == "FastEthernet1/0"

    pc1 = _device(saved, "dev-pc1")
    pc1["interfaces"].pop()
    response = client.put(f"/api/networks/{profile['id']}", json=saved)
    assert response.status_code == 200
    saved = client.get(f"/api/networks/{profile['id']}").json()
    assert len(_device(saved, "dev-pc1")["interfaces"]) == 1

    # Evidence using the former gateway is compared with the current saved profile.
    report_response = client.post("/api/diagnostics/analyze", json={
        "network_id": profile["id"],
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "configured_source_ip": "192.168.10.11",
            "configured_default_gateway": "192.168.10.1",
            "default_gateway_ping": "FAIL",
            "destination_ping": "FAIL",
        },
    })
    assert report_response.status_code == 201
    report = report_response.json()
    assert report["source_ip"] == "192.168.10.11"
    assert report["source_device"] == "PC1-Lab"
    assert "192.168.10.254" in str(report["supporting_evidence"])
    assert report["overall_status"] == "FAULT DETECTED"

    # A configured gateway alone is not evidence that it answered a ping.
    report_response = client.post("/api/diagnostics/analyze", json={
        "network_id": profile["id"],
        "source_device_id": "dev-pc1",
        "destination_device_id": "dev-server1",
        "structured_results": {
            "source_config_valid": "PASS",
            "configured_default_gateway": "192.168.10.254",
            "default_gateway_ping": "NOT_TESTED",
            "destination_ping": "PASS",
        },
    })
    assert report_response.status_code == 201
    report = report_response.json()
    assert report["overall_status"] != "HEALTHY"
    assert report["individual_tests"]["default_gateway_ping"] == "NOT_TESTED"
    assert not any("gateway passed" in item["description"].lower() for item in report["supporting_evidence"])


def test_device_and_link_crud_persist_without_dangling_links(isolated_client):
    client = isolated_client
    profile = _sample_profile(client)
    profile["devices"].append({
        "id": "dev-extra-pc",
        "name": "ExtraPC",
        "type": "PC",
        "ip_address": "192.168.10.20",
        "subnet_mask": "255.255.255.0",
        "default_gateway": "192.168.10.1",
        "interfaces": [{
            "name": "FastEthernet0",
            "ip_address": "192.168.10.20",
            "subnet_mask": "255.255.255.0",
            "status": "up",
            "protocol": "up",
        }],
        "routes": [],
    })
    profile["links"].append({
        "id": "link-extra-pc",
        "source_device": "dev-extra-pc",
        "source_interface": "FastEthernet0",
        "target_device": "dev-sw1",
        "target_interface": "FastEthernet0/1",
        "status": "up",
    })
    response = client.put(f"/api/networks/{profile['id']}", json=profile)
    assert response.status_code == 200
    saved = client.get(f"/api/networks/{profile['id']}").json()
    assert any(device["id"] == "dev-extra-pc" for device in saved["devices"])
    assert any(link["id"] == "link-extra-pc" for link in saved["links"])

    link = next(link for link in saved["links"] if link["id"] == "link-extra-pc")
    link["target_interface"] = "FastEthernet0/2"
    link["status"] = "down"
    response = client.put(f"/api/networks/{profile['id']}", json=saved)
    assert response.status_code == 200
    saved = client.get(f"/api/networks/{profile['id']}").json()
    changed_link = next(link for link in saved["links"] if link["id"] == "link-extra-pc")
    assert changed_link["target_interface"] == "FastEthernet0/2"
    assert changed_link["status"] == "down"

    saved["devices"] = [device for device in saved["devices"] if device["id"] != "dev-extra-pc"]
    saved["links"] = [link for link in saved["links"] if link["source_device"] != "dev-extra-pc" and link["target_device"] != "dev-extra-pc"]
    response = client.put(f"/api/networks/{profile['id']}", json=saved)
    assert response.status_code == 200
    saved = client.get(f"/api/networks/{profile['id']}").json()
    assert not any(device["id"] == "dev-extra-pc" for device in saved["devices"])
    assert not any(link["id"] == "link-extra-pc" for link in saved["links"])

    link_id = saved["links"][0]["id"]
    saved["links"] = [link for link in saved["links"] if link["id"] != link_id]
    response = client.put(f"/api/networks/{profile['id']}", json=saved)
    assert response.status_code == 200
    assert not any(link["id"] == link_id for link in client.get(f"/api/networks/{profile['id']}").json()["links"])

    saved["links"].append({
        "id": "dangling-link",
        "source_device": "missing-device",
        "source_interface": "Ethernet0",
        "target_device": "dev-sw1",
        "target_interface": "FastEthernet0/1",
        "status": "up",
    })
    response = client.put(f"/api/networks/{profile['id']}", json=saved)
    assert response.status_code == 400
    assert "non-existent source device" in response.json()["detail"]


def test_update_reports_missing_profiles_and_rejects_mismatched_ids(isolated_client):
    profile = _sample_profile(isolated_client)
    response = isolated_client.put("/api/networks/missing-profile", json={**profile, "id": "missing-profile"})
    assert response.status_code == 404

    response = isolated_client.put("/api/networks/other-id", json=profile)
    assert response.status_code == 409


def test_empty_profiles_file_is_not_replaced_with_sample_data(isolated_client, tmp_path):
    networks_file = tmp_path / "networks.json"
    networks_file.write_text("", encoding="utf-8")

    response = isolated_client.get("/api/networks")

    assert response.status_code == 200
    assert response.json() == []
    assert networks_file.read_text(encoding="utf-8") == ""
