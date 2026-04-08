import Layout from './Layout';

type NavItem = { label: string; to: string };

function buildAlaraNavItems(): NavItem[] {
  const base: NavItem[] = [
    { label: 'Dashboard', to: '/portal/alara/dashboard' },
    { label: 'Bandeja', to: '/portal/alara/solicitudes' },
    { label: 'Agenda', to: '/portal/alara/agenda' },
  ];
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('alara-role') === 'ADMIN';
  const adminOnly: NavItem[] = isAdmin
    ? [
        { label: 'Roles', to: '/portal/alara/roles' },
        { label: 'Usuarios', to: '/portal/alara/usuarios' },
      ]
    : [];
  return [...base, ...adminOnly];
}

/** Portal ALARA: enlaces Roles y Usuarios solo para rol ADMIN (localStorage tras login). */
const AlaraPortalLayout = () => (
  <Layout portal="alara" title="Portal ALARA INSP" navItems={buildAlaraNavItems()} />
);

export default AlaraPortalLayout;
