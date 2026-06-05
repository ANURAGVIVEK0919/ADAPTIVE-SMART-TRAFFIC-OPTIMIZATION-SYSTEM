import { useLocation, useNavigate } from 'react-router-dom';
import { useSimulationStore } from '../../state/simulationStore';
import { fetchSavedSessions } from '../../services/api';

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname || '';
  const sessionId = useSimulationStore(state => state.sessionId);

  const activeKey = path.startsWith('/dashboard')
    ? 'overview'
    : (path.startsWith('/upload') || path.startsWith('/loading') || path.startsWith('/results'))
      ? 'results'
      : 'simulation';

  const handleOverviewClick = async () => {
    if (sessionId) {
      navigate(`/dashboard/${sessionId}`);
      return;
    }
    // Fallback: load the latest session if available
    try {
      const data = await fetchSavedSessions();
      if (data && data.sessions && data.sessions.length > 0) {
        navigate(`/dashboard/${data.sessions[0].session_id}`);
      } else {
        navigate('/results');
      }
    } catch (err) {
      console.error('Error fetching latest session for overview:', err);
      navigate('/results');
    }
  };

  const handleSimulationClick = () => {
    navigate('/');
  };

  const handleResultsClick = () => {
    navigate('/results');
  };

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">CivicFlow</div>
      <nav className="sidebar-nav">
        <button
          type="button"
          onClick={handleOverviewClick}
          className={`nav-item ${activeKey === 'overview' ? 'nav-item-active' : ''}`}
          aria-current={activeKey === 'overview' ? 'page' : undefined}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={handleSimulationClick}
          className={`nav-item ${activeKey === 'simulation' ? 'nav-item-active' : ''}`}
          aria-current={activeKey === 'simulation' ? 'page' : undefined}
        >
          Simulation
        </button>
        <button
          type="button"
          onClick={handleResultsClick}
          className={`nav-item ${activeKey === 'results' ? 'nav-item-active' : ''}`}
          aria-current={activeKey === 'results' ? 'page' : undefined}
        >
          Results
        </button>
      </nav>
    </aside>
  );
}

