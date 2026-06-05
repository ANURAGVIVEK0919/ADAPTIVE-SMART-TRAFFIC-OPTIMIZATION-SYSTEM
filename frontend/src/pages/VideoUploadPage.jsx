import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo, startVideoJob, getJobStatus } from '../services/api';
import { useSimulationStore } from '../state/simulationStore';
import AppSidebar from '../components/layout/AppSidebar';
import Button from '../components/ui/Button';
import Section from '../components/ui/Section';
import './dashboard.css';

export default function VideoUploadPage() {
  const setTimer = useSimulationStore((state) => state.setTimer);
  const resetStore = useSimulationStore((state) => state.resetStore);
  // const setSessionIdStore = useSimulationStore((state) => state.setSessionId); // removed duplicate
const setSessionId = useSimulationStore((state) => state.setSessionId);
  const setVideoSchedule = useSimulationStore((state) => state.setVideoSchedule);
  const setMode = useSimulationStore((state) => state.setMode);
  const updateVehiclePositions = useSimulationStore((state) => state.updateVehiclePositions);
  const setTotalVehiclesCrossed = useSimulationStore((state) => state.setTotalVehiclesCrossed);
  const setSignalPhases = useSimulationStore((state) => state.setSignalPhases);
  const logEvent = useSimulationStore((state) => state.logEvent);
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [localSessionId, setLocalSessionId] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [jobStarted, setJobStarted] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  // Prevent automatic store reset when this page unmounts after a video run.
  // The store already holds the correct mode and sessionId.
  useEffect(() => () => {}, []);
function emptyLanes() {
    return { north: [], east: [], south: [], west: [] };
  }

  function normalizeSimulationLanes(simulationState) {
    const lanes = simulationState?.lanes || {};
    const normalized = emptyLanes();
    const now = Date.now();

    for (const lane of ['north', 'east', 'south', 'west']) {
      const source = Array.isArray(lanes[lane]) ? lanes[lane] : [];
      normalized[lane] = source.map((vehicle, index) => {
        const vehicleId = vehicle?.vehicleId || vehicle?.id || `video-${lane}-${index + 1}`;
        const vehicleType = vehicle?.vehicleType || 'car';
        return {
          vehicleId,
          vehicleType,
          laneId: lane,
          position: Number(vehicle?.position || 0),
          spawnedAt: Number(vehicle?.spawnedAt || now)
        };
      });
    }

    return normalized;
  }

  function logSeedEvents(seedLanes) {
    const ts = Date.now();
    for (const lane of ['north', 'east', 'south', 'west']) {
      const vehicles = Array.isArray(seedLanes[lane]) ? seedLanes[lane] : [];
      for (const vehicle of vehicles) {
        logEvent({
          eventType: 'vehicle_added',
          vehicleId: vehicle.vehicleId,
          vehicleType: vehicle.vehicleType,
          laneId: lane,
          timestamp: ts,
          payload: { source: 'video_state_extractor' }
        });
      }
    }
  }

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadVideo(selectedFile);
      const resolvedSessionId = result.session_id || result.sessionId || null;
      if (!resolvedSessionId) {
        setError('Session ID missing in upload response.');
        setUploading(false);
        return;
      }
      setLocalSessionId(resolvedSessionId);
      setVideoPath(result.video_path);
      setMode('video');
    } catch (err) {
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const handleStartJob = async () => {
    try {
      await startVideoJob(localSessionId, videoPath);
      setJobStarted(true);
      intervalRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(localSessionId);
          setJobStatus(status);
          setProgress(status.progress || 0);
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(intervalRef.current);
          }
        } catch (err) {
          clearInterval(intervalRef.current);
          setError('Failed to get job status.');
        }
      }, 2000);
    } catch (err) {
      setError('Failed to start processing.');
    }
  };

  return (
    <div className="dashboard">
      <AppSidebar />

      <main className="content">
        <header className="content-header">
          <h1>Video Pipeline</h1>
          <p>Upload a video, run processing, and open a comparison dashboard.</p>
        </header>

        <Section title="Upload Video" className="upload-panel">

          <div className="form-row">
            <label className="input-label">Select Video File</label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="input-control"
            />
          </div>

          {!localSessionId && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          )}

          {localSessionId && !jobStarted && (
            <div className="status-stack">
              <p className="muted-text">Upload successful. Session: {localSessionId.slice(0, 8)}...</p>
              <Button onClick={handleStartJob}>Start Processing</Button>
            </div>
          )}

          {jobStarted && jobStatus && (
            <div className="status-stack">
              <p className="muted-text">Status: <strong>{jobStatus.status?.toUpperCase()}</strong></p>

              {jobStatus.status === 'running' && (
                <div className="live-preview-wrapper" style={{
                  display: 'flex',
                  gap: '16px',
                  margin: '20px 0',
                  alignItems: 'stretch',
                  flexWrap: 'wrap'
                }}>
                  {/* Clean Video Feed */}
                  <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
                    <h4 style={{
                      marginBottom: '10px',
                      fontSize: '14px',
                      color: 'var(--muted)',
                      textAlign: 'center'
                    }}>🎬 Live Processing</h4>
                    <img 
                      src="http://localhost:8000/video_feed" 
                      alt="Processing Live Feed" 
                      style={{ 
                        width: '100%', 
                        borderRadius: '12px', 
                        border: '2px solid var(--primary)', 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        backgroundColor: '#000',
                        display: 'block'
                      }} 
                    />
                  </div>

                  {/* Live Metrics Panel */}
                  <div style={{
                    flex: '0 0 200px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      color: 'var(--muted)',
                      textAlign: 'center',
                      marginBottom: '4px'
                    }}>📊 Live Metrics</h4>

                    {/* Active Lane */}
                    {jobStatus.active_lane && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Active Signal</div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#22c55e',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>🟢 {jobStatus.active_lane}</div>
                      </div>
                    )}

                    {/* Vehicle Crossings Per Direction */}
                    {['north', 'south', 'east', 'west'].map((dir) => {
                      const crossings = jobStatus.live_crossings || {};
                      const laneCounts = jobStatus.live_lane_counts || {};
                      const crossed = crossings[dir] || 0;
                      const waiting = laneCounts[dir] || 0;
                      const isActive = jobStatus.active_lane === dir;
                      const dirIcons = { north: '⬆️', south: '⬇️', east: '➡️', west: '⬅️' };
                      
                      return (
                        <div key={dir} style={{
                          background: isActive 
                            ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))'
                            : 'var(--card-bg, rgba(255,255,255,0.04))',
                          border: isActive 
                            ? '1px solid rgba(34,197,94,0.4)' 
                            : '1px solid var(--border, rgba(255,255,255,0.08))',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px'
                          }}>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              color: isActive ? '#22c55e' : 'var(--text, #e2e8f0)'
                            }}>
                              {dirIcons[dir]} {dir}
                            </span>
                            {isActive && <span style={{ fontSize: '10px', color: '#22c55e' }}>● LIVE</span>}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: 'var(--muted)' }}>
                              Passed: <strong style={{ color: '#60a5fa' }}>{crossed}</strong>
                            </span>
                            <span style={{ color: 'var(--muted)' }}>
                              Queue: <strong style={{ color: '#f59e0b' }}>{waiting}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total Crossings */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                      border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Total Crossed</div>
                      <div style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#818cf8'
                      }}>
                        {Object.values(jobStatus.live_crossings || {}).reduce((a, b) => a + b, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <progress className="progress-bar" value={progress} max={100} />
              <p className="muted-text">{progress}% complete</p>

              {jobStatus.status === 'completed' && (
                <Button
                  onClick={() => {
                    const resolvedSessionId = jobStatus.session_id || jobStatus.sessionId || null;
                    if (!resolvedSessionId) {
                      setError('Session ID missing after preprocessing. Cannot start simulation.');
                      return;
                    }

                    const videoDuration = Number(jobStatus.video_duration || 180);
                    const seededLanes = normalizeSimulationLanes(jobStatus.simulation_state);

                    resetStore();
                    setTimer(videoDuration);
                    setSessionId(resolvedSessionId);
                    setMode('video');
                    setSignalPhases([]);
                    setTotalVehiclesCrossed(0);
                    updateVehiclePositions(seededLanes);
                    logSeedEvents(seededLanes);
                    setVideoSchedule(jobStatus.video_events || []);
                    useSimulationStore.getState().setVideoDuration(videoDuration);
                    
                    // Direct redirect to Dashboard
                    navigate(`/dashboard/${resolvedSessionId}`);
                  }}
                >
                  View Results Dashboard
                </Button>
              )}

              {jobStatus.status === 'failed' && (
                <p className="alert alert-high">{jobStatus.error_message || 'Processing failed'}</p>
              )}
            </div>
          )}

          {error && <p className="alert alert-high">{error}</p>}

          <Button variant="secondary" onClick={() => navigate('/')}>Back To Simulator</Button>
        </Section>
      </main>
    </div>
  );
}
