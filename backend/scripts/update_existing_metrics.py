import sqlite3
import json
import os
import sys

# Add traffic-sim to system path to import backend modules
sys.path.append(r"d:\Traffic-Management-main\Traffic-Management-main\traffic-sim")

from backend.core.services.static_replay_service import compute_static_metrics, compute_dynamic_metrics
from backend.core.services.results_service import get_events_for_session

db_path = r"d:\Traffic-Management-main\Traffic-Management-main\traffic-sim\traffic_sim.db"

def main():
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all distinct sessions that have event logs
    cursor.execute("SELECT DISTINCT session_id FROM simulation_event")
    sessions = [row[0] for row in cursor.fetchall()]
    
    print(f"Found {len(sessions)} sessions to update.")

    for session_id in sessions:
        if not session_id:
            continue
            
        print(f"\nProcessing Session: {session_id}")
        
        # Get timer duration
        cursor.execute("SELECT timer_duration FROM simulation_session WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        timer_duration = row[0] if row else None
        
        events = get_events_for_session(session_id)
        if not events:
            print(f"  ⚠️ No events found for session {session_id}, skipping.")
            continue
            
        if not timer_duration:
            ts = [float(e.get('timestamp', 0)) for e in events if e.get('timestamp')]
            timer_duration = (max(ts) - min(ts)) / 1000.0 if ts else 180.0
            
        print(f"  Duration: {timer_duration}s, Events: {len(events)}")
        
        # Re-compute metrics
        dynamic_metrics = compute_dynamic_metrics(events, timer_duration)
        static_metrics = compute_static_metrics(events, timer_duration)
        
        print(f"  Dynamic: wait={dynamic_metrics.get('avg_wait_time'):.2f}s, crossed={dynamic_metrics.get('total_vehicles_crossed')}, ambulance_wait={dynamic_metrics.get('ambulance_avg_wait_time'):.2f}s")
        print(f"  Static:  wait={static_metrics.get('avg_wait_time'):.2f}s, crossed={static_metrics.get('total_vehicles_crossed')}, ambulance_wait={static_metrics.get('ambulance_avg_wait_time'):.2f}s")
        
        # Update dynamic result
        cursor.execute("""
            UPDATE simulation_result 
            SET avg_wait_time = ?, total_vehicles_crossed = ?, co2_estimate = ?, 
                avg_green_utilization = ?, ambulance_avg_wait_time = ?
            WHERE session_id = ? AND system_type = 'dynamic'
        """, (
            dynamic_metrics.get('avg_wait_time'),
            dynamic_metrics.get('total_vehicles_crossed'),
            dynamic_metrics.get('co2_estimate'),
            dynamic_metrics.get('avg_green_utilization'),
            dynamic_metrics.get('ambulance_avg_wait_time'),
            session_id
        ))
        
        # Update static result
        cursor.execute("""
            UPDATE simulation_result 
            SET avg_wait_time = ?, total_vehicles_crossed = ?, co2_estimate = ?, 
                avg_green_utilization = ?, ambulance_avg_wait_time = ?
            WHERE session_id = ? AND system_type = 'static'
        """, (
            static_metrics.get('avg_wait_time'),
            static_metrics.get('total_vehicles_crossed'),
            static_metrics.get('co2_estimate'),
            static_metrics.get('avg_green_utilization'),
            static_metrics.get('ambulance_avg_wait_time'),
            session_id
        ))

    conn.commit()
    conn.close()
    print("\n[SUCCESS] Database update complete!")

if __name__ == "__main__":
    main()
