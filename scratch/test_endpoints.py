import requests
import json

BASE_URL = "http://localhost:8000"

def test_simulation_start():
    print("Testing /simulation/start...")
    resp = requests.post(f"{BASE_URL}/simulation/start", json={"timer_duration": 60})
    print("Status:", resp.status_code)
    data = resp.json()
    print("Response:", data)
    assert resp.status_code == 200
    assert data["success"] is True
    return data["session_id"]

def test_submit_log(session_id):
    print("\nTesting /simulation/submit-log...")
    events = [
        {
            "eventType": "vehicle_added",
            "vehicleId": "video-north-1",
            "vehicleType": "car",
            "laneId": "north",
            "timestamp": 1000,
            "payload": {}
        },
        {
            "eventType": "rl_decision",
            "timestamp": 2000,
            "payload": {
                "snapshot": {
                    "lane_state": {
                        "north": {"count": 2, "hasAmbulance": False, "avgWaitTime": 5.0},
                        "south": {"count": 1, "hasAmbulance": False, "avgWaitTime": 2.0},
                        "east": {"count": 0, "hasAmbulance": False, "avgWaitTime": 0.0},
                        "west": {"count": 0, "hasAmbulance": False, "avgWaitTime": 0.0}
                    },
                    "active_lane": "north",
                    "duration": 12
                }
            }
        }
    ]
    resp = requests.post(f"{BASE_URL}/simulation/submit-log", json={
        "session_id": session_id,
        "events": events
    })
    print("Status:", resp.status_code)
    print("Response:", resp.json())
    assert resp.status_code == 200

def test_get_results(session_id):
    print("\nTesting /simulation/results/{id}...")
    resp = requests.get(f"{BASE_URL}/simulation/results/{session_id}")
    print("Status:", resp.status_code)
    print("Response keys:", resp.json().keys())
    assert resp.status_code == 200

def test_signal_decision():
    print("\nTesting /signal/decision...")
    payload = {
        "lane_counts": {"north": 5, "south": 2, "east": 1, "west": 1},
        "wait_times": {"north": 10.0, "south": 4.0, "east": 0.5, "west": 0.5},
        "ambulance": {"north": False, "south": False, "east": False, "west": False},
        "current_lane": "north",
        "elapsed_time": 5.0
    }
    resp = requests.post(f"{BASE_URL}/signal/decision", json=payload)
    print("Status:", resp.status_code)
    print("Response:", resp.json())
    assert resp.status_code == 200

def test_signal_next_decision():
    print("\nTesting /signal/next_decision...")
    payload = {
        "lane_counts": {"north": 2, "south": 5, "east": 1, "west": 1},
        "wait_times": {"north": 5.0, "south": 25.0, "east": 1.0, "west": 1.0},
        "ambulance": {"north": False, "south": False, "east": False, "west": False},
        "current_lane": "north",
        "elapsed_time": 10.0
    }
    resp = requests.post(f"{BASE_URL}/signal/next_decision", json=payload)
    print("Status:", resp.status_code)
    print("Response:", resp.json())
    assert resp.status_code == 200

def test_signal_explain():
    print("\nTesting /signal/explain...")
    payload = {
        "lane_counts": {"north": 2, "south": 5, "east": 1, "west": 1},
        "wait_times": {"north": 5.0, "south": 25.0, "east": 1.0, "west": 1.0},
        "ambulance": {"north": False, "south": False, "east": False, "west": False},
        "current_lane": "north",
        "elapsed_time": 10.0,
        "decision_made": 15.0
    }
    resp = requests.post(f"{BASE_URL}/signal/explain", json=payload)
    print("Status:", resp.status_code)
    print("Response:", resp.json())
    assert resp.status_code == 200

if __name__ == "__main__":
    try:
        session_id = test_simulation_start()
        test_submit_log(session_id)
        test_get_results(session_id)
        test_signal_decision()
        test_signal_next_decision()
        test_signal_explain()
        print("\n🎉 All backend REST API checks passed successfully!")
    except Exception as e:
        print("\n❌ Check failed:", e)
