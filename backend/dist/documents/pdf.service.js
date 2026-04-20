"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const PDFDocument = require("pdfkit");
const fs_1 = require("fs");
const path_1 = require("path");
class PdfService {
    constructor() {
        this.brand = {
            primary: '#1D4F7C',
            primaryDeep: '#163a5c',
            accent: '#2CD4F8',
            dark: '#0f172a',
            muted: '#64748b',
        };
        this.pdfLayout = {
            margin: 40,
            footerReserve: 52,
            colGap: 20,
        };
        this.reportColors = {
            sectionBg: '#1440AA',
            sectionAccent: '#48D9FD',
            valueBoxBg: '#E8F4FC',
        };
        this.reportPdfLayoutMode = false;
        this.reportHeaderDrawH = 0;
        this.reportFooterDrawH = 0;
        this.reportContentTopY = 0;
        this.reportContentMargin = 40;
    }
    resolveReportAsset(filename) {
        const candidates = [
            (0, path_1.join)(__dirname, '..', '..', 'assets', 'report', filename),
            (0, path_1.join)(process.cwd(), 'assets', 'report', filename),
            (0, path_1.join)(process.cwd(), filename),
            (0, path_1.join)(process.cwd(), '..', filename),
            (0, path_1.join)(__dirname, '..', '..', '..', filename),
        ];
        for (const p of candidates) {
            if ((0, fs_1.existsSync)(p))
                return p;
        }
        return null;
    }
    registerReportFontsForDoc(doc) {
        const dir = (0, path_1.join)(__dirname, '..', '..', 'assets', 'fonts');
        const montserrat = (0, path_1.join)(dir, 'Montserrat-Bold.ttf');
        const openBold = (0, path_1.join)(dir, 'OpenSans-Bold.ttf');
        const openReg = (0, path_1.join)(dir, 'OpenSans-Regular.ttf');
        try {
            if ((0, fs_1.existsSync)(montserrat))
                doc.registerFont('ReportTitle', montserrat);
            else
                doc.registerFont('ReportTitle', 'Helvetica-Bold');
        }
        catch {
            doc.registerFont('ReportTitle', 'Helvetica-Bold');
        }
        try {
            if ((0, fs_1.existsSync)(openBold))
                doc.registerFont('ReportLabel', openBold);
            else
                doc.registerFont('ReportLabel', 'Helvetica-Bold');
        }
        catch {
            doc.registerFont('ReportLabel', 'Helvetica-Bold');
        }
        try {
            if ((0, fs_1.existsSync)(openReg))
                doc.registerFont('ReportValue', openReg);
            else
                doc.registerFont('ReportValue', 'Helvetica');
        }
        catch {
            doc.registerFont('ReportValue', 'Helvetica');
        }
    }
    computeImageDrawHeight(doc, imagePath, targetWidth) {
        const im = doc.openImage(imagePath);
        return (im.height / im.width) * targetWidth;
    }
    drawReportChrome(doc, headerPath, footerPath) {
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
    drawReportSectionBar(doc, x, y, width, title) {
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
    measureReportSectionBarHeight(doc, barWidth, title) {
        const padV = 7;
        const text = title.toUpperCase();
        doc.font('ReportTitle').fontSize(12);
        const textWidth = barWidth - 6 - 20;
        const textH = doc.heightOfString(text, { width: textWidth, lineGap: 1 });
        return Math.max(26, textH + padV * 2);
    }
    estimateFirstReportFieldsRowHeight(doc, fields, valuesByKey, valuesByLabel, usableW, colW, colGap) {
        if (!fields.length)
            return 0;
        const f = fields[0];
        const full = this.isPdfFullWidthField(f.key);
        if (full) {
            const value = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
            return this.heightOfReportFieldCell(doc, f.label, value, usableW);
        }
        const f2 = fields[1];
        if (f2 && !this.isPdfFullWidthField(f2.key)) {
            const v1 = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
            const v2 = this.resolveFieldValue(f2, valuesByKey, valuesByLabel);
            const h1 = this.heightOfReportFieldCell(doc, f.label, v1, colW);
            const h2 = this.heightOfReportFieldCell(doc, f2.label, v2, colW);
            return Math.max(h1, h2);
        }
        const value = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
        return this.heightOfReportFieldCell(doc, f.label, value, colW);
    }
    heightOfReportFieldCell(doc, label, value, width) {
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
    drawReportFieldCell(doc, x, y, width, label, value) {
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
    ensureReportPageSpace(doc, currentY, blockHeight) {
        const limit = doc.page.height - this.reportFooterDrawH - 16;
        if (currentY + blockHeight > limit) {
            doc.addPage();
            return this.reportContentTopY;
        }
        return currentY;
    }
    addHeader(doc, title) {
        const logoPath = (0, path_1.join)(process.cwd(), '..', 'public', 'logo-width.png');
        doc.rect(0, 0, doc.page.width, 70).fill(this.brand.primary);
        doc.fillColor('white');
        if ((0, fs_1.existsSync)(logoPath)) {
            doc.image(logoPath, 40, 18, { width: 140 });
        }
        doc.fontSize(18).text(title, 220, 24, { align: 'right' });
        doc.moveDown(2);
        doc.fillColor(this.brand.dark);
    }
    addFooter(doc) {
        const bottom = doc.page.height - 40;
        doc.strokeColor(this.brand.accent).lineWidth(1).moveTo(40, bottom).lineTo(doc.page.width - 40, bottom).stroke();
        doc
            .fontSize(9)
            .fillColor(this.brand.muted)
            .text('ALARA INSP, S.A. · Plataforma de Inspecciones VIP', 40, bottom + 8, {
            align: 'left',
        });
    }
    addSectionTitle(doc, title) {
        doc
            .fillColor(this.brand.primary)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(title.toUpperCase(), { underline: false });
        doc.moveDown(0.6);
        doc.fillColor(this.brand.dark).fontSize(10).font('Helvetica');
    }
    addKeyValue(doc, label, value) {
        doc
            .font('Helvetica-Bold')
            .fillColor(this.brand.muted)
            .text(`${label}: `, { continued: true });
        doc.font('Helvetica').fillColor(this.brand.dark).text(value ? String(value) : 'No disponible');
    }
    formatReportDate(d) {
        if (!d || Number.isNaN(d.getTime()))
            return '';
        return new Intl.DateTimeFormat('es-PA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Panama',
        }).format(d);
    }
    formatReportDateTime(d) {
        if (!d || Number.isNaN(d.getTime()))
            return '';
        return new Intl.DateTimeFormat('es-PA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Panama',
        }).format(d);
    }
    isPdfFullWidthField(key) {
        if (key.endsWith('_detalle_respuesta_afirmativa'))
            return true;
        if (key === 'informacion_medica' || key === 'informacion_complementaria')
            return true;
        const wide = new Set([
            'foreign_residence',
            'functions',
            'other_occupation',
            'socios_participacion',
            'travel_plans',
            'other_travels',
            'alcohol_frequency_detail',
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
            'negative_history_detail',
            'passive_concept_detail',
            'arrested',
            'additional_comments',
        ]);
        return wide.has(key);
    }
    resolveFieldValue(field, valuesByKey, valuesByLabel) {
        let v = valuesByKey.get(field.key) ?? valuesByLabel.get(field.label) ?? '';
        if (field.key === 'weight') {
            const u = valuesByKey.get('weight_unit') ?? '';
            const n = v.trim();
            if (n && u)
                return `${n} ${u}`.trim();
        }
        if (field.key === 'height') {
            const u = valuesByKey.get('height_unit') ?? '';
            const n = v.trim();
            if (n && u)
                return `${n} ${u}`.trim();
        }
        return v;
    }
    heightOfFieldCell(doc, label, value, width) {
        doc.font('Helvetica').fontSize(8).fillColor(this.brand.muted);
        const h1 = doc.heightOfString(label, { width });
        const display = value.trim() ? value : '—';
        doc.font('Helvetica').fontSize(9).fillColor(this.brand.dark);
        const h2 = doc.heightOfString(display, { width });
        return h1 + 3 + h2 + 6;
    }
    drawFieldCell(doc, x, y, width, label, value) {
        doc.font('Helvetica').fontSize(8).fillColor(this.brand.muted).text(label, x, y, { width });
        const h1 = doc.heightOfString(label, { width });
        const display = value.trim() ? value : '—';
        doc.font('Helvetica').fontSize(9).fillColor(this.brand.dark).text(display, x, y + h1 + 3, { width });
        const h2 = doc.heightOfString(display, { width });
        return h1 + 3 + h2 + 6;
    }
    ensurePageSpace(doc, currentY, blockHeight) {
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
    renderTemplateSection(doc, section, valuesByKey, valuesByLabel, reportStyled = false) {
        const margin = reportStyled ? this.reportContentMargin : this.pdfLayout.margin;
        const colGap = this.pdfLayout.colGap;
        const usableW = doc.page.width - margin * 2;
        const colW = (usableW - colGap) / 2;
        const skip = new Set(['weight_unit', 'height_unit']);
        const fields = section.fields.filter((f) => {
            if (skip.has(f.key))
                return false;
            if (f.key === 'socios_participacion') {
                const role = (valuesByKey.get('employee_or_partner') ??
                    valuesByLabel.get('¿Es empleado o socio?') ??
                    '').trim();
                return role === 'Socio';
            }
            if (f.key === 'alcohol_frequency_detail') {
                const a = (valuesByKey.get('alcohol') ??
                    valuesByLabel.get('¿Toma Bebidas Alcohólicas?') ??
                    '').trim();
                return a === 'Sí';
            }
            if (f.key === 'negative_history_detail') {
                const v = (valuesByKey.get('negative_history') ??
                    valuesByLabel.get('Antecedentes comerciales negativos') ??
                    '').trim();
                return v === 'Sí';
            }
            if (f.key === 'historial_manejo_detalle_respuesta_afirmativa') {
                const d = (valuesByKey.get('dui') ?? '').trim();
                const t = (valuesByKey.get('traffic') ?? '').trim();
                return d === 'Sí' || t === 'Sí';
            }
            if (f.key === 'juicios_detalle_respuesta_afirmativa') {
                const keys = ['criminal_case', 'civil_case', 'commercial_case', 'labor_case'];
                return keys.some((k) => (valuesByKey.get(k) ?? '').trim() === 'Sí');
            }
            return true;
        });
        let y = doc.y;
        if (section.title?.trim()) {
            if (reportStyled) {
                const barH = this.measureReportSectionBarHeight(doc, usableW, section.title);
                const hFirstRow = fields.length > 0
                    ? this.estimateFirstReportFieldsRowHeight(doc, fields, valuesByKey, valuesByLabel, usableW, colW, colGap)
                    : 0;
                y = this.ensurePageSpace(doc, y, barH + 10 + hFirstRow);
                const barDrawnH = this.drawReportSectionBar(doc, margin, y, usableW, section.title);
                y += barDrawnH + 10;
                doc.y = y;
                doc.x = margin;
            }
            else {
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
                }
                else {
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
                }
                else {
                    this.drawFieldCell(doc, margin, y, colW, f.label, v1);
                    this.drawFieldCell(doc, margin + colW + colGap, y, colW, f2.label, v2);
                }
                y += rowH;
                doc.y = y;
                doc.x = margin;
                i += 2;
            }
            else {
                const value = this.resolveFieldValue(f, valuesByKey, valuesByLabel);
                const h = reportStyled
                    ? this.heightOfReportFieldCell(doc, f.label, value, colW)
                    : this.heightOfFieldCell(doc, f.label, value, colW);
                y = this.ensurePageSpace(doc, y, h);
                doc.x = margin;
                if (reportStyled) {
                    this.drawReportFieldCell(doc, margin, y, colW, f.label, value);
                }
                else {
                    this.drawFieldCell(doc, margin, y, colW, f.label, value);
                }
                y += h;
                doc.y = y;
                doc.x = margin;
                i += 1;
            }
        }
    }
    serviceTypeShowsInformacionMedica(serviceType) {
        const n = (serviceType?.name ?? '').trim().toLowerCase();
        if (!n)
            return false;
        if (n.includes('tmu'))
            return true;
        if (/tele[\s_-]?med|telem[eé]dic/.test(n))
            return true;
        return false;
    }
    reportTemplate(includeInformacionMedicaTmu) {
        const affirmative = 'Por favor, ampliar las respuestas afirmativas';
        return [
            {
                title: 'Datos personales',
                fields: [
                    { key: 'first_name', label: 'Nombres' },
                    { key: 'last_name', label: 'Apellidos' },
                    { key: 'id_type', label: 'Tipo de documento' },
                    { key: 'id_number', label: 'Número de documento' },
                    { key: 'home_address', label: 'Domicilio' },
                    { key: 'residence_time', label: 'Tiempo de residencia' },
                    { key: 'foreign_residence', label: 'Residencia en el extranjero (Dónde / cuándo)' },
                    { key: 'mobile', label: 'Celular' },
                    { key: 'email', label: 'E-Mail' },
                    { key: 'dob', label: 'Fecha de Nacimiento' },
                    { key: 'marital_status', label: 'Estado Civil' },
                    { key: 'spouse_name', label: 'Nombre del Cónyuge' },
                    { key: 'children', label: 'Hijos' },
                    { key: 'nationality', label: 'Nacionalidad' },
                ],
            },
            {
                title: 'Profesión – Actividad Laboral',
                fields: [
                    { key: 'profession_studies', label: 'Profesión / Estudios Cursados' },
                    { key: 'occupation', label: 'Ocupación / Cargo' },
                    { key: 'employer', label: 'Empleador / Empresa' },
                    { key: 'functions', label: 'Funciones' },
                    { key: 'business_nature', label: 'Naturaleza del Negocio' },
                    { key: 'seniority', label: 'Años de servicio' },
                    { key: 'employee_or_partner', label: '¿Es empleado o socio?' },
                    {
                        key: 'socios_participacion',
                        label: 'Indicar número de socios y porcentaje de participación',
                    },
                    { key: 'business_address', label: 'Domicilio Comercial' },
                    { key: 'website', label: 'Sitio Web' },
                    { key: 'other_occupation', label: 'Otra Ocupación Actual (describa)' },
                ],
            },
            {
                title: 'Salud',
                fields: [
                    { key: 'doctor_name', label: 'Nombre del Médico Personal' },
                    { key: 'medical_coverage', label: 'Cobertura Médica' },
                    { key: 'last_consult', label: 'Fecha Última Consulta Médica' },
                    { key: 'consultation_reason', label: 'Motivo de la Consulta' },
                    { key: 'doctor_contact', label: 'Nombre, Dirección del Médico Consultado' },
                    { key: 'studies', label: 'Estudios realizados' },
                    { key: 'results', label: 'Resultados Obtenidos' },
                    { key: 'weight', label: 'Peso (kg / lb)' },
                    { key: 'height', label: 'Altura (cm / ft)' },
                    { key: 'weight_change', label: 'Cambio de Peso' },
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
                    { key: 'travel_plans', label: 'Tiene planes de viajar/destino/fecha:' },
                    { key: 'other_travels', label: 'Otros viajes realizados/ destino/ fecha/ frecuencia:' },
                ],
            },
            {
                title: 'Deportes de Riesgo',
                fields: [
                    { key: 'diving', label: '¿Buceo?' },
                    { key: 'racing', label: '¿Carrera de Vehículos?' },
                    { key: 'pilot', label: '¿Es Piloto de avión o Piloto Estudiante?' },
                    { key: 'ultralight', label: 'Aviones Ultraligeros' },
                    { key: 'parachute', label: 'Paracaidismo' },
                    { key: 'paragliding', label: 'Parapente' },
                    { key: 'climbing', label: 'Escalamiento de montañas' },
                    { key: 'other_risk', label: 'Otra Actividad de Riesgo (ampliar)' },
                    {
                        key: 'accidents',
                        label: '¿Ha sufrido algún accidente o lesión practicando un deporte o actividad física? (En caso afirmativo, detallar circunstancias, fecha, lugar, secuelas)',
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
                    { key: 'tobacco_last', label: 'Fecha del Último consumo' },
                    { key: 'tobacco_period', label: 'Período de consumo' },
                    { key: 'tobacco_in_past', label: '¿Lo ha sido en el pasado?' },
                    { key: 'vape', label: '¿Consume cigarrillo electrónico?' },
                    { key: 'vape_details', label: 'Frecuencia: Detalles' },
                ],
            },
            {
                title: 'Alcohol – Drogas',
                fields: [
                    { key: 'alcohol', label: '¿Toma Bebidas Alcohólicas?' },
                    { key: 'alcohol_frequency_detail', label: 'Tipo, frecuencia y cantidad:' },
                    { key: 'marijuana', label: 'Marihuana' },
                    { key: 'amphetamines', label: 'Anfetaminas' },
                    { key: 'barbiturics', label: 'Barbitúricos' },
                    { key: 'cocaine', label: 'Cocaína' },
                    { key: 'lsd', label: 'LSD' },
                    { key: 'stimulants', label: 'Estimulantes' },
                    { key: 'other_drugs', label: 'Otras Drogas' },
                    { key: 'treatment', label: 'Tratamiento por Consumo de Drogas / Alcohol' },
                    { key: 'treatment_detail', label: 'Detalle del tratamiento (centro, fechas, etc.)' },
                    {
                        key: 'professional_athlete_doping',
                        label: 'En caso de deportista profesional ¿Dopaje positivo?',
                    },
                    { key: 'alcohol_drogas_detalle_respuesta_afirmativa', label: affirmative },
                ],
            },
            {
                title: 'Política',
                fields: [
                    {
                        key: 'pep',
                        label: '¿Es PEP? En caso afirmativo, dar detalles de su cargo y funciones:',
                    },
                    { key: 'pep_detail', label: 'Detalle PEP (cargo, organismo, etc.)' },
                    {
                        key: 'political_party',
                        label: '¿Participa o es miembro de algún partido político? En caso afirmativo, dar detalles:',
                    },
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
                title: 'Historia de Seguros - Vigentes',
                fields: [
                    { key: 'insurance_company', label: 'Compañía' },
                    { key: 'insurance_amount', label: 'Monto' },
                    { key: 'insurance_date', label: 'Fecha de Emisión' },
                    { key: 'insurance_reason', label: 'Seguro personal o Negocios' },
                    {
                        key: 'simultaneous_policy',
                        label: '¿Se encuentra aplicando un seguro de vida para otra Cía. simultáneamente? En caso afirmativo, dar detalles:',
                    },
                ],
            },
            {
                title: 'Información del seguro y origen de fondos',
                fields: [
                    { key: 'insurance_object', label: 'Propósito del seguro' },
                    { key: 'replaces_policy', label: '¿Este seguro reemplaza alguna póliza actual?' },
                    { key: 'previous_rejected', label: '¿Le han rechazado alguna solicitud anteriormente?' },
                    { key: 'previous_rejection_reason', label: 'Motivo del Rechazo' },
                    { key: 'policy_holder', label: 'Tomador de la Póliza' },
                    { key: 'policy_payer', label: 'Pagador de la Póliza' },
                    { key: 'funds_origin', label: 'Origen de fondos' },
                    { key: 'bank_name', label: 'Banco de donde provienen los fondos' },
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
                fields: [
                    { key: 'total_liabilities', label: 'Total Pasivo Personal' },
                    { key: 'passive_concept_detail', label: 'Concepto o detalles' },
                ],
            },
            {
                title: 'Finanzas – Otros',
                fields: [
                    { key: 'banks', label: 'Bancos con los cuales opera' },
                    { key: 'bank_relationship', label: 'Antigüedad' },
                    { key: 'credit_cards', label: 'Tarjetas de crédito' },
                    { key: 'bankruptcy', label: '¿Quiebra Comercial?' },
                    { key: 'negative_history', label: 'Antecedentes comerciales negativos' },
                    { key: 'negative_history_detail', label: 'De ser afirmativo detallar' },
                ],
            },
            {
                title: 'Historial de Manejo',
                fields: [
                    {
                        key: 'dui',
                        label: 'Condenas o infracciones por conducir bajo la influencia de alcohol o drogas',
                    },
                    { key: 'traffic', label: 'Infracciones de tránsito últimos 3 años' },
                    { key: 'historial_manejo_detalle_respuesta_afirmativa', label: affirmative },
                ],
            },
            {
                title: 'Juicios - Pasados o Presentes',
                fields: [
                    { key: 'criminal_case', label: 'Juicio Penal' },
                    { key: 'civil_case', label: 'Juicio Civil' },
                    { key: 'commercial_case', label: 'Juicio Comercial' },
                    { key: 'labor_case', label: 'Juicio Laboral' },
                    { key: 'arrested', label: '¿Ha sido Arrestado? Detallar' },
                    { key: 'juicios_detalle_respuesta_afirmativa', label: affirmative },
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
                    ...(includeInformacionMedicaTmu
                        ? [{ key: 'informacion_medica', label: 'Información Médica (TMU)' }]
                        : []),
                ],
            },
        ];
    }
    async buildRequestPdf(request) {
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        const headerPath = this.resolveReportAsset('cabeceraReporte.jpg');
        const footerPath = this.resolveReportAsset('pieReporte.jpg');
        const pageW = doc.page.width;
        this.registerReportFontsForDoc(doc);
        if (headerPath) {
            this.reportHeaderDrawH = this.computeImageDrawHeight(doc, headerPath, pageW);
        }
        else {
            this.reportHeaderDrawH = 0;
        }
        if (footerPath) {
            this.reportFooterDrawH = this.computeImageDrawHeight(doc, footerPath, pageW);
        }
        else {
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
        const str = (v) => {
            if (v == null)
                return '';
            return String(v).trim();
        };
        let y = doc.y;
        const rowFull = (label, value) => {
            const h = this.heightOfReportFieldCell(doc, label, value, usableW);
            y = this.ensurePageSpace(doc, y, h);
            this.drawReportFieldCell(doc, margin, y, usableW, label, value);
            y += h;
        };
        const rowPair = (l1, v1, l2, v2) => {
            const h = Math.max(this.heightOfReportFieldCell(doc, l1, v1, colW), this.heightOfReportFieldCell(doc, l2, v2, colW));
            y = this.ensurePageSpace(doc, y, h);
            this.drawReportFieldCell(doc, margin, y, colW, l1, v1);
            this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, l2, v2);
            y += h;
        };
        const sectionBar = (title) => {
            doc.font('ReportTitle').fontSize(12);
            const guess = Math.max(26, doc.heightOfString(title.toUpperCase(), { width: usableW - 26, lineGap: 1 }) + 14) + 12;
            y = this.ensurePageSpace(doc, y, guess);
            const barH = this.drawReportSectionBar(doc, margin, y, usableW, title);
            y += barH + 10;
        };
        sectionBar('Solicitud de Inspección VIP');
        rowPair('Número de solicitud', str(request.request_number), 'Aseguradora', str(request.insurer.name));
        rowPair('Estado', str(request.status), 'Fecha', request.requested_at.toISOString().split('T')[0]);
        y += 4;
        sectionBar('Responsable del pedido');
        if (str(request.responsible_phone)) {
            rowPair('Responsable', str(request.responsible_name), 'Teléfono responsable', str(request.responsible_phone));
        }
        else {
            rowFull('Responsable', str(request.responsible_name));
        }
        if (str(request.responsible_email)) {
            rowFull('Email responsable', str(request.responsible_email));
        }
        sectionBar('Datos de la solicitud');
        const montoAseg = request.insured_amount !== null && request.insured_amount !== undefined
            ? String(request.insured_amount)
            : '';
        rowPair('Agente', str(request.agent_name), 'Monto asegurado', montoAseg);
        const montoVigTxt = request.has_amount_in_force && request.amount_in_force != null && request.amount_in_force !== ''
            ? String(request.amount_in_force)
            : '';
        rowPair('Monto vigente', request.has_amount_in_force ? 'Sí' : 'No', 'Monto en vigencia', montoVigTxt);
        rowPair('Estado civil', str(request.marital_status), 'Idioma entrevista', str(request.interview_language));
        rowFull('Cliente avisado', request.client_notified ? 'Sí' : 'No');
        if (request.marital_status === 'Casado' || request.marital_status === 'Unido') {
            rowFull('Nombre del cónyuge', str(request.spouse_name));
        }
        sectionBar('Datos del cliente');
        rowPair('Nombres', str(request.client.first_name), 'Apellidos', str(request.client.last_name));
        const dobStr = request.client.dob ? request.client.dob.toISOString().split('T')[0] : '';
        const docStr = request.client.id_type && request.client.id_number
            ? `${request.client.id_type} ${request.client.id_number}`
            : '';
        rowPair('Fecha de nacimiento', dobStr, 'Documento', docStr);
        rowPair('Email', str(request.client.email), 'Teléfono residencial', str(request.client.phone_home));
        rowPair('Teléfono celular', str(request.client.phone_mobile), 'Teléfono laboral', str(request.client.phone_work));
        rowFull('Dirección', str(request.client.address_line));
        rowPair('Ciudad', str(request.client.city), 'País', str(request.client.country));
        rowPair('Empresa/Empleador', str(request.client.employer_name), 'Profesión/Ocupación', str(request.client.profession));
        sectionBar('Indicaciones / Comentarios');
        rowFull('Comentarios', str(request.comments));
        doc.y = y;
        doc.x = margin;
        if (!footerPath) {
            this.addFooter(doc);
        }
        this.reportPdfLayoutMode = false;
        doc.end();
        await new Promise((resolve) => doc.on('end', () => resolve()));
        return Buffer.concat(chunks);
    }
    async buildReportPdf(request, report) {
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        const headerPath = this.resolveReportAsset('cabeceraReporte.jpg');
        const footerPath = this.resolveReportAsset('pieReporte.jpg');
        const pageW = doc.page.width;
        this.registerReportFontsForDoc(doc);
        if (headerPath) {
            this.reportHeaderDrawH = this.computeImageDrawHeight(doc, headerPath, pageW);
        }
        else {
            this.reportHeaderDrawH = 0;
        }
        if (footerPath) {
            this.reportFooterDrawH = this.computeImageDrawHeight(doc, footerPath, pageW);
        }
        else {
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
        const metaRow1H = Math.max(this.heightOfReportFieldCell(doc, 'N° de solicitud', request.request_number, colW), this.heightOfReportFieldCell(doc, 'Aseguradora', request.insurer.name, colW));
        y = this.ensurePageSpace(doc, y, metaRow1H);
        this.drawReportFieldCell(doc, margin, y, colW, 'N° de solicitud', request.request_number);
        this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, 'Aseguradora', request.insurer.name);
        y += metaRow1H;
        const clientName = `${request.client.first_name} ${request.client.last_name}`.trim();
        const metaRow2H = Math.max(this.heightOfReportFieldCell(doc, 'Cliente', clientName, colW), this.heightOfReportFieldCell(doc, 'Estado', request.status, colW));
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
            await new Promise((resolve) => doc.on('end', () => resolve()));
            return Buffer.concat(chunks);
        }
        const valuesByKey = new Map();
        const valuesByLabel = new Map();
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
        const strMeta = (v) => {
            if (v == null)
                return '';
            return String(v).trim();
        };
        const montoSolicitado = request.insured_amount !== null && request.insured_amount !== undefined
            ? strMeta(request.insured_amount)
            : '';
        const corredor = strMeta(request.agent_name);
        const fechaPedido = this.formatReportDate(request.requested_at);
        const fechaEntrevista = this.formatReportDateTime(report.interview_started_at ?? request.scheduled_start_at ?? undefined);
        const fechaDescarga = this.formatReportDateTime(new Date());
        const metaRow3H = Math.max(this.heightOfReportFieldCell(doc, 'Corredor / Productor seguro', corredor, colW), this.heightOfReportFieldCell(doc, 'Monto solicitado', montoSolicitado, colW));
        y = this.ensurePageSpace(doc, y, metaRow3H);
        this.drawReportFieldCell(doc, margin, y, colW, 'Corredor / Productor seguro', corredor);
        this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, 'Monto solicitado', montoSolicitado);
        y += metaRow3H;
        const metaRow4H = Math.max(this.heightOfReportFieldCell(doc, 'Fecha pedido del informe', fechaPedido, colW), this.heightOfReportFieldCell(doc, 'Fecha/Hora de la entrevista', fechaEntrevista, colW));
        y = this.ensurePageSpace(doc, y, metaRow4H);
        this.drawReportFieldCell(doc, margin, y, colW, 'Fecha pedido del informe', fechaPedido);
        this.drawReportFieldCell(doc, margin + colW + colGap, y, colW, 'Fecha/Hora de la entrevista', fechaEntrevista);
        y += metaRow4H;
        const metaRow5H = this.heightOfReportFieldCell(doc, 'Fecha del reporte descargado', fechaDescarga, usableW);
        y = this.ensurePageSpace(doc, y, metaRow5H);
        this.drawReportFieldCell(doc, margin, y, usableW, 'Fecha del reporte descargado', fechaDescarga);
        y += metaRow5H + 8;
        doc.y = y;
        doc.x = margin;
        doc.font('ReportTitle').fontSize(12);
        const resBarTitle = 'Resumen de la conversación telefónica realizada al propuesto asegurado:';
        const resBarGuess = Math.max(26, doc.heightOfString(resBarTitle.toUpperCase(), { width: usableW - 26, lineGap: 1 }) + 14) + 12;
        y = this.ensurePageSpace(doc, y, resBarGuess + 24);
        const resBarH = this.drawReportSectionBar(doc, margin, y, usableW, resBarTitle);
        y += resBarH + 10;
        doc.y = y;
        doc.x = margin;
        const includeInformacionMedicaTmu = this.serviceTypeShowsInformacionMedica(request.service_type);
        this.reportTemplate(includeInformacionMedicaTmu).forEach((section) => {
            doc.moveDown(0.35);
            this.renderTemplateSection(doc, section, valuesByKey, valuesByLabel, true);
        });
        doc.moveDown();
        y = doc.y;
        const note = 'Nota: El presente reporte es para uso exclusivo de la compañía de seguros solicitante y no debe ser exhibido a terceros, ni en su totalidad ni en ninguna de sus partes.';
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
        await new Promise((resolve) => doc.on('end', () => resolve()));
        return Buffer.concat(chunks);
    }
}
exports.PdfService = PdfService;
//# sourceMappingURL=pdf.service.js.map