# ALARA – Configuración con 2Chat (llamadas y transcripción)

Este documento describe el workflow **ALARA - 2Chat Transcription + Report** en n8n, la opción recomendada para transcripción de llamadas y los cambios necesarios en el backend.

---

## 1. Workflow n8n: ALARA - 2Chat Transcription + Report

- **Archivo:** `ALARA - 2Chat Transcription + Report.json`
- **Uso:** Importar en n8n y activar. Sustituye el flujo basado en Twilio cuando uses 2Chat para llamadas (p. ej. números de Panamá u otros países no soportados por Twilio para voz + WhatsApp).

### Flujo resumido

1. **Inicio de llamada**  
   - El backend llama a `POST /webhook/call/start` (mismo path que con Twilio).  
   - El workflow envía a la API de 2Chat la petición para crear la llamada saliente (número destino, caller ID, metadata).

2. **Llamada completada (2Chat)**  
   - 2Chat envía un webhook al workflow cuando la llamada termina (evento `call.outbound.completed`).  
   - URL que debes configurar en 2Chat:  
     `https://TU_N8N_BASE_URL/webhook/webhook/2chat/call-completed`  
   - El payload incluye `recording_url` (MP3), `uuid`, `to_number`, etc.

3. **Transcripción**  
   - Si hay `recording_url`, el workflow descarga el audio, lo transcribe con **OpenAI Whisper** (nodo OpenAI – Transcribe a Recording) y continúa con la extracción del reporte (IA) y el guardado en el backend.

4. **Grabación**  
   - Se envía la grabación (URL y metadatos) al backend en `POST /api/webhooks/2chat/recording`.

### Variables de entorno en n8n

| Variable | Descripción |
|----------|-------------|
| `TWOCHAT_API_KEY` | API key de 2Chat (X-User-API-Key). |
| `TWOCHAT_CALLER_ID_UUID` | UUID del caller ID en 2Chat (número desde el que se hace la llamada). |
| `BACKEND_URL` | URL pública del backend (para resolver `inspection_request_id` y guardar reporte/grabación). |
| `ALARA_SERVICE_TOKEN` | Token JWT de servicio para llamadas al backend (report, by-call, recording). |

### Endpoint de 2Chat para crear llamada

En el workflow se usa por defecto:

- **POST** `https://api.p.2chat.io/open/voip/calls`  
- Headers: `X-User-API-Key`, `Content-Type: application/json`  
- Body: `to_number`, `caller_id_uuid`, y opcionalmente `metadata` (p. ej. `inspection_request_id`).

Si en la documentación de 2Chat el endpoint o los campos son distintos, ajusta el nodo **2Chat - Create Outbound Call** (HTTP Request) en n8n.

### Webhooks en 2Chat

En el panel de 2Chat (Phone Calls / Webhooks), suscríbete al evento **call.outbound.completed** y configura la URL:

- `https://TU_N8N_BASE_URL/webhook/webhook/2chat/call-completed`

(Reemplaza `TU_N8N_BASE_URL` por la URL base de tu instancia n8n.)

---

## 2. Transcripción de la llamada – Recomendación

2Chat no ofrece transcripción automática de **llamadas telefónicas** (sí para mensajes de audio de WhatsApp). Por eso el workflow:

1. Recibe en el webhook la `recording_url` (MP3).
2. Descarga el archivo con un HTTP Request (respuesta en binario).
3. Envía el audio al **nodo OpenAI (Whisper)** en n8n para transcribir.

**Opción recomendada: OpenAI Whisper**

- **Ventajas:** Buena calidad, soporte para español, mismo proveedor que el resto del flujo (extracción de reporte con GPT), integración directa en n8n con el nodo OpenAI – Audio – Transcribe a Recording.
- **Límite:** Archivos de hasta 25 MB (suficiente para la mayoría de llamadas).
- **Configuración:** Credencial OpenAI en n8n; en el nodo, indicar el campo binario donde está el audio (p. ej. `data`) y, si quieres, el idioma (p. ej. `es`).

Alternativas si no usas OpenAI para transcripción:

- **Google Cloud Speech-to-Text** o **Deepgram**: requieren nodos/HTTP Request adicionales y sus propias credenciales.
- **AssemblyAI**: también vía HTTP desde n8n.

Para ALARA, **Whisper es la opción más sencilla y coherente** con el resto del flujo.

---

## 3. Backend – Cambios necesarios para 2Chat

Para que el workflow funcione de extremo a extremo, el backend debe:

### 3.1. Resolver `inspection_request_id` por call UUID

El webhook de 2Chat (`call.outbound.completed`) no incluye nuestro `inspection_request_id`; solo `uuid` (de la llamada), `to_number`, `recording_url`, etc. Por tanto, el backend debe poder devolver el `inspection_request_id` asociado a una llamada 2Chat.

**Opción A – Endpoint recomendado**

- **GET** `/api/inspection-requests/by-call/:callUuid`  
- Respuesta esperada por n8n:  
  `{ "inspection_request_id": number, "backend_url": string }`  
- El backend debe tener guardada la relación `call_uuid` → `inspection_request_id` (ver registro al iniciar la llamada).

**Opción B – Metadata en 2Chat**

Si 2Chat permite enviar `metadata` al crear la llamada y lo devuelve en el webhook, puedes usar ese `inspection_request_id` en el workflow y evitar el endpoint anterior. Revisa la documentación de 2Chat (payload de creación de llamada y de `call.outbound.completed`).

### 3.2. Registrar la llamada al crearla

Cuando n8n llame a la API de 2Chat para crear la llamada, 2Chat devolverá un identificador de la llamada (p. ej. `uuid`). Para poder resolver después por `call_uuid`:

- Añadir en el workflow un nodo (HTTP Request) que, **después** de “2Chat - Create Outbound Call”, envíe al backend algo como:  
  `POST /api/inspection-requests/:id/call/register`  
  con body: `{ "provider": "2chat", "call_uuid": "..." }`.  
- El backend guarda en base de datos (o en caché con TTL) la relación `inspection_request_id` ↔ `call_uuid`.

El `inspection_request_id` ya lo tiene n8n en el payload de “Call Start”; el `call_uuid` lo obtiene de la respuesta de 2Chat al crear la llamada.

### 3.3. Recibir la grabación 2Chat

El workflow envía la grabación a:

- **POST** `/api/webhooks/2chat/recording`  
- Body de ejemplo:  
  `inspection_request_id`, `call_uuid`, `recording_url`, `duration`, `to_number`.

El backend debe implementar este endpoint para:

- Persistir la URL de la grabación (y opcionalmente descargarla y guardarla en almacenamiento propio), y  
- Asociarla a la solicitud de inspección correspondiente.

Si ya tienes un endpoint genérico de “grabación” (p. ej. el de Twilio), puedes reutilizarlo siempre que acepte este payload o añadir uno específico para 2Chat.

---

## 4. Resumen de pasos

1. Importar **ALARA - 2Chat Transcription + Report.json** en n8n.  
2. Configurar en n8n: `TWOCHAT_API_KEY`, `TWOCHAT_CALLER_ID_UUID`, `BACKEND_URL`, `ALARA_SERVICE_TOKEN`.  
3. En 2Chat: configurar webhook `call.outbound.completed` → URL del webhook del workflow.  
4. Backend: implementar **GET** `/api/inspection-requests/by-call/:callUuid`, registro de llamada al iniciar (con `call_uuid` de 2Chat) y **POST** `/api/webhooks/2chat/recording`.  
5. (Opcional) Añadir en el workflow el nodo que llama al backend para registrar `call_uuid` tras crear la llamada en 2Chat.  
6. Cambiar el backend para que, cuando quieras usar 2Chat, llame a la misma URL de n8n “Call Start” (el payload ya está pensado para poder enviar también `twochat_caller_id_uuid` si lo necesitas).

Con esto tendrás una versión del flujo ALARA que usa 2Chat para las llamadas y OpenAI Whisper para la transcripción y el reporte.
