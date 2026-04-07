import * as PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';

type InspectionRequestPayload = {
  id: bigint | number;
  request_number: string;
  responsible_name: string;
  responsible_phone?: string | null;
  responsible_email?: string | null;
  agent_name?: string | null;
  insured_amount?: any;
  has_amount_in_force: boolean;
  amount_in_force?: any;
  marital_status?: string | null;
  spouse_name?: string | null;
  interview_language?: string | null;
  client_notified?: boolean | null;
  comments?: string | null;
  status: string;
  requested_at: Date;
  insurer: { name: string };
  client: {
    first_name: string;
    last_name: string;
    id_type?: string | null;
    id_number?: string | null;
    dob?: Date | null;
    email?: string | null;
    phone_home?: string | null;
    phone_mobile?: string | null;
    phone_work?: string | null;
    address_line?: string | null;
    city?: string | null;
    country?: string | null;
    employer_name?: string | null;
    employer_tax_id?: string | null;
    profession?: string | null;
  };
};

type InspectionReportPayload = {
  inspection_request_id: bigint | number;
  summary?: string | null;
  additional_comments?: string | null;
  outcome: string;
  sections: {
    section_title: string;
    fields: { field_key?: string | null; field_label?: string | null; field_value?: string | null }[];
  }[];
};

export class PdfService {
  private brand = {
    primary: '#1D4F7C',
    accent: '#2CD4F8',
    dark: '#0f172a',
    muted: '#64748b',
  };

  private addHeader(doc: PDFKit.PDFDocument, title: string) {
    const logoPath = join(process.cwd(), '..', 'public', 'logo-width.png');

    doc.rect(0, 0, doc.page.width, 70).fill(this.brand.primary);
    doc.fillColor('white');
    if (existsSync(logoPath)) {
      doc.image(logoPath, 40, 18, { width: 140 });
    }
    doc.fontSize(18).text(title, 220, 24, { align: 'right' });
    doc.moveDown(2);
    doc.fillColor(this.brand.dark);
  }

  private addFooter(doc: PDFKit.PDFDocument) {
    const bottom = doc.page.height - 40;
    doc.strokeColor(this.brand.accent).lineWidth(1).moveTo(40, bottom).lineTo(doc.page.width - 40, bottom).stroke();
    doc
      .fontSize(9)
      .fillColor(this.brand.muted)
      .text('ALARA INSP, S.A. · Plataforma de Inspecciones VIP', 40, bottom + 8, {
        align: 'left',
      });
  }

  private addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc
      .fillColor(this.brand.primary)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title.toUpperCase(), { underline: false });
    doc.moveDown(0.6);
    doc.fillColor(this.brand.dark).fontSize(10).font('Helvetica');
  }

  private addKeyValue(doc: PDFKit.PDFDocument, label: string, value?: string | number | null) {
    doc
      .font('Helvetica-Bold')
      .fillColor(this.brand.muted)
      .text(`${label}: `, { continued: true });
    doc.font('Helvetica').fillColor(this.brand.dark).text(value ? String(value) : 'No disponible');
  }

  /** Alineado al formulario impreso «Reporte de Inspección VIP – ALARA INSP, S.A.» */
  private reportTemplate() {
    const affirmative =
      'Por favor ampliar respuesta (Si en caso de alguna o más fue positiva):';
    return [
      {
        title: 'Datos personales',
        fields: [
          { key: 'first_name', label: 'Nombres' },
          { key: 'last_name', label: 'Apellidos' },
          { key: 'marital_status', label: 'Estado Civil' },
          { key: 'dob', label: 'Fecha de Nacimiento' },
          { key: 'nationality', label: 'Nacionalidad' },
          { key: 'home_address', label: 'Domicilio' },
          { key: 'residence_time', label: 'Tiempo de residencia' },
          { key: 'foreign_residence', label: 'Residencia en el extranjero (Dónde / cuándo)' },
          { key: 'id_type', label: 'Tipo de documento' },
          { key: 'id_number', label: 'Número de documento' },
          { key: 'mobile', label: 'Celular' },
          { key: 'email', label: 'E-mail' },
          { key: 'spouse_name', label: 'Nombre del Cónyuge' },
          { key: 'children', label: 'Hijos' },
        ],
      },
      {
        title: 'Profesión – Actividad Laboral',
        fields: [
          { key: 'profession_studies', label: 'Profesión / Estudios Cursados' },
          { key: 'business_address', label: 'Domicilio Comercial' },
          { key: 'functions', label: 'Funciones' },
          { key: 'clients', label: 'Clientes' },
          { key: 'seniority', label: 'Antigüedad en la empresa' },
          { key: 'employees', label: 'Cantidad de Empleados' },
          { key: 'business_nature', label: 'Naturaleza del Negocio' },
          { key: 'employer', label: 'Empleador / Empresa' },
          { key: 'website', label: 'Sitio Web' },
          { key: 'occupation', label: 'Ocupación / Cargo' },
          { key: 'employee_or_partner', label: '¿Es empleado o socio?' },
          { key: 'other_occupation', label: 'Otra Ocupación Actual (describa)' },
          { key: 'company_start', label: 'Fecha de Creación de la Empresa' },
        ],
      },
      {
        title: 'Salud',
        fields: [
          { key: 'doctor_name', label: 'Nombre del Médico Personal' },
          { key: 'results', label: 'Resultados Obtenidos' },
          { key: 'weight', label: 'Peso (kg / lb)' },
          { key: 'weight_unit', label: 'kg / lb' },
          { key: 'height', label: 'Altura (cm / ft)' },
          { key: 'height_unit', label: 'cm / ft' },
          { key: 'weight_change', label: 'Cambio de Peso' },
          { key: 'medical_coverage', label: 'Cobertura Médica' },
          { key: 'studies', label: 'Estudios realizados' },
          { key: 'consultation_reason', label: 'Motivo de la Consulta' },
          { key: 'last_consult', label: 'Fecha Última Consulta Médica' },
          { key: 'doctor_contact', label: 'Nombre, Dirección del Médico Consultado' },
          { key: 'deafness', label: 'Sordera' },
          { key: 'blindness', label: 'Ceguera' },
          { key: 'physical_alterations', label: 'Alteraciones Físicas' },
          { key: 'amputations', label: 'Amputaciones' },
          { key: 'other_impediments', label: 'Otros Impedimentos' },
          { key: 'high_pressure', label: 'Alta Presión' },
          { key: 'diabetes', label: 'Diabetes' },
          { key: 'cancer', label: 'Cáncer' },
          { key: 'cardiac', label: 'Problemas Cardiacos' },
          { key: 'ulcer', label: 'Úlcera' },
          { key: 'surgeries', label: 'Cirugías / Fechas' },
          { key: 'important_diseases', label: 'Enfermedades Importantes / Fechas' },
          { key: 'prescribed_meds', label: 'Medicamentos con prescripción (Nombre y Dosis)' },
          { key: 'non_prescribed_meds', label: 'Medicamentos no recetados (Nombre y Dosis)' },
          { key: 'salud_detalle_respuesta_afirmativa', label: affirmative },
        ],
      },
      {
        title: 'Factores de riesgo en sus labores',
        fields: [
          { key: 'work_risk', label: '¿Está expuesto a algún riesgo por sus labores?' },
          { key: 'work_risk_desc', label: 'Descripción según Ocupación' },
          { key: 'safety_rules', label: '¿Hay Normas de Seguridad?' },
          { key: 'riesgos_laborales_detalle_respuesta_afirmativa', label: affirmative },
        ],
      },
      {
        title: 'Viajes',
        fields: [
          { key: 'travel_destination', label: 'Destino' },
          { key: 'travel_transport', label: 'Medio' },
          { key: 'travel_reason', label: 'Motivo' },
          { key: 'travel_frequency', label: 'Frecuencia' },
        ],
      },
      {
        title: 'Deportes de Riesgo',
        fields: [
          { key: 'diving', label: '¿Buceo?' },
          { key: 'racing', label: '¿Carrera de Vehículos?' },
          { key: 'ultralight', label: 'Aviones Ultraligeros' },
          { key: 'parachute', label: 'Paracaidismo' },
          { key: 'paragliding', label: 'Parapente' },
          { key: 'climbing', label: 'Escalamiento de montañas' },
          { key: 'other_risk', label: 'Otra Actividad de Riesgo (ampliar)' },
          { key: 'pilot', label: '¿Es Piloto de avión o Piloto Estudiante?' },
          {
            key: 'accidents',
            label:
              '¿Ha sufrido algún accidente o lesión practicando un deporte o actividad física? (En caso afirmativo, detallar circunstancias, fecha, lugar, secuelas)',
          },
          { key: 'accidents_detail', label: 'Tipo, frecuencia y cantidad' },
          { key: 'deportes_riesgo_detalle_respuesta_afirmativa', label: affirmative },
        ],
      },
      {
        title: 'Deportes',
        fields: [
          { key: 'sports_activity', label: 'Deporte o Actividad Física' },
          { key: 'sports_frequency', label: 'Frecuencia' },
          { key: 'sports_details', label: 'Detalles' },
        ],
      },
      {
        title: 'Tabaco',
        fields: [
          { key: 'smoker', label: '¿Es Fumador o utiliza algún tipo de tabaco?' },
          { key: 'tobacco_type', label: 'Tipo de Tabaco' },
          { key: 'tobacco_amount', label: 'Cantidad y Frecuencia de Consumo' },
          { key: 'tobacco_period', label: 'Período de consumo' },
          { key: 'tobacco_last', label: 'Fecha del Último consumo' },
          { key: 'vape', label: '¿Consume cigarrillo electrónico?' },
          { key: 'vape_details', label: 'Frecuencia: Detalles' },
        ],
      },
      {
        title: 'Alcohol – Drogas',
        fields: [
          { key: 'alcohol', label: '¿Toma Bebidas Alcohólicas?' },
          { key: 'marijuana', label: 'Marihuana' },
          { key: 'cocaine', label: 'Cocaína' },
          { key: 'lsd', label: 'LSD' },
          { key: 'amphetamines', label: 'Anfetaminas' },
          { key: 'stimulants', label: 'Estimulantes' },
          { key: 'barbiturics', label: 'Barbitúricos' },
          { key: 'other_drugs', label: 'Otras Drogas' },
          { key: 'treatment', label: 'Tratamiento por Consumo de Drogas / Alcohol' },
          { key: 'treatment_detail', label: 'Detalle del tratamiento (centro, fechas, etc.)' },
          { key: 'alcohol_drogas_detalle_respuesta_afirmativa', label: affirmative },
        ],
      },
      {
        title: 'Política',
        fields: [
          { key: 'pep', label: '¿Es PEP? (En caso de afirmativo dar detalles)' },
          { key: 'pep_detail', label: 'Detalle PEP (cargo, organismo, etc.)' },
          { key: 'political_party', label: '¿Participa en partido político? (En caso de afirmativo dar detalles)' },
          { key: 'political_party_detail', label: 'Detalle participación política' },
        ],
      },
      {
        title: 'Seguridad',
        fields: [
          { key: 'kidnapping', label: '¿Ha sido Secuestrado o Recibido Amenazas?' },
          { key: 'armored_car', label: 'Auto Blindado' },
          { key: 'weapons', label: 'Portación / Tenencia de Armas' },
          { key: 'weapon_time', label: '¿Hace cuánto tiempo las utiliza?' },
          { key: 'weapon_use', label: '¿En qué circunstancia la porta?' },
          { key: 'weapon_reason', label: 'Razón de portación' },
          { key: 'weapon_type', label: 'Tipo de arma, calibre y modelo' },
          { key: 'weapon_fired', label: '¿Utilizó o disparó el arma en alguna ocasión?' },
          { key: 'weapon_training', label: '¿Ha recibido entrenamiento especial?' },
          { key: 'weapon_training_detail', label: 'Entrenamiento especial (nombre y lugar)' },
          { key: 'military', label: '¿Ha pertenecido a fuerza militar / política? (detallar)' },
          { key: 'military_detail', label: 'Detalle fuerza militar / política' },
          { key: 'weapon_maintenance', label: 'Frecuencia de mantenimiento del arma' },
          { key: 'practice_place', label: 'Lugar de práctica' },
          { key: 'security_equipment', label: 'Equipo de seguridad utilizado' },
          { key: 'accidents_security', label: '¿Ha tenido accidentes?' },
          { key: 'personal_guard', label: 'Custodia personal (De ser afirmativo dar detalles)' },
          { key: 'seguridad_detalle_respuesta_afirmativa', label: affirmative },
        ],
      },
      {
        title: 'Historia de Seguros',
        fields: [
          { key: 'insurance_date', label: 'Fecha del seguro' },
          { key: 'insurance_company', label: 'Compañía' },
          { key: 'insurance_amount', label: 'Monto' },
          { key: 'insurance_reason', label: 'Motivo del seguro' },
          { key: 'simultaneous_policy', label: 'Seguro de vida en otra compañía (detallar)' },
        ],
      },
      {
        title: 'Detalle del seguro',
        fields: [
          { key: 'insurance_object', label: 'Objeto del seguro' },
          { key: 'policy_holder', label: 'Tomador de la Póliza' },
          { key: 'policy_payer', label: 'Pagador de la Póliza' },
          { key: 'bank_name', label: 'Banco de origen de fondos' },
          { key: 'funds_origin', label: 'Origen de fondos' },
          { key: 'previous_rejected', label: '¿Solicitud rechazada anteriormente?' },
          { key: 'previous_rejection_reason', label: 'Motivo del Rechazo' },
          { key: 'replaces_policy', label: '¿Reemplaza póliza actual?' },
        ],
      },
      {
        title: 'Ingresos',
        fields: [
          { key: 'earned_income', label: 'Ingreso Ganado Anual' },
          { key: 'earned_concept', label: 'Concepto (Sueldo, Comisiones, etc.)' },
          { key: 'unearned_income', label: 'Ingresos Anuales No Ganados' },
          { key: 'unearned_concept', label: 'Concepto (Dividendos, etc.)' },
          { key: 'total_income', label: 'Ingreso Total Anual' },
        ],
      },
      {
        title: 'Activo Personal',
        fields: [
          { key: 'total_assets', label: 'Total Activo Personal' },
          { key: 'real_estate', label: 'Inmuebles / Bienes Raíces' },
          { key: 'cash_bank', label: 'Efectivo en banco' },
          { key: 'goods', label: 'Bienes (vehículos, arte, etc.)' },
          { key: 'society', label: 'Participación en Sociedades' },
          { key: 'stocks', label: 'Acciones y Bonos' },
          { key: 'other_assets', label: 'Otros Activos (Detalles)' },
          { key: 'receivables', label: 'Cuentas por Cobrar' },
        ],
      },
      {
        title: 'Pasivo Personal',
        fields: [{ key: 'total_liabilities', label: 'Total Pasivo Personal' }],
      },
      {
        title: 'Finanzas – Otros',
        fields: [
          { key: 'banks', label: 'Bancos con los cuales opera' },
          { key: 'bank_relationship', label: 'Antigüedad' },
          { key: 'credit_cards', label: 'Tarjetas de crédito' },
          { key: 'bankruptcy', label: '¿Está en Quiebra Comercial?' },
          { key: 'negative_history', label: 'Antecedentes comerciales negativos' },
        ],
      },
      {
        title: 'Historial de Manejo',
        fields: [
          { key: 'dui', label: 'Condenas en los últimos 5 años' },
          { key: 'traffic', label: 'Infracciones de tránsito últimos 3 años' },
        ],
      },
      {
        title: 'Juicios - Pasados o Presentes',
        fields: [
          { key: 'criminal_case', label: 'Juicio Penal' },
          { key: 'civil_case', label: 'Juicio Civil' },
          { key: 'commercial_case', label: 'Juicio Comercial' },
          { key: 'labor_case', label: 'Juicio Laboral' },
          { key: 'juicios_detalle_respuesta_afirmativa', label: affirmative },
          { key: 'arrested', label: '¿Ha sido Arrestado? Detallar' },
        ],
      },
      {
        title: 'Ampliación o Comentarios Adicional',
        fields: [{ key: 'additional_comments', label: 'Nota' }],
      },
      {
        title: 'Información complementaria',
        fields: [
          { key: 'informacion_complementaria', label: 'Amplíe aquí' },
          { key: 'informacion_medica', label: 'Información Médica (TMU)' },
        ],
      },
    ];
  }

  async buildRequestPdf(request: InspectionRequestPayload): Promise<Buffer> {
    const doc = new (PDFDocument as any)({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    this.addHeader(doc, 'Solicitud de Inspección VIP');

    doc.fontSize(10).fillColor(this.brand.dark).font('Helvetica');
    this.addKeyValue(doc, 'Número de solicitud', request.request_number);
    this.addKeyValue(doc, 'Aseguradora', request.insurer.name);
    this.addKeyValue(doc, 'Estado', request.status);
    this.addKeyValue(doc, 'Fecha', request.requested_at.toISOString().split('T')[0]);
    doc.moveDown();

    this.addSectionTitle(doc, 'Responsable del pedido');
    this.addKeyValue(doc, 'Responsable', request.responsible_name);
    if (request.responsible_phone) this.addKeyValue(doc, 'Teléfono responsable', request.responsible_phone);
    if (request.responsible_email) this.addKeyValue(doc, 'Email responsable', request.responsible_email);

    this.addSectionTitle(doc, 'Datos de la solicitud');
    this.addKeyValue(doc, 'Número de solicitud', request.request_number);
    if (request.agent_name) this.addKeyValue(doc, 'Agente', request.agent_name);
    if (request.insured_amount !== null && request.insured_amount !== undefined) {
      this.addKeyValue(doc, 'Monto asegurado', request.insured_amount.toString());
    }
    this.addKeyValue(doc, 'Monto vigente', request.has_amount_in_force ? 'Sí' : 'No');
    if (request.has_amount_in_force && request.amount_in_force != null && request.amount_in_force !== '') {
      this.addKeyValue(doc, 'Monto en vigencia', String(request.amount_in_force));
    }
    this.addKeyValue(doc, 'Estado civil', request.marital_status ?? null);
    if (request.marital_status === 'Casado' || request.marital_status === 'Unido') {
      this.addKeyValue(doc, 'Nombre del cónyuge', request.spouse_name ?? null);
    }
    this.addKeyValue(doc, 'Idioma entrevista', request.interview_language ?? null);
    this.addKeyValue(doc, 'Cliente avisado', request.client_notified ? 'Sí' : 'No');

    this.addSectionTitle(doc, 'Datos del cliente');
    this.addKeyValue(doc, 'Nombres', request.client.first_name);
    this.addKeyValue(doc, 'Apellidos', request.client.last_name);
    this.addKeyValue(doc, 'Fecha de nacimiento', request.client.dob ? request.client.dob.toISOString().split('T')[0] : null);
    if (request.client.id_type && request.client.id_number) {
      this.addKeyValue(doc, 'Documento', `${request.client.id_type} ${request.client.id_number}`);
    }
    this.addKeyValue(doc, 'Email', request.client.email ?? null);
    this.addKeyValue(doc, 'Teléfono residencial', request.client.phone_home ?? null);
    this.addKeyValue(doc, 'Teléfono celular', request.client.phone_mobile ?? null);
    this.addKeyValue(doc, 'Teléfono laboral', request.client.phone_work ?? null);
    this.addKeyValue(doc, 'Dirección', request.client.address_line ?? null);
    this.addKeyValue(doc, 'Ciudad', request.client.city ?? null);
    this.addKeyValue(doc, 'País', request.client.country ?? null);
    this.addKeyValue(doc, 'Empresa/Empleador', request.client.employer_name ?? null);
    this.addKeyValue(doc, 'Profesión/Ocupación', request.client.profession ?? null);

    this.addSectionTitle(doc, 'Indicaciones / Comentarios');
    this.addKeyValue(doc, 'Comentarios', request.comments ?? null);

    this.addFooter(doc);

    doc.end();

    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

  async buildReportPdf(request: InspectionRequestPayload, report?: InspectionReportPayload | null): Promise<Buffer> {
    const doc = new (PDFDocument as any)({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    this.addHeader(doc, 'Reporte de Inspección VIP · ALARA INSP, S.A.');

    doc
      .fontSize(8)
      .fillColor(this.brand.muted)
      .font('Helvetica')
      .text('Gracias por confiar en nosotros · Entrevista seguro de personas', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(this.brand.dark).font('Helvetica');
    this.addKeyValue(doc, 'Solicitud', request.request_number);
    this.addKeyValue(doc, 'Aseguradora', request.insurer.name);
    this.addKeyValue(doc, 'Cliente', `${request.client.first_name} ${request.client.last_name}`);
    this.addKeyValue(doc, 'Estado', request.status);
    doc.moveDown();

    if (!report) {
      doc.text('Reporte aún no disponible.');
      this.addFooter(doc);
      doc.end();
      await new Promise<void>((resolve) => doc.on('end', () => resolve()));
      return Buffer.concat(chunks);
    }

    this.addSectionTitle(doc, 'Resultado');
    doc.fillColor(this.brand.primary).fontSize(11).font('Helvetica-Bold').text(`Resultado: ${report.outcome}`);
    doc.fillColor(this.brand.dark).fontSize(10).font('Helvetica');
    if (report.summary) {
      doc.moveDown();
      this.addKeyValue(doc, 'Resumen', report.summary);
    }
    if (report.additional_comments) {
      doc.moveDown();
      this.addKeyValue(doc, 'Comentarios adicionales', report.additional_comments);
    }

    const valuesByKey = new Map<string, string>();
    const valuesByLabel = new Map<string, string>();

    report.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.field_key) {
          valuesByKey.set(field.field_key, field.field_value ?? '');
        }
        if (field.field_label) {
          valuesByLabel.set(field.field_label, field.field_value ?? '');
        }
      });
    });

    this.reportTemplate().forEach((section) => {
      doc.moveDown();
      if (section.title?.trim()) {
        this.addSectionTitle(doc, section.title);
      }
      section.fields.forEach((field) => {
        const value = valuesByKey.get(field.key) ?? valuesByLabel.get(field.label) ?? '';
        this.addKeyValue(doc, field.label, value);
      });
    });

    doc.moveDown();
    doc
      .fontSize(8)
      .fillColor(this.brand.muted)
      .font('Helvetica')
      .text(
        'Nota: El presente reporte es para uso exclusivo de la compañía de seguros solicitante y no debe ser exhibido a terceros, ni en su totalidad ni en ninguna de sus partes.',
        { align: 'left' },
      );

    this.addFooter(doc);
    doc.end();

    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
