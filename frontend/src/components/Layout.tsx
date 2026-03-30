import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useInactivityLogout } from '../hooks/useInactivityLogout';
import InactivityModal from './InactivityModal';

type NavItem = { label: string; to: string };

type LayoutProps = {
  portal: 'aseguradora' | 'alara';
  title: string;
  navItems: NavItem[];
  primaryAction?: { label: string; to: string };
};

const Layout = ({ portal, title, navItems, primaryAction }: LayoutProps) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  const handleInactivity = useCallback(() => {
    setShowInactivityModal(true);
  }, []);

  const handleCloseInactivityAndLogout = useCallback(() => {
    setShowInactivityModal(false);
    localStorage.removeItem('alara-token');
    localStorage.removeItem('alara-role');
    localStorage.removeItem('alara-insurer-id');
    localStorage.removeItem('alara-user-id');
    localStorage.removeItem('alara-user');
    navigate('/', { replace: true });
  }, [navigate]);

  useInactivityLogout(handleInactivity);

  const mockNotifications = [
    { id: 1, title: 'Nueva solicitud VIP recibida', time: 'Hace 5 min' },
    { id: 2, title: 'Reporte generado para VIP-2026-003', time: 'Hace 20 min' },
  ];

  return (
    <div className="app-shell">
      {showInactivityModal && (
        <InactivityModal onClose={handleCloseInactivityAndLogout} />
      )}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo-width.png" alt="ALARA INSP" />
          <span>{title}</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="sidebar-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>Plataforma de Inspecciones VIP · ALARA INSP, S.A.</p>
          </div>
          <div className="topbar-actions">
            {primaryAction && (
              <button className="primary-button" onClick={() => navigate(primaryAction.to)}>
                {primaryAction.label}
              </button>
            )}
            <div className="icon-actions">
              <button
                className={mockNotifications.length ? 'icon-button has-alert' : 'icon-button'}
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowUserMenu(false);
                }}
                aria-label="Notificaciones"
              >
                🔔
              </button>
              <button
                className="icon-button"
                onClick={() => {
                  setShowUserMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                aria-label="Usuario"
              >
                👤
              </button>
              {showNotifications && (
                <div className="dropdown">
                  <h4>Notificaciones</h4>
                  {mockNotifications.length ? (
                    <ul>
                      {mockNotifications.map((item) => (
                        <li key={item.id}>
                          <strong>{item.title}</strong>
                          <span>{item.time}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay notificaciones nuevas.</p>
                  )}
                </div>
              )}
              {showUserMenu && (
                <div className="dropdown">
                  <h4>Usuario activo</h4>
                  <p>{portal === 'aseguradora' ? 'Usuario Aseguradora' : 'Usuario ALARA'}</p>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      localStorage.removeItem('alara-token');
                      localStorage.removeItem('alara-role');
                      localStorage.removeItem('alara-insurer-id');
                      localStorage.removeItem('alara-user-id');
                      localStorage.removeItem('alara-user');
                      navigate('/', { replace: true });
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default Layout;
