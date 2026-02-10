# Despliegue en Railway (Frontend + Backend) con n8n y MySQL remoto

Este paso a paso asume:
- Backend NestJS en `backend/`
- Frontend Vite en `frontend/`
- n8n ya configurado y público
- MySQL remoto en `148.72.60.138` con usuario `innexia-dev`

---

## 1) Preparación general
1) Sube el repo a GitHub (o conecta el repo local a Railway).
2) Verifica que el backend arranca en local con las variables correctas.
3) Asegúrate de tener el token de servicio ALARA para n8n.

---

## 2) Backend en Railway

### 2.1 Crear servicio
1) En Railway, crea un **New Project**.
2) Agrega un **Service** desde el repo (backend).
3) Selecciona el root `backend/`.

### 2.2 Comandos
Railway normalmente detecta Node. Si te pide:
- **Build**: `npm install && npm run build`
- **Start**: `npm run start:prod`

### 2.3 Variables de entorno (Backend)
Agrega estas variables en Railway:
```
DB_HOST=148.72.60.138
DB_USER=innexia-dev
DB_PASSWORD=TU_PASSWORD_REAL
DB_NAME=alara_insp
DB_PORT=3306

PORT=5000
JWT_SECRET=TU_JWT_SECRET

BACKEND_PUBLIC_URL=https://TU_BACKEND_RAILWAY_URL

N8N_CALL_START_URL=https://TU_N8N_DOMAIN/webhook/call/start
N8N_TRANSCRIPTION_WEBHOOK=https://TU_N8N_DOMAIN/webhook/call/transcription
N8N_RECORDING_WEBHOOK=https://TU_N8N_DOMAIN/webhook/call/recording

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=TU_TWILIO_AUTH_TOKEN
TWILIO_FROM=+15005550006
```
Notas:
- `BACKEND_PUBLIC_URL` debe ser la URL pública de Railway.
- `TWILIO_AUTH_TOKEN` firma el endpoint de TwiML dinámico.

### 2.4 Base de datos
Como MySQL es externo, Railway **no** crea DB.  
Debes tener creada la BD `alara_insp` en el servidor 148.72.60.138.

Ejecuta las tablas una vez (si es un entorno limpio):
- Usa `backend/prisma/db_init.sql`
- O usa Prisma con `prisma db push`

---

## 3) Frontend en Railway

### 3.1 Crear servicio
1) En el mismo proyecto, crea otro **Service** desde el repo.
2) Selecciona el root `frontend/`.

### 3.2 Variables de entorno (Frontend)
```
VITE_API_URL=https://TU_BACKEND_RAILWAY_URL
```

### 3.3 Build & Deploy
- **Build**: `npm install && npm run build`
- **Start**: `npx serve -s dist`

---

## 4) n8n
En n8n debes tener:
- Webhook `/call/start`
- Webhook `/call/transcription`
- Webhook `/call/recording`

Y en tu workflow:
- Guardado del reporte en `/api/inspection-requests/:id/report`
- Guardado de grabación en `/api/webhooks/twilio/recording`

---

## 5) TwiML dinámico (sin archivo XML)
El backend expone:
```
GET /api/webhooks/twilio/twiml/:id
```
Twilio debe consumir este endpoint para la llamada.  
No necesitas alojar un XML externo.

---

## 6) Prueba final
1) Entra al frontend.
2) Abre un expediente.
3) Presiona **Llamar**.
4) Verifica que:
   - Twilio inicia la llamada
   - n8n recibe transcripción
   - backend guarda reporte
   - se guarda la grabación en `call_recordings`

---

Si quieres, puedo agregar un apartado con comandos exactos para migraciones y seed.
