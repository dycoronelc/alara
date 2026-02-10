import { useEffect, useState } from 'react';

type SourceItem = { name: string; url: string };

const STORAGE_KEY = 'alara-investigation-sources';

const AdminPage = () => {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSources(JSON.parse(stored));
    }
  }, []);

  const persist = (items: SourceItem[]) => {
    setSources(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  return (
    <div className="page">
      <div className="info-card">
        <h3>Administración</h3>
        <p>Gestión de usuarios, aseguradoras, permisos y catálogos.</p>
      </div>

      <div className="grid-two">
        <div className="info-card">
          <h4>Fuentes para Investigaciones (n8n)</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="form-field">
              <span>URL</span>
              <input value={url} onChange={(event) => setUrl(event.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="primary-button"
              onClick={() => {
                if (!name || !url) return;
                persist([...sources, { name, url }]);
                setName('');
                setUrl('');
              }}
            >
              Agregar fuente
            </button>
          </div>
          <div className="list-block">
            {sources.map((item, index) => (
              <div key={`${item.name}-${index}`} className="list-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.url}</span>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => persist(sources.filter((_, idx) => idx !== index))}
                >
                  Quitar
                </button>
              </div>
            ))}
            {!sources.length && <p>No hay fuentes configuradas.</p>}
          </div>
        </div>
        <div className="info-card">
          <h4>Integraciones</h4>
          <ul className="details-list">
            <li>
              <span>Google Calendar</span>
              <strong>Activo</strong>
            </li>
            <li>
              <span>n8n Webhooks</span>
              <strong>Activo</strong>
            </li>
            <li>
              <span>Notificaciones</span>
              <strong>SMTP + WhatsApp</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
