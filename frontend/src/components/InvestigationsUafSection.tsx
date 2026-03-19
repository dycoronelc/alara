import type { ReactNode } from 'react';
import {
  UAF_LIST_CONFIGS,
  deriveUafStatus,
  findInvestigationForList,
  type InvestigationLike,
} from '../utils/uafListings';

type ClientSlice = {
  id_type?: string;
  id_number?: string;
  first_name?: string;
  last_name?: string;
};

type Props = {
  client?: ClientSlice | null;
  investigations: InvestigationLike[];
  searchMode: 'cedula' | 'nombre' | 'ambos';
  onSearchModeChange: (mode: 'cedula' | 'nombre' | 'ambos') => void;
  children?: ReactNode;
};

const fullName = (c?: ClientSlice | null) =>
  [c?.first_name, c?.last_name].filter(Boolean).join(' ').trim() || '—';

const docLabel = (c?: ClientSlice | null) => {
  const t = c?.id_type?.trim();
  const n = c?.id_number?.trim();
  if (!n) return '—';
  return t ? `${t} ${n}` : n;
};

export default function InvestigationsUafSection({
  client,
  investigations,
  searchMode,
  onSearchModeChange,
  children,
}: Props) {
  const criteria =
    searchMode === 'cedula'
      ? docLabel(client)
      : searchMode === 'nombre'
        ? fullName(client)
        : `${docLabel(client)} · ${fullName(client)}`;

  return (
    <div className="uaf-validation">
      <header className="uaf-validation__hero">
        <div>
          <h3 className="uaf-validation__title">Validación listas restrictivas</h3>
          <p className="uaf-validation__lead">
            Resultados de la consulta según los criterios seleccionados. Los listados se completan con las
            investigaciones registradas para esta solicitud (p. ej. respuesta de n8n).
          </p>
        </div>
      </header>

      <section className="uaf-validation__query-card" aria-label="Criterios de búsqueda">
        <div className="uaf-validation__query-row">
          <span className="uaf-validation__query-label">Criterio activo</span>
          <div className="uaf-validation__toggle-group" role="group" aria-label="Modo de búsqueda">
            <button
              type="button"
              className={searchMode === 'cedula' ? 'uaf-toggle is-active' : 'uaf-toggle'}
              onClick={() => onSearchModeChange('cedula')}
            >
              Cédula / documento
            </button>
            <button
              type="button"
              className={searchMode === 'nombre' ? 'uaf-toggle is-active' : 'uaf-toggle'}
              onClick={() => onSearchModeChange('nombre')}
            >
              Nombre del cliente
            </button>
            <button
              type="button"
              className={searchMode === 'ambos' ? 'uaf-toggle is-active' : 'uaf-toggle'}
              onClick={() => onSearchModeChange('ambos')}
            >
              Ambos
            </button>
          </div>
        </div>
        <div className="uaf-validation__criteria">
          <div>
            <small>Documento</small>
            <strong>{docLabel(client)}</strong>
          </div>
          <div>
            <small>Nombre</small>
            <strong>{fullName(client)}</strong>
          </div>
          <div className="uaf-validation__criteria-highlight">
            <small>Mostrando resultados para</small>
            <strong>{criteria}</strong>
          </div>
        </div>
      </section>

      {children}

      <div className="uaf-validation__grid">
        {UAF_LIST_CONFIGS.map((list) => {
          const inv = findInvestigationForList(list, investigations);
          const { status, label } = deriveUafStatus(inv);
          return (
            <article key={list.id} className="uaf-list-card">
              <div className="uaf-list-card__head">
                <h4>{list.title}</h4>
                {list.subtitle && <p className="uaf-list-card__sub">{list.subtitle}</p>}
              </div>
              <div className={`uaf-status-pill uaf-status-pill--${status}`}>{label}</div>
              <div className="uaf-list-card__body">
                {inv?.finding_summary ? (
                  <p className="uaf-list-card__summary">{inv.finding_summary}</p>
                ) : inv ? (
                  <p className="uaf-list-card__summary uaf-list-card__summary--muted">
                    Registro asociado sin texto de resumen. Nivel: {inv.risk_level ?? '—'}
                    {inv.is_adverse_record ? ' · Registro adverso' : ''}.
                  </p>
                ) : (
                  <p className="uaf-list-card__empty">
                    No hay resultado registrado para este listado. Ejecute una investigación o configure n8n para
                    que el nombre de fuente o el resumen incluya palabras clave del listado (p. ej. «OFAC», «ONU
                    1267»).
                  </p>
                )}
                {inv?.created_at && (
                  <time className="uaf-list-card__time" dateTime={inv.created_at}>
                    Actualizado: {new Date(inv.created_at).toLocaleString()}
                  </time>
                )}
                {inv?.source_name && (
                  <p className="uaf-list-card__meta">Fuente: {inv.source_name}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
