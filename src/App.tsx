import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Orb } from './components/UI';
import { useDemoStore } from './state/DemoStore';
import {
  ActivityPage, C3Page, C4Page, C5Page, CommandCenter, Patient360, PatientList, PatientView, ResourcesPage, TasksPage,
} from './screens/Screens';

const navigation = [
  { to: '/', title: 'Command center', icon: '◈' },
  { to: '/patients', title: 'Patient 360', icon: '♡' },
  { to: '/modules/c3', title: 'Rough Patch Radar', icon: '⌁' },
  { to: '/modules/c4', title: 'Glucose Guide', icon: '◉' },
  { to: '/modules/c5', title: "Coach's Co-pilot", icon: '✳' },
  { to: '/tasks', title: 'Care coordination', icon: '☑' },
  { to: '/resources', title: 'Resources', icon: '↗' },
  { to: '/activity', title: 'Activity & reports', icon: '▤' },
];

function ProviderGate({ children }: { children: ReactNode }) {
  const { state } = useDemoStore();
  return state.role === 'provider' ? <>{children}</> : <Navigate to="/patient" replace />;
}

function PatientGate() {
  const { state } = useDemoStore();
  return state.role === 'patient' ? <PatientView /> : <Navigate to="/" replace />;
}

export default function App() {
  const { state, setRole, reset } = useDemoStore();
  const navigate = useNavigate();
  const location = useLocation();
  const current = navigation.find((item) => item.to === location.pathname);
  const patientMode = state.role === 'patient';
  const roleChanged = (role: 'provider' | 'patient') => {
    setRole(role);
    navigate(role === 'patient' ? '/patient' : '/');
  };

  return (
    <div className={`shell ${patientMode ? 'patient-shell' : ''}`}>
      {!patientMode && (
        <aside className="sidebar">
          <NavLink className="brand" to="/" aria-label="Ellie command center"><Orb /><span>ellie<span className="brand-dot">.</span></span></NavLink>
          <nav className="nav" aria-label="Provider navigation">
            {navigation.map((item) => <NavLink end={item.to === '/'} key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span aria-hidden="true">{item.icon}</span>{item.title}</NavLink>)}
          </nav>
          <div className="sidebar-note"><b>✦ Ellie AI</b><p>Compassionate, human-led cancer survivorship navigation.</p><span className="tiny">Fictional demo workspace</span></div>
          <button className="reset-button" onClick={() => { if (window.confirm('Reset all Ellie demo data in this browser?')) { reset(); navigate('/'); } }}>↻ Reset demo data</button>
        </aside>
      )}
      <main className="main">
        <header className="top">
          <div className="crumb">{patientMode ? 'My Ellie / Wellness journey' : `Care workspace / ${current?.title ?? 'Patient 360'}`}</div>
          <div className="topright">
            <PillDemo />
            <label htmlFor="role-switch" className="tiny muted">Viewing as</label>
            <select id="role-switch" className="switch" value={state.role} onChange={(event) => roleChanged(event.target.value as 'provider' | 'patient')} aria-label="Choose dashboard role">
              <option value="provider">Provider</option>
              <option value="patient">Patient · Maria</option>
            </select>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<ProviderGate><CommandCenter /></ProviderGate>} />
          <Route path="/patients" element={<ProviderGate><PatientList /></ProviderGate>} />
          <Route path="/patients/:id" element={<ProviderGate><Patient360 /></ProviderGate>} />
          <Route path="/modules/c3" element={<ProviderGate><C3Page /></ProviderGate>} />
          <Route path="/modules/c4" element={<ProviderGate><C4Page /></ProviderGate>} />
          <Route path="/modules/c5" element={<ProviderGate><C5Page /></ProviderGate>} />
          <Route path="/tasks" element={<ProviderGate><TasksPage /></ProviderGate>} />
          <Route path="/resources" element={<ProviderGate><ResourcesPage /></ProviderGate>} />
          <Route path="/activity" element={<ProviderGate><ActivityPage /></ProviderGate>} />
          <Route path="/patient" element={<PatientGate />} />
          <Route path="*" element={<Navigate to={patientMode ? '/patient' : '/'} replace />} />
        </Routes>
        <footer className="footer">Fictional, synthetic demo data · Not clinically validated · Not HIPAA-compliant · No real messaging or EHR connection · AI suggestions require human review.</footer>
      </main>
    </div>
  );
}

function PillDemo() {
  return <span className="demo-label"><span className="demo-dot" /> Synthetic demo</span>;
}
