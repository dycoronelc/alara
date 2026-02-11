# Despliegue de ALARA INSP en Railway

Guía paso a paso para subir la **Plataforma de Gestión de Inspecciones VIP** (backend, frontend y base de datos) a [Railway](https://railway.app).

---

## Requisitos previos

- Cuenta en [Railway](https://railway.app) (con GitHub para despliegue desde repo).
- Repositorio Git con el proyecto ALARA subido (GitHub recomendado).
- Cuenta Twilio (para llamadas y transcripción).
- Instancia n8n desplegada (cloud o self-hosted) con el workflow **ALARA - Twilio Transcription + Report** importado y activo.
- (Opcional) [Railway CLI](https://docs.railway.app/develop/cli) para ejecutar comandos desde tu máquina.

---

## Resumen de la arquitectura en Railway

En Railway tendrás **al menos 3 servicios**:

| Servicio   | Descripción                          | Origen                    |
|-----------|--------------------------------------|---------------------------|
| **MySQL** | Base de datos                        | Plugin MySQL de Railway   |
| **Backend** | API NestJS (Puerto asignado por Railway) | Carpeta `backend/`   |
| **Frontend** | App React (Vite) servida estática   | Carpeta `frontend/`       |

La integración con **n8n** y **Twilio** sigue siendo externa: tú configuras las URLs del backend en n8n y en Twilio después del despliegue.

---

## Paso 1: Crear el proyecto en Railway

1. Entra en [railway.app](https://railway.app) e inicia sesión (por ejemplo con GitHub).
2. Clic en **“New Project”**.
3. Elige **“Deploy from GitHub repo”** y autoriza a Railway a acceder al repositorio donde está ALARA.
4. Selecciona el repositorio y la rama (por ejemplo `main`).

No agregues aún el código como servicio; primero crearemos la base de datos.

---

## Paso 2: Añadir el servicio MySQL

1. Dentro del proyecto, clic en **“+ New”** → **“Database”** → **“Add MySQL”**.
2. Railway creará un servicio MySQL y te dará variables como:
   - `MYSQL_URL` o `DATABASE_URL` (según la plantilla).
3. En la pestaña **“Variables”** del servicio MySQL, anota o copia la variable de conexión (suele llamarse `MYSQL_URL` o similar).  
   La URL típica es:  
   `mysql://root:PASSWORD@HOST:PORT/railway`  
   En servicios del mismo proyecto, Railway suele exponer también un host interno tipo `mysql.railway.internal`.

---

## Paso 3: Desplegar el Backend (NestJS)

1. En el mismo proyecto, **“+ New”** → **“GitHub Repo”** (o “Empty Service” si prefieres conectar después).
2. Si elegiste repo:
   - Selecciona de nuevo el repo de ALARA.
   - **Root Directory**: pon **`backend`** (importante para que Railway use solo la carpeta del backend).
3. En **Settings** del servicio backend:
   - **Build Command**:  
     `npm install && npm run build`  
     (el `build` del backend ya incluye `prisma generate`).
   - **Start Command**:  
     `npm run start`  
     (ejecuta `node dist/main.js`).
   - **Watch Paths** (opcional): `backend/**` para que solo cambios en backend disparen redeploy.

4. **Variables de entorno** del servicio Backend:

   En **Variables** del servicio, agrega (ajusta valores según tu entorno):

   | Variable | Descripción | Ejemplo |
   |----------|-------------|---------|
   | `PORT` | Lo asigna Railway; no hace falta ponerlo a mano. | (Railway lo inyecta) |
   | `DATABASE_URL` | Conexión a MySQL. | Referencia: `${{MySQL.MYSQL_URL}}` si tu servicio MySQL se llama "MySQL". |
   | `JWT_SECRET` | Secreto para tokens JWT. | Una cadena larga y aleatoria. |
   | `BACKEND_PUBLIC_URL` | URL pública del backend (para Twilio y n8n). | `https://tu-backend.railway.app` (ver paso 5). |
   | `N8N_CALL_START_URL` | URL del webhook “Call Start” de n8n. | `https://tu-n8n.com/webhook/call/start` |
   | `N8N_TRANSCRIPTION_WEBHOOK` | URL del webhook de transcripción en n8n. | `https://tu-n8n.com/webhook/call/transcription` |
   | `N8N_RECORDING_WEBHOOK` | URL del webhook de grabación en n8n. | `https://tu-n8n.com/webhook/call/recording` |
   | `TWILIO_ACCOUNT_SID` | Account SID de Twilio. | De tu consola Twilio. |
   | `TWILIO_AUTH_TOKEN` | Auth Token de Twilio. | De tu consola Twilio. |
   | `TWILIO_FROM` | Número Twilio que origina la llamada. | Ej: `+507XXXXXXX` |

   Para `DATABASE_URL`: si añadiste el servicio MySQL en el mismo proyecto, en Variables puedes usar la referencia a otro servicio, por ejemplo:  
   `${{MySQL.MYSQL_URL}}`  
   (reemplaza `MySQL` por el nombre exacto de tu servicio MySQL en Railway).

5. **Dominio público**:
   - En el servicio Backend, pestaña **Settings** → **Networking** → **Generate Domain**.
   - Copia la URL generada (ej: `https://backend-production-xxxx.up.railway.app`) y úsala como `BACKEND_PUBLIC_URL` en las variables (y en n8n/Twilio más adelante).

6. **Primera ejecución y base de datos**:
   - Railway no ejecuta la base de datos durante el *build*; las migraciones/seed se suelen ejecutar al arranque o a mano.
   - **Opción A – Manual (recomendado la primera vez):**  
     Una vez el backend esté desplegado y con `DATABASE_URL` correcta, en tu máquina (con Railway CLI vinculado al proyecto) o desde un “one-off” run:
     - Conectar a la DB y ejecutar el esquema:  
       `npx prisma db push`  
       (desde la carpeta `backend`, con `DATABASE_URL` apuntando a Railway).
     - Luego:  
       `npm run prisma:seed`  
     - Si prefieres usar los SQL del proyecto:  
       `npx prisma db execute --file prisma/db_init.sql`  
       y después el seed.
   - **Opción B – Al arranque:**  
     Puedes cambiar el **Start Command** a un script que ejecute migraciones/seed y luego inicie la app (teniendo cuidado de no re-seedear en cada deploy si no lo quieres).

7. Verificación:
   - Abre `https://TU-BACKEND-URL/api/health`.  
   - Deberías recibir algo como: `{"status":"ok","service":"alara-insp-api"}`.

---

## Paso 4: Desplegar el Frontend (React + Vite)

1. **“+ New”** → **“GitHub Repo”** (mismo repo ALARA).
2. En **Settings** del nuevo servicio:
   - **Root Directory**: **`frontend`**.
   - **Build Command**:  
     `npm install && npm run build`  
   - **Start Command**:  
     `npm run start`  
     (el `package.json` del frontend ya usa `serve` y `$PORT`).
   - Si Railway no inyecta `PORT`, añade en Variables: `PORT=3000` (o el que prefieras).

3. **Variable de entorno para la API**:
   - Crea la variable **`VITE_API_URL`** con la URL pública del backend **sin** barra final.  
     Ejemplo:  
     `VITE_API_URL=https://backend-production-xxxx.up.railway.app`  
   - Importante: en Vite las variables `VITE_*` se embeben en el build; si cambias la URL después, hay que volver a hacer **build** (redeploy).

4. **Dominio público**:
   - Settings → Networking → **Generate Domain** para el frontend.
   - Ejemplo: `https://alara-frontend-production-xxxx.up.railway.app`.

5. Verificación:
   - Abre la URL del frontend, inicia sesión (por ejemplo con los usuarios del seed: `alara@alarains.com` / `Alara123!`) y comprueba que el dashboard y las solicitudes carguen contra el backend.

---

## Paso 5: Configurar Twilio para producción

1. En la consola de Twilio, en el número que usas para las llamadas:
   - **Voice & Fax** → “A CALL COMES IN” puede quedarse en “Webhook”.
   - La URL que Twilio debe llamar para obtener TwiML es la de tu backend en Railway:  
     `https://TU-BACKEND-URL/api/webhooks/twilio/twiml/:id`  
     El `:id` es el ID de la solicitud de inspección; n8n y tu backend lo manejan.
2. Asegúrate de que **TWILIO_AUTH_TOKEN** y **TWILIO_ACCOUNT_SID** en Railway coincidan con la cuenta que usa ese número.
3. Si quieres validación de firma Twilio en producción, el backend ya usa `validateRequest` con `TWILIO_AUTH_TOKEN`; no hace falta cambiar código.

---

## Paso 6: Configurar n8n con las URLs de Railway

1. En tu instancia n8n, abre el workflow **“ALARA - Twilio Transcription + Report”** (el del JSON en la raíz del proyecto).
2. **Webhook “Call Start”**  
   - Debe ser la URL que el backend llama al “iniciar llamada”.  
   - En el backend tienes `N8N_CALL_START_URL`; en n8n esa misma URL debe ser la del webhook que recibe el POST con `inspection_request_id`, `client`, `twilio_*`, `backend_url`, etc.
3. **Transcription y Recording**  
   - Los nodos que reciben transcripción y grabación deben tener URLs públicas (webhooks de n8n).  
   - Esas URLs son las que configuras en el backend como:
     - `N8N_TRANSCRIPTION_WEBHOOK`
     - `N8N_RECORDING_WEBHOOK`
   - En el TwiML que sirve el backend (variable `BACKEND_PUBLIC_URL`) se inyectan estas URLs; por tanto, en n8n solo hace falta que los webhooks estén activos y que esas variables en Railway coincidan con las URLs reales de n8n.
4. **Guardar reporte en el backend**  
   - El nodo “HTTP Request - Save Report” del workflow debe apuntar a:  
     `https://TU-BACKEND-URL/api/inspection-requests/:id/report`  
   - Sustituye `:id` por el `inspection_request_id` que llega en el payload (en el workflow se usa algo como `$json.requestId`).
   - **Autorización:** el workflow debe enviar un `Authorization: Bearer <token>`. En el JSON del workflow puede haber un token fijo; en producción es mejor:
     - Generar un **token de servicio** desde el backend (login como ALARA/Admin → `POST /api/auth/service-token` con `user_id` y `label: "n8n"`).
     - Poner ese token en las credenciales o variables de n8n y usarlo en el nodo HTTP en lugar de un JWT hardcodeado.

---

## Paso 7: Resumen de variables por servicio

### Backend (Railway)

- `DATABASE_URL` → `${{MySQL.MYSQL_URL}}` o valor directo.
- `JWT_SECRET` → secreto fuerte.
- `BACKEND_PUBLIC_URL` → URL pública del backend (para Twilio/n8n).
- `N8N_CALL_START_URL`, `N8N_TRANSCRIPTION_WEBHOOK`, `N8N_RECORDING_WEBHOOK`.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.

### Frontend (Railway)

- `VITE_API_URL` → URL del backend (sin `/api` ni barra final).

### n8n (tu instancia)

- URLs de webhooks que coincidan con las que pusiste en el backend.
- Token Bearer para `POST .../report` (recomendado: token de servicio del backend).

---

## Paso 8: Comandos útiles

- **Solo backend (local contra DB en Railway):**  
  En `backend/`:  
  `DATABASE_URL="mysql://..." npx prisma db push`  
  `DATABASE_URL="mysql://..." npm run prisma:seed`

- **Logs:**  
  En Railway: pestaña **Deployments** → clic en el deployment → **View Logs**.

- **Health check:**  
  Backend: `GET https://TU-BACKEND-URL/api/health`.

---

## Checklist final

- [ ] Proyecto Railway creado y repo conectado.
- [ ] Servicio MySQL añadido y `DATABASE_URL` configurada en el backend.
- [ ] Backend desplegado con `backend` como root, build/start correctos y dominio generado.
- [ ] Variables de entorno del backend (JWT, Twilio, n8n, `BACKEND_PUBLIC_URL`) configuradas.
- [ ] Base de datos inicializada (`prisma db push` o `db_init.sql` + `prisma:seed`).
- [ ] Frontend desplegado con `frontend` como root y `VITE_API_URL` apuntando al backend.
- [ ] Twilio configurado con la URL de TwiML del backend.
- [ ] n8n con webhooks y “Save Report” apuntando al backend y token de servicio si aplica.
- [ ] Prueba de login, dashboard y (opcional) flujo de “iniciar llamada” → transcripción → reporte.

Con esto puedes considerar el proyecto subido a Railway y listo para uso en producción, manteniendo la integración con Twilio y n8n para las inspecciones VIP.
