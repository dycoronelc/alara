# ALARA INSP Backend

## Variables de entorno

Crear un archivo `.env` en la carpeta `backend` con, por ejemplo:

```
DATABASE_URL="mysql://usuario:password@localhost:3306/alara_insp"
JWT_SECRET="cambia-este-secreto"
PORT=3000
N8N_CALL_START_URL="https://TU_N8N_DOMAIN/webhook/call/start"
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxx"
TWILIO_FROM="+15005550006"
TWILIO_TWIML_URL="https://TU_DOMINIO/twilio_interview_twiml.xml"
N8N_TRANSCRIPTION_WEBHOOK="https://TU_N8N_DOMAIN/webhook/call/transcription"
N8N_RECORDING_WEBHOOK="https://TU_N8N_DOMAIN/webhook/call/recording"
BACKEND_PUBLIC_URL="http://localhost:3000"
```

## Autenticación

- `POST /api/auth/login` devuelve `access_token` y datos del usuario.
- En llamadas protegidas: `Authorization: Bearer <token>`.

## Webhook n8n

- `POST /api/webhooks/n8n/inspection/:id`
- El payload se guarda en `workflow_runs` y puede incluir `report` para persistir secciones/campos.

## Llamadas (n8n + Twilio)

- `POST /api/inspection-requests/:id/call/start`
- Inicia una llamada vía n8n usando las variables `N8N_CALL_START_URL` y Twilio.
