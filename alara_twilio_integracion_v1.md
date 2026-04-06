# ALARA INSP · Especificación técnica para integración v1 con Twilio
## Llamada saliente desde web + grabación + transcripción post-llamada + autollenado asistido del Reporte de Inspección

## 1. Objetivo

Implementar una primera versión que permita, desde el sistema web de ALARA INSP:

1. iniciar una llamada telefónica saliente hacia el cliente desde la interfaz del expediente,
2. grabar la llamada,
3. almacenar la metadata y referencia de la grabación,
4. procesar el audio una vez finalizada la llamada,
5. convertir el audio a texto,
6. extraer de la transcripción los datos del Reporte de Inspección,
7. rellenar el reporte como **borrador sugerido**,
8. permitir que un usuario revise, corrija y confirme los datos antes de guardarlos de forma definitiva.

> Esta versión **no** hará transcripción ni autollenado en tiempo real durante la llamada. Todo el procesamiento será **post-llamada** para reducir complejidad y riesgo.

---

## 2. Alcance funcional de la v1

### Incluye
- Llamada saliente iniciada desde la app web.
- Uso de Twilio para manejo de voz.
- Grabación de la llamada.
- Registro de estados de llamada y grabación.
- Descarga o consumo del audio grabado.
- Envío del audio a un motor de speech-to-text.
- Extracción estructurada de datos del reporte.
- Guardado de un borrador sugerido del reporte.
- Interfaz de revisión humana.

### No incluye
- Transcripción en vivo.
- Streaming de audio en tiempo real.
- Sugerencias en vivo durante la llamada.
- Automatización 100% sin revisión humana.
- Bot conversacional IVR.
- Llamadas entrantes.
- Soporte omnicanal.

---

## 3. Enfoque recomendado

### Arquitectura funcional

**Frontend Web (React)**
- Pantalla del expediente / solicitud.
- Botón `Iniciar llamada`.
- Estado visual de llamada: marcando, conectada, finalizada, fallida.
- Indicador de grabación.
- Vista posterior de transcript.
- Vista de campos sugeridos y faltantes.
- Formulario editable con confirmación manual.

**Backend ALARA (NestJS + Prisma + MySQL)**
- Emisión de token para Twilio Voice JS SDK.
- Endpoint para iniciar llamada.
- Endpoint TwiML o lógica equivalente de conexión de llamada.
- Webhooks de estado de llamada y grabación.
- Persistencia de metadata.
- Job asíncrono para:
  - descargar/obtener audio,
  - transcribir,
  - extraer JSON,
  - guardar borrador.

**Twilio**
- Número telefónico habilitado para Voice.
- API Key estándar.
- Grabación habilitada.
- Status callbacks.

**Proveedor STT**
- Servicio externo para convertir audio a texto.

**Proveedor LLM / extractor**
- Servicio que convierta transcript a JSON estructurado según el esquema del reporte.

---

## 4. Flujo completo de la v1

### Flujo operativo

1. El usuario abre un expediente o solicitud en ALARA.
2. El frontend solicita al backend un token de Twilio Voice.
3. El usuario hace clic en `Iniciar llamada`.
4. El frontend inicia la sesión de voz con Twilio.
5. El backend orquesta la llamada saliente al cliente.
6. Se reproduce o registra el aviso de grabación.
7. La llamada se conecta y se graba.
8. Twilio envía callbacks de estado de llamada.
9. Cuando la grabación queda lista, Twilio envía callback de grabación.
10. El backend marca la llamada como `recording_ready`.
11. Se encola un job de postproceso.
12. El job obtiene la grabación.
13. El backend envía el audio al motor STT.
14. Se guarda la transcripción cruda y/o segmentada.
15. El backend llama al extractor estructurado.
16. El extractor devuelve un JSON con:
    - valores sugeridos,
    - faltantes,
    - campos inciertos,
    - trazabilidad básica.
17. Se crea un borrador del reporte.
18. El usuario revisa el borrador en el frontend.
19. El usuario corrige lo necesario y confirma.
20. El sistema guarda los datos finales del reporte.

---

## 5. Datos del Reporte de Inspección a considerar

Según el documento actual del proyecto, el Reporte de Inspección contiene secciones amplias que deben modelarse explícitamente:

- Datos personales
- Ocupación / empresa / actividad laboral
- Salud
- Factores de riesgo laborales
- Viajes
- Deportes de riesgo
- Deportes / actividad física
- Tabaco
- Alcohol y drogas
- Política / PEP
- Seguridad / armas / custodia
- Historia de seguros
- Ingresos
- Activos personales
- Pasivos personales
- Finanzas / otros
- Historial de manejo
- Juicios
- Comentarios adicionales
- Información médica / finalización

### Regla clave de negocio
El sistema **no debe asumir que todo lo detectado por IA es correcto**.  
Todo autollenado debe entrar como:

- `draft`
- `suggested`
- `pending_review`

Nunca como dato final confirmado automáticamente.

---

## 6. Requisitos funcionales

### 6.1 Llamadas
- El usuario autenticado puede iniciar una llamada desde un expediente.
- Solo perfiles autorizados pueden realizar llamadas.
- Debe registrarse:
  - usuario iniciador,
  - expediente,
  - fecha/hora,
  - número marcado,
  - estado,
  - duración,
  - identificador de Twilio.

### 6.2 Grabación
- La llamada debe quedar grabada.
- Debe existir una política de consentimiento.
- Debe registrarse el identificador de grabación.
- Debe poder saberse si la grabación:
  - fue solicitada,
  - comenzó,
  - finalizó,
  - está disponible,
  - falló.

### 6.3 Transcripción
- El audio se procesará solo cuando la grabación esté lista.
- Debe guardarse el transcript crudo.
- Debe poder reintentarse si falla.

### 6.4 Extracción estructurada
- Debe mapearse transcript -> JSON del reporte.
- Los campos no detectados deben quedar en `null`.
- Los campos dudosos deben marcarse para revisión.

### 6.5 Revisión humana
- El usuario debe ver:
  - transcript,
  - valores sugeridos,
  - campos sin detectar,
  - campos con baja confianza.
- El usuario debe editar y confirmar antes de guardar.

### 6.6 Auditoría
- Debe quedar bitácora de:
  - quién llamó,
  - cuándo,
  - a qué expediente,
  - quién revisó,
  - cuándo se confirmó el borrador,
  - si hubo reintentos de transcripción o extracción.

---

## 7. Requisitos no funcionales

### Seguridad
- JWT en todos los endpoints privados.
- Validación de rol/permiso.
- Verificación de firma de webhooks de Twilio.
- No exponer credenciales de Twilio al frontend.
- Cifrado o control de acceso fuerte sobre grabaciones y transcripciones.

### Escalabilidad
- El procesamiento de audio debe ir en segundo plano.
- No bloquear requests HTTP largos.

### Trazabilidad
- Cada llamada, grabación, transcript y draft debe quedar relacionado con el expediente.

### Resiliencia
- Reintentos automáticos para fallos temporales del proveedor STT o extractor.
- Estados intermedios persistentes para recuperación.

---

## 8. Diseño backend propuesto

# 8.1 Módulos NestJS sugeridos

## `twilio`
Responsabilidades:
- emitir token para Voice SDK,
- iniciar llamada,
- generar/servir TwiML si aplica,
- recibir callbacks de estado de llamada,
- recibir callbacks de grabación,
- validar firma de Twilio.

Archivos sugeridos:
- `twilio.module.ts`
- `twilio.controller.ts`
- `twilio.service.ts`
- `twilio.webhook.controller.ts`
- `dto/start-call.dto.ts`
- `dto/twilio-status.dto.ts`
- `dto/twilio-recording.dto.ts`

## `inspection-calls`
Responsabilidades:
- lógica de negocio de llamadas ligadas al expediente,
- persistencia y consulta de llamadas,
- estados y auditoría,
- asociación expediente <-> llamada <-> grabación.

Archivos sugeridos:
- `inspection-calls.module.ts`
- `inspection-calls.service.ts`
- `inspection-calls.controller.ts`

## `transcription`
Responsabilidades:
- orquestar envío de audio a STT,
- persistir transcripciones,
- reintentos,
- normalización del transcript.

## `report-extraction`
Responsabilidades:
- convertir transcript a JSON estructurado,
- validación del JSON,
- normalización de tipos,
- guardar borrador.

## `queues` o `jobs`
Responsabilidades:
- ejecutar procesos asíncronos.
- recomendable usar BullMQ + Redis si el proyecto lo permite.

---

## 8.2 Variables de entorno necesarias

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_TWIML_APP_SID=
TWILIO_PHONE_NUMBER=
TWILIO_STATUS_CALLBACK_URL=
TWILIO_RECORDING_CALLBACK_URL=
TWILIO_WEBHOOK_VALIDATE=true

TRANSCRIPTION_PROVIDER=
TRANSCRIPTION_API_KEY=
TRANSCRIPTION_WEBHOOK_SECRET=

LLM_PROVIDER=
LLM_API_KEY=

APP_BASE_URL=
PUBLIC_FRONTEND_URL=

REDIS_URL=
AUDIO_STORAGE_DRIVER=s3
AUDIO_STORAGE_BUCKET=
AUDIO_STORAGE_REGION=
AUDIO_STORAGE_ACCESS_KEY=
AUDIO_STORAGE_SECRET_KEY=
```

> `TWILIO_AUTH_TOKEN` se usa típicamente para SDK servidor y validación de webhooks.  
> `TWILIO_API_KEY` + `TWILIO_API_SECRET` se usan para generar el access token del navegador.

---

## 8.3 Endpoints backend sugeridos

### Privados
#### `GET /twilio/voice/token`
Devuelve token para el cliente web autenticado.

Respuesta sugerida:
```json
{
  "token": "jwt-twilio-token",
  "identity": "user-123"
}
```

#### `POST /inspection-calls/start`
Inicia una llamada ligada a un expediente.

Request:
```json
{
  "inspectionRequestId": 41,
  "toPhoneNumber": "+50760000000"
}
```

Respuesta:
```json
{
  "callId": "local-db-id",
  "twilioCallSid": "CAxxxx",
  "status": "initiated"
}
```

#### `GET /inspection-calls/:id`
Obtiene detalle de llamada.

#### `GET /inspection-calls/:id/transcript`
Obtiene transcript.

#### `GET /inspection-calls/:id/draft`
Obtiene borrador generado.

#### `POST /inspection-calls/:id/reprocess`
Reintenta transcripción o extracción.

#### `POST /inspection-calls/:id/confirm-draft`
Confirma borrador y persiste campos finales.

---

### Públicos o semipúblicos con validación de firma
#### `POST /webhooks/twilio/call-status`
Recibe callbacks de estado de llamada:
- initiated
- ringing
- answered
- completed
- busy
- failed
- no-answer
- canceled

#### `POST /webhooks/twilio/recording-status`
Recibe callbacks de grabación:
- in-progress
- completed
- absent
- failed

#### `POST /webhooks/transcription/completed`
Opcional, si el proveedor STT responde por webhook.

---

## 8.4 DTOs sugeridos

### `StartCallDto`
```ts
export class StartCallDto {
  @IsInt()
  inspectionRequestId: number;

  @IsString()
  @IsNotEmpty()
  toPhoneNumber: string;
}
```

### `ConfirmDraftDto`
```ts
export class ConfirmDraftDto {
  @IsObject()
  finalPayload: Record<string, any>;
}
```

### `TwilioCallStatusDto`
Campos esperados típicos:
- `CallSid`
- `CallStatus`
- `From`
- `To`
- `CallDuration`
- `Direction`

### `TwilioRecordingStatusDto`
Campos esperados típicos:
- `CallSid`
- `RecordingSid`
- `RecordingStatus`
- `RecordingUrl`
- `RecordingDuration`

---

## 8.5 Servicios backend principales

### `TwilioService`
Métodos sugeridos:
- `generateVoiceAccessToken(user)`
- `startOutboundCall(payload)`
- `validateWebhookSignature(req)`
- `handleCallStatus(payload)`
- `handleRecordingStatus(payload)`

### `InspectionCallsService`
Métodos sugeridos:
- `createPendingCall(...)`
- `markCallInitiated(...)`
- `markCallAnswered(...)`
- `markCallCompleted(...)`
- `attachRecording(...)`
- `getCallById(...)`
- `getCallTranscript(...)`
- `getCallDraft(...)`
- `confirmDraft(...)`

### `TranscriptionService`
Métodos sugeridos:
- `enqueueTranscription(callId)`
- `downloadOrFetchRecording(callId)`
- `transcribeAudio(callId)`
- `saveTranscript(callId, transcript)`
- `retry(callId)`

### `ReportExtractionService`
Métodos sugeridos:
- `extractDraftFromTranscript(callId)`
- `validateStructuredPayload(payload)`
- `saveDraft(callId, payload)`
- `buildMissingFields(payload)`

---

## 8.6 Cola de trabajos recomendada

### Opción recomendada
**BullMQ + Redis**

Jobs sugeridos:
- `process-recording-ready`
- `transcribe-call`
- `extract-report-fields`
- `retry-transcription`
- `retry-extraction`

### Flujo del job
1. llega callback de grabación completa,
2. se crea job `process-recording-ready`,
3. el job resuelve URL/path del audio,
4. se lanza `transcribe-call`,
5. al terminar, se lanza `extract-report-fields`,
6. se actualiza estado final del draft.

---

## 8.7 Almacenamiento de archivos

### Recomendación
No depender únicamente de la URL temporal del proveedor.

Guardar al menos:
- referencia remota,
- copia interna si la política lo permite,
- metadata del audio.

Campos recomendados:
- `storageProvider`
- `storageKey`
- `mimeType`
- `durationSeconds`
- `channels`
- `sourceUrl`

Idealmente usar:
- S3
- MinIO
- Cloudflare R2
- almacenamiento equivalente

---

## 9. Modelo de datos propuesto en Prisma

> No reemplaza el esquema actual; son tablas sugeridas para esta integración.

### 9.1 `InspectionCall`
```prisma
model InspectionCall {
  id                    Int       @id @default(autoincrement())
  inspectionRequestId   Int
  initiatedByUserId     Int
  toPhoneNumber         String    @db.VarChar(50)
  fromPhoneNumber       String?   @db.VarChar(50)
  twilioCallSid         String?   @unique @db.VarChar(100)
  status                String    @db.VarChar(50)
  direction             String?   @db.VarChar(30)
  startedAt             DateTime?
  answeredAt            DateTime?
  endedAt               DateTime?
  durationSeconds       Int?
  recordingRequested    Boolean   @default(false)
  transcriptStatus      String?   @db.VarChar(50)
  extractionStatus      String?   @db.VarChar(50)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  recordings            CallRecording[]
  transcripts           CallTranscript[]
  drafts                ReportDraft[]
}
```

### 9.2 `CallRecording`
```prisma
model CallRecording {
  id                    Int       @id @default(autoincrement())
  inspectionCallId      Int
  twilioRecordingSid    String?   @unique @db.VarChar(100)
  status                String    @db.VarChar(50)
  recordingUrl          String?   @db.Text
  storageProvider       String?   @db.VarChar(50)
  storageKey            String?   @db.VarChar(255)
  mimeType              String?   @db.VarChar(100)
  durationSeconds       Int?
  channels              Int?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  inspectionCall        InspectionCall @relation(fields: [inspectionCallId], references: [id], onDelete: Cascade)
}
```

### 9.3 `CallTranscript`
```prisma
model CallTranscript {
  id                    Int       @id @default(autoincrement())
  inspectionCallId      Int
  provider              String?   @db.VarChar(50)
  languageCode          String?   @db.VarChar(20)
  rawText               String?   @db.LongText
  structuredJson        Json?
  status                String    @db.VarChar(50)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  inspectionCall        InspectionCall @relation(fields: [inspectionCallId], references: [id], onDelete: Cascade)
}
```

### 9.4 `ReportDraft`
```prisma
model ReportDraft {
  id                    Int       @id @default(autoincrement())
  inspectionCallId      Int
  inspectionRequestId   Int
  status                String    @db.VarChar(50) // pending_review, confirmed, rejected
  payload               Json
  missingFields         Json?
  lowConfidenceFields   Json?
  createdByUserId       Int?
  reviewedByUserId      Int?
  reviewedAt            DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  inspectionCall        InspectionCall @relation(fields: [inspectionCallId], references: [id], onDelete: Cascade)
}
```

### 9.5 `CallAuditLog`
```prisma
model CallAuditLog {
  id                    Int       @id @default(autoincrement())
  inspectionCallId      Int
  eventType             String    @db.VarChar(100)
  eventPayload          Json?
  createdByUserId       Int?
  createdAt             DateTime  @default(now())
}
```

---

## 10. Estados sugeridos

### 10.1 Estado de llamada
- `pending`
- `initiated`
- `ringing`
- `answered`
- `completed`
- `busy`
- `failed`
- `no_answer`
- `canceled`

### 10.2 Estado de grabación
- `requested`
- `in_progress`
- `completed`
- `absent`
- `failed`

### 10.3 Estado de transcripción
- `pending`
- `processing`
- `completed`
- `failed`

### 10.4 Estado de extracción
- `pending`
- `processing`
- `completed`
- `failed`

### 10.5 Estado de borrador
- `pending_review`
- `confirmed`
- `rejected`

---

## 11. Reglas de extracción estructurada

### 11.1 Principios
- No inventar datos.
- No inferir valores críticos si no fueron dichos de forma clara.
- Si no existe evidencia textual suficiente, usar `null`.
- Campos booleanos deben quedar como `true`, `false` o `null`.
- Fechas normalizadas a ISO o formato interno definido.
- Montos normalizados a decimal o string monetario según el modelo actual.

### 11.2 Estructura recomendada del payload de draft
```json
{
  "datosPersonales": {
    "nombres": { "value": "Daniel", "confidence": 0.96, "source": "..." },
    "apellidos": { "value": "Coronel", "confidence": 0.95, "source": "..." },
    "numeroDocumento": { "value": null, "confidence": 0.0, "source": null }
  },
  "salud": {
    "diabetes": { "value": false, "confidence": 0.82, "source": "..." }
  },
  "missingFields": [
    "datosPersonales.numeroDocumento",
    "salud.peso"
  ],
  "lowConfidenceFields": [
    "actividadLaboral.antiguedadEmpresa"
  ]
}
```

### 11.3 Evidencia
Siempre que sea posible, conservar:
- texto fuente,
- posición o segmento,
- speaker, si el STT lo provee.

---

## 12. Diseño frontend propuesto

## 12.1 Componentes principales

### `CallPanel`
Muestra:
- botón iniciar llamada,
- botón finalizar llamada, si aplica,
- estado actual,
- duración,
- indicador de grabación,
- mensajes de error.

### `CallStatusBadge`
Estados visuales:
- Marcando
- Sonando
- Conectada
- Finalizada
- Fallida

### `TranscriptViewer`
Muestra:
- transcript completo,
- segmentos por speaker, si existen,
- buscador interno,
- timestamps.

### `DraftReviewPanel`
Muestra:
- secciones del reporte,
- campos sugeridos,
- nivel de confianza,
- campos faltantes,
- edición manual.

### `FieldSuggestion`
Por cada campo:
- valor sugerido,
- icono de confianza,
- origen del dato,
- control para aceptar o reemplazar.

### `ProcessingStateCard`
Muestra progreso:
- grabación lista,
- transcribiendo,
- extrayendo,
- borrador listo.

---

## 12.2 Estados frontend sugeridos

### Estado de llamada
- `idle`
- `requesting_token`
- `device_ready`
- `starting_call`
- `ringing`
- `in_call`
- `call_ended`
- `call_failed`

### Estado de postproceso
- `waiting_recording`
- `transcribing`
- `extracting`
- `draft_ready`
- `processing_failed`

---

## 12.3 Hooks o stores sugeridos

### `useTwilioVoice`
Responsabilidades:
- solicitar token,
- inicializar SDK,
- conectar llamada,
- escuchar eventos,
- limpiar dispositivo.

### `useInspectionCall`
Responsabilidades:
- crear llamada,
- consultar estado backend,
- recuperar transcript,
- recuperar draft,
- confirmar draft.

### `useDraftReview`
Responsabilidades:
- edición local del borrador,
- validaciones,
- confirmación final.

---

## 12.4 Pantalla objetivo

### Pantalla de expediente / solicitud
Distribución sugerida:

**Columna superior**
- Datos del expediente
- Nombre del cliente
- Botón `Iniciar llamada`

**Panel de llamada**
- Estado
- Duración
- Indicador de grabación
- Número marcado

**Tabs**
- `Transcript`
- `Campos sugeridos`
- `Formulario completo`
- `Auditoría`

---

## 12.5 UX recomendada
- No reemplazar silenciosamente valores del formulario final.
- Mostrar claramente:
  - “Valor sugerido por llamada”
  - “Pendiente de revisión”
- Permitir aceptar por campo o editar manualmente.
- Resaltar faltantes.
- Mostrar error legible si falla la llamada o el procesamiento.

---

## 13. Integración de Twilio en frontend

## 13.1 Flujo frontend

1. Usuario abre el expediente.
2. Frontend llama a `GET /twilio/voice/token`.
3. Se inicializa Twilio Device.
4. Usuario pulsa `Iniciar llamada`.
5. Frontend llama a `POST /inspection-calls/start`.
6. Frontend sincroniza estados locales con estados backend.
7. Al terminar la llamada, la UI cambia a `Procesando grabación`.
8. Se refresca o consulta estado hasta tener draft listo.

## 13.2 Recomendaciones
- El token de Twilio debe ser de corta duración.
- El frontend no debe contener secretos.
- Manejar reconexión o reintento de inicialización del dispositivo.

---

## 14. Integración Twilio en backend

## 14.1 Token de voz
Implementar endpoint que:
- obtiene usuario autenticado,
- genera `identity` única,
- firma access token con API Key y API Secret,
- lo devuelve al frontend.

## 14.2 Inicio de llamada
Opciones:
- iniciar vía backend usando SDK/API de Twilio,
- o usando Voice JS con apoyo del backend.

Para v1, se recomienda una implementación donde el backend:
- registre la llamada,
- invoque a Twilio,
- relacione inmediatamente `inspectionRequestId` con `CallSid`.

## 14.3 Callbacks
El backend debe recibir:
- cambios de estado de la llamada,
- cambio de estado de grabación.

Debe validarse la firma de Twilio antes de aceptar el payload.

---

## 15. Consideraciones de seguridad y cumplimiento

### 15.1 Consentimiento
Antes o al inicio de la llamada debe existir aviso de grabación.  
Además, debe revisarse la política interna y el marco legal aplicable.

### 15.2 Acceso
Las grabaciones y transcripts no deben ser visibles para todos los usuarios.  
Recomendable control por roles:
- administrador,
- inspector,
- supervisor,
- auditor.

### 15.3 Datos sensibles
El formulario incluye potencialmente:
- datos personales,
- información de salud,
- información financiera,
- información política/PEP,
- procesos judiciales.

Por ello:
- evitar exposición innecesaria,
- limitar exportaciones,
- trazar accesos.

### 15.4 Logs
No registrar transcripts completos en logs técnicos.

---

## 16. Errores y escenarios a manejar

### Llamada
- número inválido,
- no contesta,
- ocupado,
- llamada rechazada,
- error del proveedor,
- timeout de conexión.

### Grabación
- grabación ausente,
- callback no recibido,
- URL expirada,
- fallo al descargar audio.

### Transcripción
- audio corrupto,
- proveedor STT caído,
- transcript vacío.

### Extracción
- JSON inválido,
- campos faltantes,
- respuesta inconsistente.

### UI
- usuario cierra pantalla mientras procesa,
- draft tarda en generarse,
- pérdida de sesión.

---

## 17. Estrategia de implementación por fases

## Fase 1 · Base técnica Twilio
- crear credenciales y número,
- endpoint token,
- endpoint start call,
- callbacks,
- persistencia de llamada y grabación.

## Fase 2 · Procesamiento post-llamada
- cola de jobs,
- descarga de grabación,
- integración STT,
- persistencia del transcript.

## Fase 3 · Extracción y draft
- modelo JSON del reporte,
- integración extractor,
- guardado de borrador.

## Fase 4 · UI de revisión
- transcript viewer,
- campos sugeridos,
- confirmación manual,
- auditoría.

## Fase 5 · Hardening
- reintentos,
- observabilidad,
- métricas,
- permisos finos,
- pruebas.

---

## 18. Checklist backend

- [ ] Crear módulo `twilio`
- [ ] Crear endpoint `GET /twilio/voice/token`
- [ ] Crear endpoint `POST /inspection-calls/start`
- [ ] Crear endpoint `POST /webhooks/twilio/call-status`
- [ ] Crear endpoint `POST /webhooks/twilio/recording-status`
- [ ] Validar firma de webhook
- [ ] Crear modelos Prisma de llamadas, grabaciones, transcripts y drafts
- [ ] Crear migración Prisma
- [ ] Implementar servicio de grabación
- [ ] Implementar cola de jobs
- [ ] Integrar proveedor STT
- [ ] Integrar extractor estructurado
- [ ] Crear endpoint para consultar draft
- [ ] Crear endpoint para confirmar draft
- [ ] Agregar auditoría

---

## 19. Checklist frontend

- [ ] Integrar SDK de voz
- [ ] Crear hook para token e inicialización
- [ ] Crear botón `Iniciar llamada`
- [ ] Mostrar estados de llamada
- [ ] Mostrar estado de procesamiento post-llamada
- [ ] Crear visor de transcript
- [ ] Crear panel de sugerencias
- [ ] Permitir edición del formulario
- [ ] Resaltar campos faltantes
- [ ] Confirmar borrador
- [ ] Manejar errores y reintentos

---

## 20. Criterios de aceptación de la v1

### Backend
- Se puede iniciar una llamada desde un expediente.
- La llamada queda asociada a un `inspectionRequestId`.
- La llamada queda grabada.
- El callback de grabación actualiza la base de datos.
- Se genera transcript.
- Se genera borrador estructurado.
- El usuario puede confirmar el borrador.

### Frontend
- El usuario ve el estado de la llamada.
- El usuario ve cuándo el sistema está procesando.
- El usuario puede consultar transcript y sugerencias.
- El usuario puede editar y confirmar.

### Negocio
- El proceso reduce captura manual.
- El sistema no guarda automáticamente datos sensibles sin revisión.
- Existe trazabilidad del proceso de extremo a extremo.

---

## 21. Recomendación final

La mejor primera versión para ALARA es:

**llamada saliente + grabación + transcripción post-llamada + autollenado asistido con revisión humana obligatoria**

Esto:
- reduce complejidad,
- encaja con el stack actual,
- aprovecha NestJS + Prisma + MySQL,
- permite salir rápido a producción,
- deja listo el camino para una v2 con transcripción en tiempo real.

---

## 22. Posibles entregables siguientes

Como siguiente paso de implementación se pueden preparar:

1. esquema Prisma completo listo para migración,
2. estructura de módulos NestJS,
3. DTOs y controladores base,
4. contrato JSON del draft del Reporte de Inspección,
5. componentes React iniciales para llamada y revisión.
