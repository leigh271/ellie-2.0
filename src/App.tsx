import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Orb } from './components/UI';
import { useDemoStore } from './state/DemoStore';
import { getMessages } from './patientApp/i18n';

const PatientAppLayout = lazy(() => import('./patientApp/PatientAppLayout'));
const PatientAppHome = lazy(() => import('./patientApp/screens/Home'));
const DiagnosisScreen = lazy(() => import('./patientApp/screens/Diagnosis'));
const PatientHelpScreen = lazy(() => import('./patientApp/screens/Help'));
const PatientAskScreen = lazy(() => import('./patientApp/screens/Ask'));
const PatientUpdatesScreen = lazy(() => import('./patientApp/screens/Updates'));
const CommandCenter = lazy(() => import('./screens/OverviewPatients').then((module) => ({ default: module.CommandCenter })));
const PatientList = lazy(() => import('./screens/OverviewPatients').then((module) => ({ default: module.PatientList })));
const Patient360 = lazy(() => import('./screens/OverviewPatients').then((module) => ({ default: module.Patient360 })));
const PatientView = lazy(() => import('./screens/CarePages').then((module) => ({ default: module.PatientView })));
const TasksPage = lazy(() => import('./screens/CarePages').then((module) => ({ default: module.TasksPage })));
const ResourcesPage = lazy(() => import('./screens/CarePages').then((module) => ({ default: module.ResourcesPage })));
const ActivityPage = lazy(() => import('./screens/CarePages').then((module) => ({ default: module.ActivityPage })));
const C3Page = lazy(() => import('./screens/Modules').then((module) => ({ default: module.C3Page })));
const C4Page = lazy(() => import('./screens/Modules').then((module) => ({ default: module.C4Page })));
const C5Page = lazy(() => import('./screens/Modules').then((module) => ({ default: module.C5Page })));

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
  const appRoute = location.pathname === '/app' || location.pathname.startsWith('/app/');
  const appMessages = getMessages(state.patientLanguage[state.patientId] ?? 'en');
  const roleChanged = (role: 'provider' | 'patient' | 'patient-app') => {
    if (role === 'patient-app') {
      setRole('patient');
      navigate('/app');
      return;
    }
    setRole(role);
    navigate(role === 'patient' ? '/patient' : '/');
  };

  if (appRoute) {
    if (state.role !== 'patient') return <div className="patient-app-root"><section className="patient-app-gate">
      <Orb /><h1>{appMessages.patientApp}</h1><p>{appMessages.homeSubtitle}</p>
      <button className="patient-app-primary" type="button" onClick={() => setRole('patient')}>{appMessages.openAsPatient}</button>
    </section></div>;
    return <Suspense fallback={<div className="page-loading" aria-live="polite">Loading Ellie…</div>}><PatientAppLayout><Routes>
      <Route path="/app" element={<PatientAppHome />} />
      <Route path="/app/diagnosis" element={<DiagnosisScreen />} />
      <Route path="/app/help" element={<PatientHelpScreen />} />
      <Route path="/app/ask" element={<PatientAskScreen />} />
      <Route path="/app/updates" element={<PatientUpdatesScreen />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes></PatientAppLayout></Suspense>;
  }

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
            <select id="role-switch" className="switch" value={state.role === 'patient' && location.pathname.startsWith('/app') ? 'patient-app' : state.role} onChange={(event) => roleChanged(event.target.value as 'provider' | 'patient' | 'patient-app')} aria-label="Choose dashboard role">
              <option value="provider">Provider</option>
              <option value="patient">Patient · Maria</option>
              <option value="patient-app">{appMessages.patientApp}</option>
            </select>
          </div>
        </header>
        <Suspense fallback={<div className="page-loading" aria-live="polite">Loading care workspace…</div>}><Routes>
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
        </Routes></Suspense>
        <footer className="footer">Fictional, synthetic demo data · Not clinically validated · Not HIPAA-compliant · No real messaging or EHR connection · AI suggestions require human review.</footer>
      </main>
    </div>
  );
}

function PillDemo() {
  return <span className="demo-label"><span className="demo-dot" /> Synthetic demo</span>;
}
