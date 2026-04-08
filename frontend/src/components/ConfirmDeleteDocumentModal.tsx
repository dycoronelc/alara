type Props = {
  open: boolean;
  filename: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmDeleteDocumentModal = ({ open, filename, busy, error, onClose, onConfirm }: Props) => {
  if (!open) return null;

  const displayName = filename.trim() || 'este documento';

  return (
    <div
      className="inactivity-overlay system-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-document-title"
      aria-describedby="delete-document-desc"
    >
      <div className="inactivity-modal system-modal system-modal--document-delete">
        <h2 id="delete-document-title">Eliminar documento</h2>
        <p id="delete-document-desc" className="system-modal--document-delete__lead">
          ¿Eliminar el archivo siguiente? Esta acción no se puede deshacer.
        </p>
        <p className="system-modal--document-delete__filename" title={displayName}>
          {displayName}
        </p>
        {error ? <p className="form-message form-message--error system-modal--document-delete__error">{error}</p> : null}
        <div className="system-modal--document-delete__actions">
          <button type="button" className="ghost-button" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary-button system-modal--document-delete__confirm" disabled={busy} onClick={onConfirm}>
            {busy ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDocumentModal;
