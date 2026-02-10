import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardInsurer from './pages/DashboardInsurer';
import DashboardAlara from './pages/DashboardAlara';
import RequestsPage from './pages/RequestsPage';
import CalendarPage from './pages/CalendarPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import RequestDetailPage from './pages/RequestDetailPage';
import NewRequestPage from './pages/NewRequestPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/portal/aseguradora"
        element={
          <Layout
            portal="aseguradora"
            title="Portal Aseguradoras"
            navItems={[
              { label: 'Dashboard', to: '/portal/aseguradora/dashboard' },
              { label: 'Solicitudes', to: '/portal/aseguradora/solicitudes' },
              { label: 'Calendario', to: '/portal/aseguradora/calendario' },
            ]}
            primaryAction={{ label: 'Nueva solicitud', to: '/portal/aseguradora/solicitudes/nueva' }}
          />
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardInsurer />} />
        <Route path="solicitudes" element={<RequestsPage portal="aseguradora" />} />
        <Route path="solicitudes/nueva" element={<NewRequestPage />} />
        <Route path="solicitudes/:id" element={<RequestDetailPage portal="aseguradora" />} />
        <Route path="calendario" element={<CalendarPage portal="aseguradora" />} />
      </Route>

      <Route
        path="/portal/alara"
        element={
          <Layout
            portal="alara"
            title="Portal ALARA INSP"
            navItems={[
              { label: 'Dashboard', to: '/portal/alara/dashboard' },
              { label: 'Bandeja', to: '/portal/alara/solicitudes' },
              { label: 'Agenda', to: '/portal/alara/agenda' },
              { label: 'Administración', to: '/portal/alara/administracion' },
            ]}
          />
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardAlara />} />
        <Route path="solicitudes" element={<RequestsPage portal="alara" />} />
        <Route path="solicitudes/:id" element={<RequestDetailPage portal="alara" />} />
        <Route path="agenda" element={<CalendarPage portal="alara" />} />
        <Route path="administracion" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
