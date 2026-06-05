import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSavedSessions } from '../services/api';
import { useSimulationStore } from '../state/simulationStore';
import AppSidebar from '../components/layout/AppSidebar';
import Card from '../components/ui/Card';
import Section from '../components/ui/Section';
import Button from '../components/ui/Button';
import './dashboard.css';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();
  const resetStore = useSimulationStore(state => state.resetStore);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        const data = await fetchSavedSessions();
        if (data && data.sessions) {
          setSessions(data.sessions);
        } else {
          setSessions([]);
        }
      } catch (err) {
        console.error('Error fetching saved sessions:', err);
        setError('Failed to load saved sessions. Please make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectSession = (sessionId) => {
    navigate(`/dashboard/${sessionId}`);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown Date';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) + ' ' + date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const filteredSessions = sessions.filter(session => {
    const term = searchTerm.toLowerCase();
    const sessionIdMatches = session.session_id.toLowerCase().includes(term);
    const dateMatches = formatDate(session.created_at).toLowerCase().includes(term);
    return sessionIdMatches || dateMatches;
  });

  return (
    <div className="dashboard">
      <AppSidebar />

      <main className="content">
        <header className="content-header">
          <h1>Saved Analysis & History</h1>
          <p>Browse and compare previously completed traffic simulations and video analytics results.</p>
        </header>

        {/* Action Callout Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>Analyze New Video</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
              Upload another traffic video feed to test and compare adaptive AI algorithms.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" onClick={() => {
              resetStore();
              navigate('/');
            }}>
              Interactive Simulator
            </Button>
            <Button onClick={() => {
              resetStore();
              navigate('/upload');
            }}>
              📷 Upload Video
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Search by Session ID or Date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
              transition: 'var(--transition)'
            }}
          />
        </div>

        {loading ? (
          <section className="sessions-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map((idx) => (
              <Card key={`loading-card-${idx}`} className="skeleton-card" style={{ height: '180px' }}>
                <div className="skeleton-line skeleton-line-short" style={{ marginBottom: '12px' }} />
                <div className="skeleton-block" style={{ height: '80px' }} />
              </Card>
            ))}
          </section>
        ) : error ? (
          <div className="status-banner status-warning" style={{ padding: '16px', borderRadius: 'var(--radius)' }}>
            {error}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px var(--space-lg)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            marginTop: '20px'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📂</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No Saved Sessions Found</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px 0', fontSize: '14px' }}>
              {searchTerm ? 'No sessions match your search criteria.' : 'You haven\'t processed any simulation or video sessions yet.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => navigate('/upload')}>
                Upload Your First Video
              </Button>
            )}
          </div>
        ) : (
          <section className="sessions-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredSessions.map((session) => {
              // Calculate improvements
              const dynWait = session.dynamic?.avg_wait_time ?? 0;
              const statWait = session.static?.avg_wait_time ?? 0;
              const waitImprovement = statWait > 0 ? ((statWait - dynWait) / statWait) * 100 : 0;

              const dynCO2 = session.dynamic?.co2_estimate ?? 0;
              const statCO2 = session.static?.co2_estimate ?? 0;
              const co2Improvement = statCO2 > 0 ? ((statCO2 - dynCO2) / statCO2) * 100 : 0;

              return (
                <Card
                  key={session.session_id}
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    border: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => handleSelectSession(session.session_id)}
                >
                  {/* Session Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                    borderBottom: '1px solid var(--surface)',
                    paddingBottom: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em' }}>
                          SESSION ID
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold' }}>
                            {session.session_id.substring(0, 18)}...
                          </span>
                          <button
                            onClick={(e) => handleCopyId(e, session.session_id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--muted)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: 'var(--surface)'
                            }}
                            title="Copy full ID"
                          >
                            {copiedId === session.session_id ? '✅ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                        📅 Created: {formatDate(session.created_at)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}>
                        ⏱️ {session.timer_duration}s
                      </span>
                      <Button size="small" onClick={() => handleSelectSession(session.session_id)}>
                        View Dashboard →
                      </Button>
                    </div>
                  </div>

                  {/* Comparative Metrics Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px'
                  }}>
                    {/* Wait Time Metric */}
                    <div style={{
                      backgroundColor: 'var(--surface)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '6px' }}>
                        AVERAGE WAIT TIME
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                            {dynWait.toFixed(1)}s
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal', marginLeft: '4px' }}>
                              (AI)
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            Static: {statWait.toFixed(1)}s
                          </div>
                        </div>
                        {waitImprovement > 0 && (
                          <span style={{
                            fontSize: '11px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {waitImprovement.toFixed(0)}% better
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CO2 Emissions */}
                    <div style={{
                      backgroundColor: 'var(--surface)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '6px' }}>
                        CO2 EMISSIONS ESTIMATE
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                            {dynCO2.toFixed(0)}g
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal', marginLeft: '4px' }}>
                              (AI)
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            Static: {statCO2.toFixed(0)}g
                          </div>
                        </div>
                        {co2Improvement > 0 && (
                          <span style={{
                            fontSize: '11px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {co2Improvement.toFixed(0)}% cut
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vehicles Crossed */}
                    <div style={{
                      backgroundColor: 'var(--surface)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '6px' }}>
                        VEHICLES PASSED
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                            {session.dynamic?.total_vehicles_crossed ?? 0}
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal', marginLeft: '4px' }}>
                              (AI)
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            Static: {session.static?.total_vehicles_crossed ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ambulance Wait */}
                    <div style={{
                      backgroundColor: 'var(--surface)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '6px' }}>
                        AMBULANCE AVG WAIT
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: (session.dynamic?.ambulance_avg_wait_time || 0) > 0 ? '#ef4444' : 'var(--text)'
                          }}>
                            {(session.dynamic?.ambulance_avg_wait_time ?? 0).toFixed(1)}s
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal', marginLeft: '4px' }}>
                              (AI)
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            Static: {(session.static?.ambulance_avg_wait_time ?? 0).toFixed(1)}s
                          </div>
                        </div>
                        {(session.static?.ambulance_avg_wait_time ?? 0) > (session.dynamic?.ambulance_avg_wait_time ?? 0) && (
                          <span style={{
                            fontSize: '11px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            Siren Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
