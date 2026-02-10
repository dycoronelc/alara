# Prompt para AI de n8n (workflow completo)

Eres un asistente de automatización. Crea un workflow en n8n v2.6.4 llamado:

**“ALARA – Llamada + Transcripción + Reporte (Full Schema)”**

## Objetivo
Iniciar llamada con Twilio desde la app, grabar, transcribir, extraer datos con IA (AI Agent), y guardar el reporte de inspección en el backend con el esquema completo.

---

## Nodos requeridos (orden)

### 1) Webhook de inicio de llamada
- Nodo: **Webhook**
- Ruta: `/call/start`
- Método: `POST`
- Respuesta: `firstEntryJson`
- Payload esperado:
```json
{
  "inspection_request_id": 3,
  "client": { "full_name": "Paola Ríos", "phone": "+50769901000", "id_number": "9-111-333" },
  "twilio_account_sid": "ACxxxxxxxxxxxxx",
  "twilio_from": "+15005550006",
  "twilio_twiml_url": "https://TU_DOMINIO/twilio_interview_twiml.xml",
  "recording_webhook": "https://TU_N8N_DOMAIN/webhook/call/recording",
  "transcription_webhook": "https://TU_N8N_DOMAIN/webhook/call/transcription",
  "backend_url": "http://localhost:3000"
}
```

---

### 2) Twilio – Create Call
- Nodo: **HTTP Request**
- URL: `https://api.twilio.com/2010-04-01/Accounts/{{twilio_account_sid}}/Calls.json`
- Método: `POST`
- Auth: **Basic Auth** (credencial Twilio)
- Body:
  - `To` = `{{$json["client"]["phone"]}}`
  - `From` = `{{$json["twilio_from"]}}`
  - `Url` = `{{$json["twilio_twiml_url"]}}`
  - `Record` = `true`
  - `RecordingStatusCallback` = `{{$json["recording_webhook"]}}?inspection_request_id={{$json["inspection_request_id"]}}&backend_url={{$json["backend_url"]}}`
  - `TranscriptionCallback` = `{{$json["transcription_webhook"]}}?inspection_request_id={{$json["inspection_request_id"]}}&backend_url={{$json["backend_url"]}}`

---

### 3) Webhook de transcripción lista
- Nodo: **Webhook**
- Ruta: `/call/transcription`
- Método: `POST`
- Respuesta: `firstEntryJson`
- Campos esperados:
  - `TranscriptionText`
  - `inspection_request_id` (query)
  - `backend_url` (query)

---

### 4) Set Context
- Nodo: **Set**
- Dejar solo:
  - `inspection_request_id`
  - `backend_url` (default `http://localhost:3000`)
  - `transcript` = `TranscriptionText`

---

### 5) AI Agent – Extract Report (Full Schema)
- Nodo: **AI Agent**
- Tipo: `chat`
- Modelo: `gpt-4o-mini` (o disponible)
- Instrucciones:
```
You are a structured data extractor. Convert the transcript into the inspection report JSON schema. 
Output JSON only. Use the exact keys provided in the schema. 
If a value is not present, return an empty string.
```

- Input: `{{ $json["transcript"] }}`

- Output Schema (completo):

```json
{
  "outcome": "PENDIENTE",
  "summary": "",
  "additional_comments": "",
  "sections": [
    {
      "code": "DATOS_PERSONALES",
      "title": "Datos personales",
      "order": 1,
      "fields": [
        { "key": "pa_name", "label": "Propuesto Asegurado", "type": "TEXT", "value": "" },
        { "key": "home_address", "label": "Domicilio Particular", "type": "TEXT", "value": "" },
        { "key": "residence_time", "label": "Tiempo de Residencia", "type": "TEXT", "value": "" },
        { "key": "foreign_residence", "label": "Residencia en el extranjero (Dónde / cuándo)", "type": "TEXT", "value": "" },
        { "key": "mobile", "label": "Celular", "type": "TEXT", "value": "" },
        { "key": "email", "label": "E-mail", "type": "TEXT", "value": "" },
        { "key": "dob", "label": "Fecha de Nacimiento", "type": "TEXT", "value": "" },
        { "key": "document", "label": "Tipo y No. Documento", "type": "TEXT", "value": "" },
        { "key": "nationality", "label": "Nacionalidad", "type": "TEXT", "value": "" },
        { "key": "marital_status", "label": "Estado Civil", "type": "TEXT", "value": "" },
        { "key": "spouse_name", "label": "Nombre del Cónyuge", "type": "TEXT", "value": "" },
        { "key": "children", "label": "Hijos", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "PROFESION_LABORAL",
      "title": "Profesión – Actividad Laboral",
      "order": 2,
      "fields": [
        { "key": "profession_studies", "label": "Profesión / Estudios Cursados", "type": "TEXT", "value": "" },
        { "key": "occupation", "label": "Ocupación / Cargo", "type": "TEXT", "value": "" },
        { "key": "functions", "label": "Funciones", "type": "TEXT", "value": "" },
        { "key": "employer", "label": "Empleador / Empresa", "type": "TEXT", "value": "" },
        { "key": "seniority", "label": "Antigüedad en la empresa", "type": "TEXT", "value": "" },
        { "key": "company_start", "label": "Fecha de Creación de la Empresa", "type": "TEXT", "value": "" },
        { "key": "employees", "label": "Cantidad de Empleados", "type": "TEXT", "value": "" },
        { "key": "employee_or_partner", "label": "¿Es empleado o socio?", "type": "TEXT", "value": "" },
        { "key": "business_nature", "label": "Naturaleza del Negocio", "type": "TEXT", "value": "" },
        { "key": "clients", "label": "Clientes", "type": "TEXT", "value": "" },
        { "key": "business_address", "label": "Domicilio Comercial", "type": "TEXT", "value": "" },
        { "key": "website", "label": "Sitio Web", "type": "TEXT", "value": "" },
        { "key": "other_occupation", "label": "Otra Ocupación Actual (describa)", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "SALUD",
      "title": "Salud",
      "order": 3,
      "fields": [
        { "key": "doctor_name", "label": "Nombre del Médico Personal", "type": "TEXT", "value": "" },
        { "key": "medical_coverage", "label": "Cobertura Médica", "type": "TEXT", "value": "" },
        { "key": "last_consult", "label": "Fecha Última Consulta Médica", "type": "TEXT", "value": "" },
        { "key": "last_checkup", "label": "Fecha Último Check-up", "type": "TEXT", "value": "" },
        { "key": "doctor_contact", "label": "Nombre, Dirección del Médico Consultado", "type": "TEXT", "value": "" },
        { "key": "studies", "label": "Estudios realizados", "type": "TEXT", "value": "" },
        { "key": "results", "label": "Resultados Obtenidos", "type": "TEXT", "value": "" },
        { "key": "weight", "label": "Peso", "type": "TEXT", "value": "" },
        { "key": "height", "label": "Altura", "type": "TEXT", "value": "" },
        { "key": "weight_change", "label": "Cambio de Peso", "type": "TEXT", "value": "" },
        { "key": "deafness", "label": "Sordera", "type": "TEXT", "value": "" },
        { "key": "blindness", "label": "Ceguera", "type": "TEXT", "value": "" },
        { "key": "physical_alterations", "label": "Alteraciones Físicas", "type": "TEXT", "value": "" },
        { "key": "amputations", "label": "Amputaciones", "type": "TEXT", "value": "" },
        { "key": "other_impediments", "label": "Otros Impedimentos", "type": "TEXT", "value": "" },
        { "key": "high_pressure", "label": "Alta Presión", "type": "TEXT", "value": "" },
        { "key": "diabetes", "label": "Diabetes", "type": "TEXT", "value": "" },
        { "key": "cancer", "label": "Cáncer", "type": "TEXT", "value": "" },
        { "key": "cardiac", "label": "Problemas Cardiacos", "type": "TEXT", "value": "" },
        { "key": "ulcer", "label": "Úlcera", "type": "TEXT", "value": "" },
        { "key": "surgeries", "label": "Cirugías / Fechas", "type": "TEXT", "value": "" },
        { "key": "important_diseases", "label": "Enfermedades Importantes / Fechas", "type": "TEXT", "value": "" },
        { "key": "prescribed_meds", "label": "Medicamentos con prescripción médica (Nombre y Dosis)", "type": "TEXT", "value": "" },
        { "key": "non_prescribed_meds", "label": "Medicamentos no recetados (Nombre y Dosis)", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "RIESGOS_LABORALES",
      "title": "Factores de riesgo en sus labores",
      "order": 4,
      "fields": [
        { "key": "work_risk", "label": "¿Está expuesto a algún riesgo por sus labores?", "type": "TEXT", "value": "" },
        { "key": "work_risk_desc", "label": "Descripción según Ocupación", "type": "TEXT", "value": "" },
        { "key": "safety_rules", "label": "¿Hay Normas de Seguridad?", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "VIAJES",
      "title": "Viajes",
      "order": 5,
      "fields": [
        { "key": "travel_destination", "label": "Destino", "type": "TEXT", "value": "" },
        { "key": "travel_transport", "label": "Medio", "type": "TEXT", "value": "" },
        { "key": "travel_reason", "label": "Motivo", "type": "TEXT", "value": "" },
        { "key": "travel_frequency", "label": "Frecuencia", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "DEPORTES_RIESGO",
      "title": "Deportes de Riesgo",
      "order": 6,
      "fields": [
        { "key": "diving", "label": "¿Buceo?", "type": "TEXT", "value": "" },
        { "key": "racing", "label": "¿Carrera de Vehículos?", "type": "TEXT", "value": "" },
        { "key": "pilot", "label": "¿Es Piloto de avión o Piloto Estudiante?", "type": "TEXT", "value": "" },
        { "key": "ultralight", "label": "Aviones Ultraligeros", "type": "TEXT", "value": "" },
        { "key": "parachute", "label": "Paracaidismo", "type": "TEXT", "value": "" },
        { "key": "paragliding", "label": "Parapente", "type": "TEXT", "value": "" },
        { "key": "climbing", "label": "Escalamiento de montañas", "type": "TEXT", "value": "" },
        { "key": "other_risk", "label": "¿Otra Actividad de Riesgo? Ampliar", "type": "TEXT", "value": "" },
        { "key": "accidents", "label": "¿Ha sufrido algún accidente o lesión practicando deporte o actividad física?", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "DEPORTES",
      "title": "Deportes",
      "order": 7,
      "fields": [
        { "key": "sports_activity", "label": "Deporte o Actividad Física", "type": "TEXT", "value": "" },
        { "key": "sports_frequency", "label": "Frecuencia", "type": "TEXT", "value": "" },
        { "key": "sports_details", "label": "Dar detalles", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "TABACO",
      "title": "Tabaco",
      "order": 8,
      "fields": [
        { "key": "smoker", "label": "¿Es Fumador o utiliza algún tipo de tabaco?", "type": "TEXT", "value": "" },
        { "key": "tobacco_type", "label": "Tipo de Tabaco", "type": "TEXT", "value": "" },
        { "key": "tobacco_amount", "label": "Cantidad y Frecuencia de Consumo", "type": "TEXT", "value": "" },
        { "key": "tobacco_period", "label": "Período de Consumo", "type": "TEXT", "value": "" },
        { "key": "tobacco_last", "label": "Fecha del Último consumo", "type": "TEXT", "value": "" },
        { "key": "vape", "label": "¿Consume cigarrillo electrónico?", "type": "TEXT", "value": "" },
        { "key": "vape_details", "label": "En caso afirmativo: cantidad, frecuencia y circunstancias", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "ALCOHOL_DROGAS",
      "title": "Alcohol – Drogas",
      "order": 9,
      "fields": [
        { "key": "alcohol", "label": "¿Toma Bebidas Alcohólicas?", "type": "TEXT", "value": "" },
        { "key": "marijuana", "label": "Marihuana", "type": "TEXT", "value": "" },
        { "key": "amphetamines", "label": "Anfetaminas", "type": "TEXT", "value": "" },
        { "key": "barbiturics", "label": "Barbitúricos", "type": "TEXT", "value": "" },
        { "key": "cocaine", "label": "Cocaína", "type": "TEXT", "value": "" },
        { "key": "lsd", "label": "LSD", "type": "TEXT", "value": "" },
        { "key": "stimulants", "label": "Estimulantes", "type": "TEXT", "value": "" },
        { "key": "other_drugs", "label": "Otras Drogas", "type": "TEXT", "value": "" },
        { "key": "treatment", "label": "Tratamiento por Consumo de Drogas / Alcohol", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "POLITICA",
      "title": "Política",
      "order": 10,
      "fields": [
        { "key": "pep", "label": "¿Es Persona Políticamente Expuesta (PEP)?", "type": "TEXT", "value": "" },
        { "key": "political_party", "label": "¿Participa en algún partido político?", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "SEGURIDAD",
      "title": "Seguridad",
      "order": 11,
      "fields": [
        { "key": "kidnapping", "label": "¿Ha sido Secuestrado o Recibido Amenazas?", "type": "TEXT", "value": "" },
        { "key": "armored_car", "label": "Auto Blindado", "type": "TEXT", "value": "" },
        { "key": "weapons", "label": "Portación / Tenencia de Armas", "type": "TEXT", "value": "" },
        { "key": "weapon_time", "label": "¿Hace cuánto tiempo las utiliza?", "type": "TEXT", "value": "" },
        { "key": "weapon_use", "label": "¿En qué circunstancia la porta?", "type": "TEXT", "value": "" },
        { "key": "weapon_reason", "label": "Razón de portación", "type": "TEXT", "value": "" },
        { "key": "weapon_type", "label": "Tipo de arma, calibre y modelo", "type": "TEXT", "value": "" },
        { "key": "weapon_fired", "label": "¿Utilizó o disparó el arma en alguna ocasión?", "type": "TEXT", "value": "" },
        { "key": "weapon_training", "label": "¿Ha recibido entrenamiento especial?", "type": "TEXT", "value": "" },
        { "key": "military", "label": "¿Ha pertenecido a alguna fuerza militar o política?", "type": "TEXT", "value": "" },
        { "key": "weapon_maintenance", "label": "Frecuencia de mantenimiento del arma", "type": "TEXT", "value": "" },
        { "key": "practice_place", "label": "Lugar de práctica", "type": "TEXT", "value": "" },
        { "key": "security_equipment", "label": "Equipo de seguridad utilizado", "type": "TEXT", "value": "" },
        { "key": "accidents_security", "label": "¿Ha tenido accidentes?", "type": "TEXT", "value": "" },
        { "key": "personal_guard", "label": "Custodia Personal", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "HISTORIA_SEGUROS",
      "title": "Historia de Seguros",
      "order": 12,
      "fields": [
        { "key": "insurance_date", "label": "Fecha", "type": "TEXT", "value": "" },
        { "key": "insurance_company", "label": "Compañía", "type": "TEXT", "value": "" },
        { "key": "insurance_amount", "label": "Monto", "type": "TEXT", "value": "" },
        { "key": "insurance_reason", "label": "Motivo del seguro", "type": "TEXT", "value": "" },
        { "key": "simultaneous_policy", "label": "¿Seguro de vida en otra compañía? Detallar", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "DETALLE_SEGURO",
      "title": "Detalle del seguro",
      "order": 13,
      "fields": [
        { "key": "insurance_object", "label": "Objeto del seguro", "type": "TEXT", "value": "" },
        { "key": "policy_holder", "label": "Tomador de la Póliza", "type": "TEXT", "value": "" },
        { "key": "policy_payer", "label": "Pagador de la Póliza", "type": "TEXT", "value": "" },
        { "key": "bank_name", "label": "Banco de origen de fondos", "type": "TEXT", "value": "" },
        { "key": "funds_origin", "label": "Origen de fondos", "type": "TEXT", "value": "" },
        { "key": "previous_rejected", "label": "¿Le han Rechazado alguna Solicitud anteriormente?", "type": "TEXT", "value": "" },
        { "key": "replaces_policy", "label": "¿Este Seguro Reemplaza una Póliza Actual?", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "INGRESOS",
      "title": "Ingresos",
      "order": 14,
      "fields": [
        { "key": "earned_income", "label": "Ingreso Ganado Anual", "type": "TEXT", "value": "" },
        { "key": "earned_concept", "label": "Concepto (Sueldo, Comisiones, Bonos, Honorarios) Detallar", "type": "TEXT", "value": "" },
        { "key": "unearned_income", "label": "Ingresos Anuales No Ganados (Inversiones)", "type": "TEXT", "value": "" },
        { "key": "unearned_concept", "label": "Concepto (Dividendos, Intereses, Rentas, etc.)", "type": "TEXT", "value": "" },
        { "key": "total_income", "label": "Ingreso Total Anual", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "ACTIVO_PERSONAL",
      "title": "Activo Personal",
      "order": 15,
      "fields": [
        { "key": "total_assets", "label": "Total Activo Personal", "type": "TEXT", "value": "" },
        { "key": "real_estate", "label": "Inmuebles / Bienes Raíces", "type": "TEXT", "value": "" },
        { "key": "cash_bank", "label": "Efectivo en banco", "type": "TEXT", "value": "" },
        { "key": "goods", "label": "Bienes (vehículos, embarcaciones, obras de arte, joyas, etc.)", "type": "TEXT", "value": "" },
        { "key": "society", "label": "Participación en Sociedades", "type": "TEXT", "value": "" },
        { "key": "stocks", "label": "Acciones y Bonos", "type": "TEXT", "value": "" },
        { "key": "other_assets", "label": "Otros Activos (Detalles)", "type": "TEXT", "value": "" },
        { "key": "receivables", "label": "Cuentas por Cobrar", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "PASIVO_PERSONAL",
      "title": "Pasivo Personal",
      "order": 16,
      "fields": [
        { "key": "total_liabilities", "label": "Total Pasivo Personal", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "FINANZAS_OTROS",
      "title": "Finanzas – Otros",
      "order": 17,
      "fields": [
        { "key": "banks", "label": "Bancos con los cuales opera", "type": "TEXT", "value": "" },
        { "key": "bank_relationship", "label": "Antigüedad", "type": "TEXT", "value": "" },
        { "key": "credit_cards", "label": "Tarjetas de crédito", "type": "TEXT", "value": "" },
        { "key": "bankruptcy", "label": "¿Está en Quiebra Comercial?", "type": "TEXT", "value": "" },
        { "key": "negative_history", "label": "Antecedentes comerciales negativos", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "HISTORIAL_MANEJO",
      "title": "Historial de Manejo",
      "order": 18,
      "fields": [
        { "key": "dui", "label": "Condena por DUI últimos 5 años", "type": "TEXT", "value": "" },
        { "key": "traffic", "label": "Infracciones de tránsito últimos 3 años", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "JUICIOS",
      "title": "Juicios",
      "order": 19,
      "fields": [
        { "key": "criminal_case", "label": "Juicio Penal", "type": "TEXT", "value": "" },
        { "key": "civil_case", "label": "Juicio Civil", "type": "TEXT", "value": "" },
        { "key": "commercial_case", "label": "Juicio Comercial", "type": "TEXT", "value": "" },
        { "key": "labor_case", "label": "Juicio Laboral", "type": "TEXT", "value": "" },
        { "key": "arrested", "label": "¿Ha sido Arrestado por algún Motivo? Detallar.", "type": "TEXT", "value": "" }
      ]
    },
    {
      "code": "COMENTARIOS",
      "title": "Ampliación o Comentarios Adicional",
      "order": 20,
      "fields": [
        { "key": "additional_comments", "label": "Comentarios adicionales", "type": "TEXT", "value": "" }
      ]
    }
  ]
}
```

---

### 6) Guardar reporte en backend
- Nodo: **HTTP Request**
- Método: `POST`
- URL:
```
{{ $json["backend_url"] }}/api/inspection-requests/{{ $json["inspection_request_id"] }}/report
```
- Auth: **Bearer Token** (credencial ALARA API Token)

---

## Resultado esperado
- Reporte completo guardado en DB
- PDF generado automáticamente
- Solicitud marcada como REALIZADA

---

Cuando termines, deja el workflow **en estado inactivo** (no auto-activar).
