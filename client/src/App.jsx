import { NavLink, Route, Routes } from 'react-router-dom';
import { DataProvider, useData } from './DataContext';
import Dashboard from './pages/Dashboard';
import Teachers from './pages/Teachers';
import Courses from './pages/Courses';
import Rooms from './pages/Rooms';
import Sections from './pages/Sections';
import Programs from './pages/Programs';
import Sessions from './pages/Sessions';
import Grid from './pages/Grid';
import Allocations from './pages/Allocations';
import Timetable from './pages/Timetable';
import Reference from './pages/Reference';

const NAV = [
  ['/', 'Dashboard'],
  ['/timetable', 'Timetable'],
  ['/allocations', 'Allocations'],
  ['/teachers', 'Teachers'],
  ['/courses', 'Courses'],
  ['/rooms', 'Rooms'],
  ['/sections', 'Sections'],
  ['/programs', 'Programs'],
  ['/sessions', 'Sessions'],
  ['/grid', 'Grid'],
  ['/reference', 'Reference'],
];

function Shell() {
  const { error, loading } = useData();
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">Timetable Admin</div>
        {NAV.map(([path, label]) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="content">
        {loading && <div className="banner">Loading...</div>}
        {error && <div className="banner banner-error">API error: {error}</div>}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/allocations" element={<Allocations />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/sections" element={<Sections />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/grid" element={<Grid />} />
          <Route path="/reference" element={<Reference />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
