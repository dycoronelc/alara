/** Listados de validación BC/FT (referencia tipo pantalla UAF). */

export type UafListId =
  | 'onu_1988'
  | 'onu_1267'
  | 'onu_search'
  | 'uk'
  | 'canada'
  | 'ofac'
  | 'res_02_2018'
  | 'gafi';

export type UafListConfig = {
  id: UafListId;
  title: string;
  subtitle?: string;
  keywords: string[];
};

export const UAF_LIST_CONFIGS: UafListConfig[] = [
  {
    id: 'onu_1988',
    title: 'Listado ONU 1988',
    subtitle: 'Consejo de Seguridad de la ONU',
    keywords: ['1988', 'onu 1988', 'lista 1988', 'un 1988', 'taliban'],
  },
  {
    id: 'onu_1267',
    title: 'Listado ONU 1267',
    subtitle: 'Comité de sanciones Al-Qaida / ISIL',
    keywords: ['1267', 'onu 1267', 'lista 1267', 'un 1267', 'al-qaida', 'daesh'],
  },
  {
    id: 'onu_search',
    title: 'Buscador Lista ONU',
    subtitle: 'Consulta unificada listas ONU',
    keywords: ['buscador onu', 'lista onu', 'un search', 'onu consolidado', 'consolidated un'],
  },
  {
    id: 'uk',
    title: 'Listado Reino Unido',
    subtitle: 'HM Treasury / OFSI',
    keywords: ['reino unido', 'uk sanctions', 'united kingdom', 'ofsi', 'hm treasury', 'británico'],
  },
  {
    id: 'canada',
    title: 'Listado Canadá',
    subtitle: 'Sanciones financieras Canadá',
    keywords: ['canadá', 'canada', 'sema', 'canadian sanctions'],
  },
  {
    id: 'ofac',
    title: 'Listado OFAC',
    subtitle: 'EE.UU. — OFAC SDN',
    keywords: ['ofac', 'sdn', 'treasury us', 'estados unidos'],
  },
  {
    id: 'res_02_2018',
    title: 'Resolución 02-2018',
    subtitle: 'UAF Panamá',
    keywords: ['02-2018', '02/2018', 'resolución 02', 'resolucion 02', 'uaf panama'],
  },
  {
    id: 'gafi',
    title: 'Lista de Países en Riesgo de BC/FT del GAFI',
    subtitle: 'FATF / GAFI',
    keywords: ['gafi', 'fatf', 'bc/ft', 'riesgo de país', 'riesgo pais', 'jurisdicción', 'jurisdiccion'],
  },
];

export type InvestigationLike = {
  source_name?: string | null;
  source_type?: string | null;
  finding_summary?: string | null;
  risk_level?: string | null;
  is_adverse_record?: boolean | null;
  created_at?: string | null;
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Encuentra la investigación más reciente cuyo nombre de fuente coincide con el listado. */
export function findInvestigationForList(
  list: UafListConfig,
  investigations: InvestigationLike[],
): InvestigationLike | undefined {
  const sorted = [...investigations].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  for (const inv of sorted) {
    const hay = norm(`${inv.source_name ?? ''} ${inv.finding_summary ?? ''}`);
    if (list.keywords.some((k) => hay.includes(norm(k)))) {
      return inv;
    }
  }

  return undefined;
}

export type UafRowStatus = 'pending' | 'clear' | 'review' | 'hit';

export function deriveUafStatus(inv: InvestigationLike | undefined): {
  status: UafRowStatus;
  label: string;
} {
  if (!inv) {
    return { status: 'pending', label: 'Sin consulta' };
  }
  if (inv.is_adverse_record || inv.risk_level === 'ALTO') {
    return { status: 'hit', label: 'Coincidencia / alerta' };
  }
  if (inv.risk_level === 'MEDIO') {
    return { status: 'review', label: 'Revisión sugerida' };
  }
  const sum = norm(inv.finding_summary ?? '');
  if (sum.includes('coincidencia') || sum.includes('match') || sum.includes('posible')) {
    return { status: 'review', label: 'Revisión sugerida' };
  }
  return { status: 'clear', label: 'Sin coincidencias' };
}
