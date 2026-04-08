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
    primaryDeep: '#163a5c',
    accent: '#2CD4F8',
    dark: '#0f172a',
    muted: '#64748b',
  };

  private readonly pdfLayout = {
    margin: 40,
    footerReserve: 52,
    colGap: 20,
  };

  /** Colores cuerpo reporte (especificación ALARA). */
  private readonly reportColors = {
    sectionBg: '#1440AA',
    sectionAccent: '#48D9FD',
    valueBoxBg: '#E8F4FC',
  };

  /** Layout PDF reporte con cabecera/pie en imagen (A4). */
  private reportPdfLayoutMode = false;
  private reportHeaderDrawH = 0;
  private reportFooterDrawH = 0;
  private reportContentTopY = 0;
  private reportContentMargin = 40;

  private resolveReportAsset(filename: string): string | null {
    const candidates = [
      join(__dirname, '..', '..', 'assets', 'report', filename),
      join(process.cwd(), 'assets', 'report', filename),
      join(process.cwd(), filename),
      join(process.cwd(), '..', filename),
      join(__dirname, '..', '..', '..', filename),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return null;
  }

  private registerReportFontsForDoc(doc: PDFKit.PDFDocument) {
    const dir = join(__dirname, '..', '..', 'assets', 'fonts');
    const montserrat = join(dir, 'Montserrat-Bold.ttf');
    const openBold = join(dir, 'OpenSans-Bold.ttf');
    const openReg = join(dir, 'OpenSans-Regular.ttf');
    try {
      if (existsSync(montserrat)) doc.registerFont('ReportTitle', montserrat);
      else doc.registerFont('ReportTitle', 'Helvetica-Bold');
    } catch {
      doc.registerFont('ReportTitle', 'Helvetica-Bold');
    }
    try {
      if (existsSync(openBold)) doc.registerFont('ReportLabel', openBold);
      else doc.registerFont('ReportLabel', 'Helvetica-Bold');
    } catch {
      doc.registerFont('ReportLabel', 'Helvetica-Bold');
    }
    try {
      if (existsSync(openReg)) doc.registerFont('ReportValue', openReg);
      else doc.registerFont('ReportValue', 'Helvetica');
    } catch {
      doc.registerFont('ReportValue', 'Helvetica');
    }
  }

  private computeImageDrawHeight(doc: PDFKit.PDFDocument, imagePath: string, targetWidth: number): number {
    const im = (doc as any).openImage(imagePath);
    return (im.height / im.width) * targetWidth;
  }

  private drawReportChrome(doc: PDFKit.PDFDocument, headerPath: string | null, footerPath: string | null) {
    const w = doc.page.width;
    if (headerPath) {
      doc.image(headerPath, 0, 0, { width: w });
    }
    if (footerPath) {
      const fh = this.reportFooterDrawH;
      doc.image(footerPath, 0, doc.page.height - fh, { width: w });
    }
    doc.x = this.reportContentMargin;
    doc.y = this.reportContentTopY;
  }

  /** Barra de título: franja #48D9FD + fondo #1440AA, Montserrat 12 negrita blanco. */
  private drawReportSectionBar(doc: PDFKit.PDFDocument, x: number, y: number, width: number, title: string): number {
    const accentW = 6;
    const padV = 7;
    const text = title.toUpperCase();
    doc.font('ReportTitle').fontSize(12);
    const textPadLeft = x + accentW + 10;
    const textWidth = width - accentW - 20;
    const textH = doc.heightOfString(text, { width: textWidth, lineGap: 1 });
    const barH = Math.max(26, textH + padV * 2);
    doc.save();
    doc.rect(x, y, accentW, barH).fill(this.reportColors.sectionAccent);
    doc.rect(x + accentW, y, width - accentW, barH).fill(this.reportColors.sectionBg);
    doc.fillColor('#ffffff').font('ReportTitle').fontSize(12);
    doc.text(text, textPadLeft, y + padV, { width: textWidth, lineGap: 1 });
    doc.restore();
    doc.fillColor('#0f172a');
    return barH;
  }

  /** Open Sans 10 negrita etiqueta + caja valor #E8F4FC, valor en Regular 10. */
  private heightOfReportFieldCell(doc: PDFKit.PDFDocument, label: string, value: string, width: number): number {
    const pad = 6;
    doc.font('ReportLabel').fontSize(10).fillColor('#000000');
    const labelLine = `${label}:`;
    const lh = doc.heightOfString(labelLine, { width });
    const display = value.trim() ? value : '—';
    doc.font('ReportValue').fontSize(10);
    const innerW = width - pad * 2;
    const valueH = doc.heightOfString(display, { width: innerW, lineGap: 2 });
    const boxH = Math.max(valueH + pad * 2, 24);
    return lh + 4 + boxH + 8;
  }

  private drawReportFieldCell(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
  ): number {
    const pad = 6;
    doc.font('ReportLabel').fontSize(10).fillColor('#000000');
    const labelLine = `${label}:`;
    doc.text(labelLine, x, y, { width });
    const lh = doc.heightOfString(labelLine, { width });
    const display = value.trim() ? value : '—';
    doc.font('ReportValue').fontSize(10);
    const innerW = width - pad * 2;
    const valueH = doc.heightOfString(display, { width: innerW, lineGap: 2 });
    const boxH = Math.max(valueH + pad * 2, 24);
    const boxY = y + lh + 4;
    doc.save();
    doc.roundedRect(x, boxY, width, boxH, 3).fill(this.reportColors.valueBoxBg);
    doc.fillColor('#0f172a').font('ReportValue').fontSize(10).text(display, x + pad, boxY + pad, {
      width: innerW,
      lineGap: 2,
    });
    doc.restore();
    return lh + 4 + boxH + 8;
  }

  private ensureReportPageSpace(doc: PDFKit.PDFDocument, currentY: number, blockHeight: number): number {
    const limit = doc.page.height - this.reportFooterDrawH - 16;
    if (currentY + blockHeight > limit) {
      doc.addPage();
      return this.reportContentTopY;
    }
    return currentY;
  }

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

  private outcomeLabel(code: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      FAVORABLE: 'Favorable',
      NO_FAVORABLE: 'No favorable',
      INCONCLUSO: 'Inconcluso',
    };
    return map[code] ?? code;
  }

  /** Campos largos a ancho completo, alineados al formulario web (details-wide). */
  private isPdfFullWidthField(key: string): boolean {
    if (key.endsWith('_detalle_respuesta_afirmativa')) return true;
    if (key === 'informacion_medica' || key === 'informacion_complementaria') return true;
    const wide = new Set([
      'foreign_residence',
      'functions',
      'other_occupation',
      'results',
      'studies',
      'consultation_reason',
      'surgeries',
      'important_diseases',
      'prescribed_meds',
      'non_prescribed_meds',
      'work_risk_desc',
      'other_risk',
      'accidents',
      'accidents_detail',
      'sports_details',
      'vape_details',
      'treatment_detail',
      'pep_detail',
      'political_party_detail',
      'weapon_training_detail',
      'military_detail',
      'insurance_reason',
      'simultaneous_policy',
      'funds_origin',
      'earned_concept',
      'unearned_concept',
      'goods',
      'other_assets',
      'negative_history',
      'dui',
      'traffic',
      'arrested',
      'additional_comments',
    ]);
    return wide.has(key);
  }

  private resolveFieldValue(
    field: { key: string; label: string },
    valuesByKey: Map<string, string>,
    valuesByLabel: Map<string, string>,
  ): string {
    let v = valuesByKey.get(field.key) ?? valuesByLabel.get(field.label) ?? '';
    if (field.key === 'weight') {
      const u = valuesByKey.get('weight_unit') ?? '';
      const n = v.trim();
      if (n && u) return `${n} ${u}`.trim();
    }
    if (field.key === 'height') {
      const u = valuesByKey.get('height_unit') ?? '';
      const n = v.trim();
      if (n && u) return `${n} ${u}`.trim();
    }
    return v;
  }

  private heightOfFieldCell(doc: PDFKit.PDFDocument, label: string, value: string, width: number): number {
    doc.font('Helvetica').fontSize(8).fillColor(this.brand.muted);
    const h1 = doc.heightOfString(label, { width });
    const display = value.trim() ? value : '—';
    doc.font('Helvetica').fontSize(9).fillColor(this.brand.dark);
    const h2 = doc.heightOfString(display, { width });
    return h1 + 3 + h2 + 6;
  }

  private drawFieldCell(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
  ): number {
    doc.font('Helvetica').fontSize(8).fillColor(this.brand.muted).text(label, x, y, { width });
    const h1 = doc.heightOfString(label, { width });
    const display = value.trim() ? value : '—';
    doc.font('Helvetica').fontSize(9).fillColor(this.brand.dark).text(display, x, y + h1 + 3, { width });
    const h2 = doc.heightOfString(display, { width });
    return h1 + 3 + h2 + 6;
  }

  private ensurePageSpace(doc: PDFKit.PDFDocument, currentY: number, blockHeight: number): number {
    if (this.reportPdfLayoutMode) {
      return this.ensureReportPageSpace(doc, currentY, blockHeight);
    }
    const { margin, footerReserve } = this.pdfLayout;
    const limit = doc.page.height - footerReserve;
    if (currentY + blockHeight > limit) {
      doc.addPage();
      doc.x = margin;
      return margin;
    }
    return currentY;
  }

  /** Secciones del cuerpo en 2 columnas (como .report-form-grid en el front). */
  private renderTemplateSection(
    doc: PDFKit.PDFDocument,
    section: { title: string; fields: { key: string; label: string }[] },
    valuesByKey: Map<string, string>,
    valuesByLabel: Map<string, string>,
    reportStyled = false,
  ) {
    const margin = reportStyled ? this.reportContentMargin : this.pdfLayout.margin;
    const colGap = this.pdfLayout.colGap;
    const usableW = doc.page.width - margin * 2;
    const colW = (usableW - colGap) / 2;
    const skip = new Set(['weight_unit', 'height_unit']);
    const fields = section.fields.filter((f) => !skip.has(f.key));

    let y = doc.y;
    if (section.title?.trim()) {
      if (reportStyled) {
        doc.font('ReportTitle').fontSize(12);
        const th = doc.heightOfString(section.title.toUpperCase(), { width: usableW - 26, lineGap: 1 });
        const barGuess = Math.max(26, th + 14);
        y = this.ensurePageSpace(doc, y, barGuess + 12);
        const barH = this.drawReportSectionBar(doc, margin, y, usableW, section.title);
        y += barH + 10;
        doc.y = y;
        doc.x = margin;
      } else {
        y = this.ensurePageSpace(doc, y, 28);
        doc.y = y;
        this.addSectionTitle(doc, section.title);
        y = doc.y;
      }
    }

    let i = 0;
    while (i < fields.length) {
      const f = fields[i];
      const full = this.isPdfFullWidthField(f.key);
      if (full) {
        const value = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
        const h = reportStyled
          ? this.heightOfReportFieldCell(doc, f.label, value, usableW)
          : this.heightOfFieldCell(doc, f.label, value, usableW);
        y = this.ensurePageSpace(doc, y, h);
        doc.y = y;
        doc.x = margin;
        if (reportStyled) {
          this.drawReportFieldCell(doc, margin, y, usableW, f.label, value);
        } else {
          this.drawFieldCell(doc, margin, y, usableW, f.label, value);
        }
        y = y + h;
        doc.y = y;
        doc.x = margin;
        i += 1;
        continue;
      }

      const f2 = fields[i + 1];
      if (f2 && !this.isPdfFullWidthField(f2.key)) {
        const v1 = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
        const v2 = this.resolveFieldValue(f2, valuesByKey, valuesByLabel);
        const h1 = reportStyled
          ? this.heightOfReportFieldCell(doc, f.label, v1, colW)
          : this.heightOfFieldCell(doc, f.label, v1, colW);
        const h2 = reportStyled
          ? this.heightOfReportFieldCell(doc, f2.label, v2, colW)
          : this.heightOfFieldCell(doc, f2.label, v2, colW);
        const rowH = Math.max(h1, h2);
        y = this.ensurePageSpace(doc, y, rowH);
        doc.x = margin;
        if (reportStyled) {
          this.drawReportFieldCell(doc, margin, y, colW, f.label, v1);
          this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, f2.label, v2);
        } else {
          this.drawFieldCell(doc, margin, y, colW, f.label, v1);
          this.drawFieldCell(doc, margin + colW + colGap, y, colW, f2.label, v2);
        }
        y += rowH;
        doc.y = y;
        doc.x = margin;
        i += 2;
      } else {
        const value = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
        const h = reportStyled
          ? this.heightOfReportFieldCell(doc, f.label, value, colW)
          : this.heightOfFieldCell(doc, f.label, value, colW);
        y = this.ensurePageSpace(doc, y, h);
        doc.x = margin;
        if (reportStyled) {
          this.drawReportFieldCell(doc, margin, y, colW, f.label, value);
        } else {
          this.drawFieldCell(doc, margin, y, colW, f.label, value);
        }
        y += h;
        doc.y = y;
        doc.x = margin;
        i += 1;
      }
    }
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
    const doc = new (PDFDocument as any)({ margin: 0, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const headerPath = this.resolveReportAsset('cabeceraReporte.jpg');
    const footerPath = this.resolveReportAsset('pieReporte.jpg');
    const pageW = doc.page.width;

    this.registerReportFontsForDoc(doc);

    if (headerPath) {
      this.reportHeaderDrawH = this.computeImageDrawHeight(doc, headerPath, pageW);
    } else {
      this.reportHeaderDrawH = 0;
    }
    if (footerPath) {
      this.reportFooterDrawH = this.computeImageDrawHeight(doc, footerPath, pageW);
    } else {
      this.reportFooterDrawH = this.pdfLayout.footerReserve;
    }

    this.reportContentMargin = 40;
    this.reportContentTopY = this.reportHeaderDrawH + (this.reportHeaderDrawH > 0 ? 14 : 24);
    this.reportPdfLayoutMode = true;

    const drawChrome = () => {
      this.drawReportChrome(doc, headerPath, footerPath);
    };
    doc.on('pageAdded', drawChrome);
    drawChrome();

    const { colGap, footerReserve } = this.pdfLayout;
    const margin = this.reportContentMargin;
    const usableW = pageW - margin * 2;
    const colW = (usableW - colGap) / 2;

    let y = doc.y;
    const metaRow1H = Math.max(
      this.heightOfReportFieldCell(doc, 'Solicitud', request.request_number, colW),
      this.heightOfReportFieldCell(doc, 'Aseguradora', request.insurer.name, colW),
    );
    y = this.ensurePageSpace(doc, y, metaRow1H);
    this.drawReportFieldCell(doc, margin, y, colW, 'Solicitud', request.request_number);
    this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, 'Aseguradora', request.insurer.name);
    y += metaRow1H;

    const clientName = `${request.client.first_name} ${request.client.last_name}`.trim();
    const metaRow2H = Math.max(
      this.heightOfReportFieldCell(doc, 'Cliente', clientName, colW),
      this.heightOfReportFieldCell(doc, 'Estado', request.status, colW),
    );
    y = this.ensurePageSpace(doc, y, metaRow2H);
    this.drawReportFieldCell(doc, margin, y, colW, 'Cliente', clientName);
    this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, 'Estado', request.status);
    y += metaRow2H + 8;
    doc.y = y;
    doc.x = margin;

    if (!report) {
      y = this.ensurePageSpace(doc, y, 24);
      doc.font('ReportValue').fontSize(10).fillColor(this.brand.dark).text('Reporte aún no disponible.', margin, y);
      if (!footerPath) {
        this.addFooter(doc);
      }
      this.reportPdfLayoutMode = false;
      doc.end();
      await new Promise<void>((resolve) => doc.on('end', () => resolve()));
      return Buffer.concat(chunks);
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

    doc.y = y;
    doc.x = margin;
    doc.font('ReportTitle').fontSize(12);
    const resBarTitle =
      'Resumen de la conversación telefónica realizada al propuesto asegurado:';
    const resBarGuess =
      Math.max(26, doc.heightOfString(resBarTitle.toUpperCase(), { width: usableW - 26, lineGap: 1 }) + 14) + 12;
    y = this.ensurePageSpace(doc, doc.y, resBarGuess + 24);
    const resBarH = this.drawReportSectionBar(doc, margin, y, usableW, resBarTitle);
    y += resBarH + 10;
    doc.y = y;
    doc.x = margin;

    const outcomeStr = this.outcomeLabel(report.outcome);
    const blocks: { label: string; value: string }[] = [
      { label: 'Resultado', value: outcomeStr },
      { label: 'Resumen', value: report.summary ?? '' },
      { label: 'Comentarios adicionales', value: report.additional_comments ?? '' },
    ];
    for (const b of blocks) {
      const h = this.heightOfReportFieldCell(doc, b.label, b.value, usableW);
      y = this.ensurePageSpace(doc, y, h);
      this.drawReportFieldCell(doc, margin, y, usableW, b.label, b.value);
      y += h;
    }
    doc.y = y;
    doc.x = margin;

    this.reportTemplate().forEach((section) => {
      doc.moveDown(0.35);
      this.renderTemplateSection(doc, section, valuesByKey, valuesByLabel, true);
    });

    doc.moveDown();
    y = doc.y;
    const note =
      'Nota: El presente reporte es para uso exclusivo de la compañía de seguros solicitante y no debe ser exhibido a terceros, ni en su totalidad ni en ninguna de sus partes.';
    doc.font('ReportValue').fontSize(8).fillColor(this.brand.muted);
    const noteH = doc.heightOfString(note, { width: usableW, lineGap: 2 });
    y = this.ensurePageSpace(doc, y, noteH + (footerPath ? this.reportFooterDrawH + 8 : footerReserve));
    doc.text(note, margin, y, { width: usableW, lineGap: 2 });
    doc.y = y + noteH + 12;

    if (!footerPath) {
      this.addFooter(doc);
    }

    this.reportPdfLayoutMode = false;
    doc.end();

    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
