
# ALARA INSP, S.A. – Plataforma de Gestión de Inspecciones VIP para Aseguradoras
**Documento de especificación funcional y técnica (insumo para Cursor / equipo de desarrollo)**

---

## 0) Visión General

ALARA INSP, S.A. brindará a las aseguradoras un **servicio digital de solicitud, coordinación, ejecución y documentación de inspecciones VIP** (entrevistas y verificaciones).  
La plataforma será un **sistema web centralizado** que permita:

- Aseguradoras: crear y dar seguimiento a **Solicitudes de Inspección**.
- ALARA INSP: **agendar, ejecutar entrevistas por llamada**, documentar hallazgos y emitir **Reportes de Inspección**.
- Ambos: consultar un **expediente digital del cliente**, dashboards y notificaciones.

El sistema se integrará con:
- **Google Calendar** (agendas).
- **n8n** (workflow de entrevistas y captura de datos por webhook).
- Servicios de notificación (email / WhatsApp / SMS).

---

## 1) Objetivos del sistema

1. Digitalizar completamente el ciclo de vida de una inspección VIP.
2. Centralizar información sensible en expedientes estructurados.
3. Optimizar tiempos de respuesta entre aseguradoras y ALARA INSP.
4. Facilitar la captura guiada de datos durante entrevistas.
5. Proveer trazabilidad, control de calidad y métricas de desempeño.

---

## 2) Roles y permisos

### 2.1 Usuarios de Aseguradoras
- Crear solicitudes de inspección.
- Consultar estado de solicitudes.
- Visualizar expedientes.
- Descargar PDFs (solicitud, reportes, anexos).
- Acceder a dashboards.
- Recibir notificaciones.

### 2.2 Usuarios de ALARA INSP
- Recibir solicitudes.
- Gestionar agenda y calendario.
- Ejecutar entrevistas.
- Generar reportes de inspección.
- Adjuntar investigaciones y documentos.
- Cambiar estados.
- Acceder a dashboards operativos.

### 2.3 Administrador del sistema
- Gestión de usuarios, aseguradoras, permisos.
- Catálogos (estados, tipos, investigadores).
- Plantillas de documentos.
- Configuración de integraciones.
- Auditoría y bitácoras.

---

## 3) Estados de una Solicitud de Inspección

- SOLICITADA  
- AGENDADA  
- REALIZADA  
- CANCELADA  
- APROBADA  
- RECHAZADA  

Transiciones controladas por workflow.

---

## 4) Módulos del sistema

1. Portal Aseguradoras  
2. Portal ALARA INSP  
3. Gestión de Solicitudes de Inspección  
4. Agenda y Calendario  
5. Ejecución de Inspección (workflow n8n)  
6. Expediente Digital  
7. Dashboards y KPIs  
8. Gestión Documental  
9. Notificaciones  
10. Administración  

---

# 5) Módulo: Portal de Aseguradoras

## Funcionalidades

- Crear Solicitud de Inspección (formulario digital).
- Tabla de solicitudes con filtros:
  - Estado, fecha, asegurado, número de solicitud.
- Vista calendario de inspecciones.
- Vista expediente por cliente.
- Descarga de documentos.
- Dashboard ejecutivo.

## Dashboard sugerido

- Total de inspecciones.
- Por estado.
- Tendencia mensual.
- Tiempo promedio por etapa.
- Inspecciones por aseguradora.
- SLA de atención.

---

# 6) Módulo: Portal ALARA INSP

## Funcionalidades

- Bandeja de solicitudes entrantes.
- Agenda y planificación.
- Sincronización Google Calendar.
- Lanzar entrevista (n8n).
- Captura y validación de datos.
- Generación de reporte.
- Gestión de estados.
- Dashboard operativo.

---

# 7) Módulo: Solicitud de Inspección

## Datos base (según PDF)

- Responsable del pedido  
- Teléfono responsable  
- Email responsable  
- Nombres y apellidos del propuesto asegurado  
- Número de solicitud  
- Nombre del agente  
- Monto asegurado  
- Monto vigente (Sí/No)  
- Dirección / Ciudad / País  
- Fecha de nacimiento  
- Documento de identidad  
- Empresa / empleador  
- RUC / NIT / CUIT  
- Profesión  
- Tareas  
- Teléfonos (residencial, laboral, celular)  
- Email  
- Estado civil  
- Indicaciones / comentarios  
- Confirmación de aviso al cliente  
- Idioma entrevista  
- Adjuntos (autorizaciones, documentos)

Cada solicitud debe poder exportarse automáticamente a **PDF**.

---

# 8) Módulo: Agenda y Calendario

- Calendario central.
- Bloques por investigador.
- Estados visuales por inspección.
- Sincronización bidireccional con Google Calendar.
- Recordatorios automáticos.

---

# 9) Módulo: Ejecución de Inspección (n8n)

## Flujo propuesto

1. Usuario ALARA abre inspección.
2. Lanza webhook hacia n8n.
3. n8n inicia workflow:
   - Registro de inicio.
   - Integración con sistema de llamadas.
   - Formulario guiado de entrevista.
4. Cada sección del reporte se captura como bloques estructurados.
5. n8n devuelve payload completo.
6. Sistema:
   - Guarda datos.
   - Genera PDF.
   - Cambia estado a REALIZADA.
   - Notifica a aseguradora.

## Secciones del reporte

- Datos personales.
- Profesión y actividad laboral.
- Salud.
- Factores de riesgo.
- Viajes.
- Deportes.
- Tabaco.
- Alcohol y drogas.
- Política.
- Seguridad.
- Historia de seguros.
- Finanzas.
- Juicios.
- Comentarios.
- Indagaciones adicionales.

---

# 10) Módulo: Expediente Digital

Cada solicitud genera un expediente que incluye:

- Datos del cliente.
- Solicitud de inspección (PDF).
- Reporte de inspección (PDF).
- Evidencias.
- Investigaciones externas.
- Bitácora completa.
- Línea de tiempo.

---

# 11) Gestión documental

- Versionado.
- Hash de integridad.
- Control de accesos.
- Plantillas PDF.
- Descarga segura.

---

# 12) Notificaciones

Eventos clave:

- Nueva solicitud → ALARA INSP.
- Inspección agendada → Aseguradora.
- Inicio de entrevista.
- Reporte registrado → Aseguradora.
- Cambio de estado.
- Recordatorios automáticos.

---

# 13) Dashboards y KPIs

## Aseguradoras

- Total de solicitudes.
- Por estado.
- Tiempos promedio.
- Tendencias.
- Historial por cliente.

## ALARA INSP

- Inspecciones por investigador.
- Productividad.
- SLA.
- Tiempo promedio por llamada.
- Embudo de solicitudes.

---

# 14) Arquitectura recomendada

Frontend: React / Next.js  
Backend: FastAPI / Node  
Base de datos: PostgreSQL  
Documentos: Object storage S3 compatible  
Integraciones: n8n, Google Calendar, mensajería  

---

# 15) Seguridad

- Autenticación JWT/OAuth.
- Roles estrictos.
- Encriptación.
- Auditoría.
- Aislamiento por aseguradora.

---

# 16) Prompt maestro para Cursor

Eres un arquitecto y desarrollador senior. Construye el proyecto:
“ALARA INSP – Sistema de Gestión de Inspecciones VIP para Aseguradoras”.

Incluye:
- Workflow de estados.
- Expediente digital.
- Calendario visual.
- Integración webhook n8n.
- Generador de PDF.
- Dashboards.

---

Documento diseñado como base funcional y técnica.

---

# 18) Reglas de negocio y permisos (OBLIGATORIO)

## 18.1 Tenancy / Aislamiento por aseguradora
- Un usuario **INSURER** solo puede:
  - Ver, crear y consultar información de solicitudes donde `inspection_requests.insurer_id = user.insurer_id`.
  - Ver expedientes/documentos asociados a esas solicitudes.
- Un usuario **ALARA** puede:
  - Ver solicitudes de todas las aseguradoras (o, si se decide, restringido por oficina/territorio/equipo).
- Regla técnica recomendada:
  - **Siempre** filtrar por `insurer_id` en consultas del portal aseguradora.
  - Validar en backend (no solo en UI).

## 18.2 Aprobación / Rechazo es decisión de la aseguradora
- Solo usuarios **INSURER** pueden cambiar el estado final a:
  - `APROBADA` o `RECHAZADA`.
- La decisión debe registrar (mínimo):
  - `insurer_decision` (APROBADA/RECHAZADA)
  - `insurer_decided_by_user_id`
  - `insurer_decided_at`
  - `insurer_decision_reason` y/o `insurer_decision_notes`
- Usuarios **ALARA** pueden:
  - Agendar (`AGENDADA`)
  - Ejecutar entrevista y registrar reporte (`REALIZADA`)
  - Adjuntar investigaciones y evidencias
  - **Pero NO** pueden decidir aprobación/rechazo final.

## 18.3 Flujo recomendado de estados (simple y controlado)
- **Creación por aseguradora:** `SOLICITADA`
- **Agenda por ALARA:** `AGENDADA`
- **Reporte por ALARA:** `REALIZADA`
- **Decisión por aseguradora:** `APROBADA` o `RECHAZADA`
- **Cancelación:** puede ocurrir desde `SOLICITADA` o `AGENDADA` (según permisos definidos), registrando `cancellation_reason`.
- Reglas:
  - Cada transición debe quedar en una **bitácora/historial de estados** (quién, cuándo, nota).
  - No permitir saltos inválidos (ej.: `SOLICITADA` → `APROBADA` sin `REALIZADA`, a menos que la aseguradora tenga un caso especial).

---

# 19) Recomendación: Soft Delete (sí, es recomendable)

Para este tipo de sistema (datos sensibles, trazabilidad, auditorías y potenciales disputas), **sí es recomendable usar Soft Delete**, porque:

- Mantienes **evidencia histórica** (qué existió, quién lo creó, cuándo se adjuntó un documento, etc.).
- Facilita auditorías internas/externas y soporte (recuperación ante borrados accidentales).
- Evitas “huecos” en reportes y métricas.
- Es compatible con políticas de retención/expurgo (puedes hacer hard delete controlado por jobs al cumplir retención legal).

## 19.1 Implementación sugerida
Agregar en tablas principales:
- `deleted_at DATETIME NULL`
- `deleted_by_user_id BIGINT UNSIGNED NULL`

Y reglas:
- En consultas normales, filtrar `deleted_at IS NULL`.
- Para expedientes/documentos, preferir:
  - “Eliminar” = marcar `deleted_at`
  - “Restaurar” = limpiar `deleted_at`
- Para cumplimiento:
  - Job mensual/trimestral que haga hard delete **solo** si la política lo permite (p.ej. > 5 años).

Tablas típicas para Soft Delete:
- `inspection_requests`, `inspection_reports`, `documents`, `investigations`, `calendar_events`, `clients` (según política).

