export const mockInsurerDashboard = {
  total: 128,
  statusCounts: [
    { status: 'SOLICITADA', total: 24 },
    { status: 'AGENDADA', total: 18 },
    { status: 'REALIZADA', total: 52 },
    { status: 'APROBADA', total: 22 },
    { status: 'RECHAZADA', total: 12 },
  ],
  monthlyTrend: [
    { month: '2025-9', total: 18 },
    { month: '2025-10', total: 24 },
    { month: '2025-11', total: 20 },
    { month: '2025-12', total: 30 },
    { month: '2026-1', total: 36 },
  ],
  avgDurationDays: 4.2,
};

export const mockAlaraDashboard = {
  total: 342,
  statusCounts: [
    { status: 'SOLICITADA', total: 54 },
    { status: 'AGENDADA', total: 68 },
    { status: 'REALIZADA', total: 168 },
    { status: 'APROBADA', total: 34 },
    { status: 'RECHAZADA', total: 18 },
  ],
  monthlyTrend: [
    { month: '2025-9', total: 52 },
    { month: '2025-10', total: 63 },
    { month: '2025-11', total: 68 },
    { month: '2025-12', total: 78 },
    { month: '2026-1', total: 81 },
  ],
  investigators: [
    { investigator: 'Martha Rivera', total: 38 },
    { investigator: 'Luis Herrera', total: 42 },
    { investigator: 'Claudia Espinoza', total: 35 },
  ],
};

export const mockRequests = [
  {
    id: 1024,
    request_number: 'VIP-2026-001',
    responsible_name: 'Carlos Domínguez',
    status: 'AGENDADA',
    created_at: '2026-01-22',
    client_name: 'Paola Ríos',
    insurer: 'Aseguradora Horizonte',
  },
  {
    id: 1025,
    request_number: 'VIP-2026-002',
    responsible_name: 'Laura Méndez',
    status: 'SOLICITADA',
    created_at: '2026-01-23',
    client_name: 'Mario Vega',
    insurer: 'Aseguradora Horizonte',
  },
  {
    id: 1026,
    request_number: 'VIP-2026-003',
    responsible_name: 'Raúl Cordero',
    status: 'REALIZADA',
    created_at: '2026-01-24',
    client_name: 'Andrea Ponce',
    insurer: 'Seguros Andinos',
  },
];
