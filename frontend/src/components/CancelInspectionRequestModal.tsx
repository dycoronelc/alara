import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  requestLabel?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

const CancelInspectionRequestModal = ({
  open,
  requestLabel,
  busy,
  error,
  onClose,
  onConfirm,
}: Props) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="inactivity-overlay system-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-request-title"
    >
      <div className="inactivity-modal system-modal">
        <h2 id="cancel-request-title">Cancelar solicitud</h2>
        {requestLabel ? <p style={{ marginTop: '-0.25rem', color: 'var(--muted, #666)' }}>{requestLabel}</p> : null}
        <p>La solicitud pasará a estado cancelado y quedará cerrada. ¿Deseas continuar?</p>
        <label className="form-field">
          <span>Motivo (opcional)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={busy}
            placeholder="Ej. duplicada, cliente retiró la solicitud…"
          />
        </label>
        {error ? <p className="form-message">{error}</p> : null}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="ghost-button" disabled={busy} onClick={onClose}>
            Volver
          </button>
          <button type="button" className="primary-button" disabled={busy} onClick={() => onConfirm(reason.trim())}>
            {busy ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelInspectionRequestModal;
