import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hashPassword = async (plain: string) => bcrypt.hash(plain, 10);

async function main() {
  await prisma.notification.deleteMany();
  await prisma.reportTemplate.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.reportField.deleteMany();
  await prisma.reportSection.deleteMany();
  await prisma.inspectionReport.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.inspectionRequestStatusHistory.deleteMany();
  await prisma.inspectionRequest.deleteMany();
  await prisma.insurerClient.deleteMany();
  await prisma.clientAddress.deleteMany();
  await prisma.client.deleteMany();
  await prisma.document.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.alaraOffice.deleteMany();
  await prisma.insurer.deleteMany();

  const [insurer1, insurer2] = await prisma.$transaction([
    prisma.insurer.create({ data: { name: 'Pan-American Life Insurance', legal_id: 'PALIG-001' } }),
    prisma.insurer.create({ data: { name: 'ASSA Compañía de seguros', legal_id: 'ASSA-884' } }),
  ]);

  const office = await prisma.alaraOffice.create({
    data: { name: 'Oficina Panamá', timezone: 'America/Panama' },
  });

  const [roleInsurer, roleAlara, roleAdmin] = await prisma.$transaction([
    prisma.role.create({ data: { code: 'INSURER_USER', name: 'Usuario Aseguradora' } }),
    prisma.role.create({ data: { code: 'ALARA_USER', name: 'Usuario ALARA' } }),
    prisma.role.create({ data: { code: 'ADMIN', name: 'Administrador' } }),
  ]);

  const reportTemplatePayload = {
    outcome: 'PENDIENTE',
    summary: '',
    additional_comments: '',
    sections: [
      {
        code: 'DATOS_PERSONALES',
        title: 'Datos personales',
        order: 1,
        fields: [
          { key: 'pa_name', label: 'Propuesto Asegurado', type: 'TEXT', value: '' },
          { key: 'home_address', label: 'Domicilio Particular', type: 'TEXT', value: '' },
          { key: 'residence_time', label: 'Tiempo de Residencia', type: 'TEXT', value: '' },
          { key: 'foreign_residence', label: 'Residencia en el extranjero (Dónde / cuándo)', type: 'TEXT', value: '' },
          { key: 'mobile', label: 'Celular', type: 'TEXT', value: '' },
          { key: 'email', label: 'E-mail', type: 'TEXT', value: '' },
          { key: 'dob', label: 'Fecha de Nacimiento', type: 'TEXT', value: '' },
          { key: 'document', label: 'Tipo y No. Documento', type: 'TEXT', value: '' },
          { key: 'nationality', label: 'Nacionalidad', type: 'TEXT', value: '' },
          { key: 'marital_status', label: 'Estado Civil', type: 'TEXT', value: '' },
          { key: 'spouse_name', label: 'Nombre del Cónyuge', type: 'TEXT', value: '' },
          { key: 'children', label: 'Hijos', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'PROFESION_LABORAL',
        title: 'Profesión – Actividad Laboral',
        order: 2,
        fields: [
          { key: 'profession_studies', label: 'Profesión / Estudios Cursados', type: 'TEXT', value: '' },
          { key: 'occupation', label: 'Ocupación / Cargo', type: 'TEXT', value: '' },
          { key: 'functions', label: 'Funciones', type: 'TEXT', value: '' },
          { key: 'employer', label: 'Empleador / Empresa', type: 'TEXT', value: '' },
          { key: 'seniority', label: 'Antigüedad en la empresa', type: 'TEXT', value: '' },
          { key: 'company_start', label: 'Fecha de Creación de la Empresa', type: 'TEXT', value: '' },
          { key: 'employees', label: 'Cantidad de Empleados', type: 'TEXT', value: '' },
          { key: 'employee_or_partner', label: '¿Es empleado o socio?', type: 'TEXT', value: '' },
          { key: 'business_nature', label: 'Naturaleza del Negocio', type: 'TEXT', value: '' },
          { key: 'clients', label: 'Clientes', type: 'TEXT', value: '' },
          { key: 'business_address', label: 'Domicilio Comercial', type: 'TEXT', value: '' },
          { key: 'website', label: 'Sitio Web', type: 'TEXT', value: '' },
          { key: 'other_occupation', label: 'Otra Ocupación Actual (describa)', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'SALUD',
        title: 'Salud',
        order: 3,
        fields: [
          { key: 'doctor_name', label: 'Nombre del Médico Personal', type: 'TEXT', value: '' },
          { key: 'medical_coverage', label: 'Cobertura Médica', type: 'TEXT', value: '' },
          { key: 'last_consult', label: 'Fecha Última Consulta Médica', type: 'TEXT', value: '' },
          { key: 'last_checkup', label: 'Fecha Último Check-up', type: 'TEXT', value: '' },
          { key: 'doctor_contact', label: 'Nombre, Dirección del Médico Consultado', type: 'TEXT', value: '' },
          { key: 'studies', label: 'Estudios realizados', type: 'TEXT', value: '' },
          { key: 'results', label: 'Resultados Obtenidos', type: 'TEXT', value: '' },
          { key: 'weight', label: 'Peso', type: 'TEXT', value: '' },
          { key: 'height', label: 'Altura', type: 'TEXT', value: '' },
          { key: 'weight_change', label: 'Cambio de Peso', type: 'TEXT', value: '' },
          { key: 'deafness', label: 'Sordera', type: 'TEXT', value: '' },
          { key: 'blindness', label: 'Ceguera', type: 'TEXT', value: '' },
          { key: 'physical_alterations', label: 'Alteraciones Físicas', type: 'TEXT', value: '' },
          { key: 'amputations', label: 'Amputaciones', type: 'TEXT', value: '' },
          { key: 'other_impediments', label: 'Otros Impedimentos', type: 'TEXT', value: '' },
          { key: 'high_pressure', label: 'Alta Presión', type: 'TEXT', value: '' },
          { key: 'diabetes', label: 'Diabetes', type: 'TEXT', value: '' },
          { key: 'cancer', label: 'Cáncer', type: 'TEXT', value: '' },
          { key: 'cardiac', label: 'Problemas Cardiacos', type: 'TEXT', value: '' },
          { key: 'ulcer', label: 'Úlcera', type: 'TEXT', value: '' },
          { key: 'surgeries', label: 'Cirugías / Fechas', type: 'TEXT', value: '' },
          { key: 'important_diseases', label: 'Enfermedades Importantes / Fechas', type: 'TEXT', value: '' },
          { key: 'prescribed_meds', label: 'Medicamentos con prescripción médica (Nombre y Dosis)', type: 'TEXT', value: '' },
          { key: 'non_prescribed_meds', label: 'Medicamentos no recetados (Nombre y Dosis)', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'RIESGOS_LABORALES',
        title: 'Factores de riesgo en sus labores',
        order: 4,
        fields: [
          { key: 'work_risk', label: '¿Está expuesto a algún riesgo por sus labores?', type: 'TEXT', value: '' },
          { key: 'work_risk_desc', label: 'Descripción según Ocupación', type: 'TEXT', value: '' },
          { key: 'safety_rules', label: '¿Hay Normas de Seguridad?', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'VIAJES',
        title: 'Viajes',
        order: 5,
        fields: [
          { key: 'travel_destination', label: 'Destino', type: 'TEXT', value: '' },
          { key: 'travel_transport', label: 'Medio', type: 'TEXT', value: '' },
          { key: 'travel_reason', label: 'Motivo', type: 'TEXT', value: '' },
          { key: 'travel_frequency', label: 'Frecuencia', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'DEPORTES_RIESGO',
        title: 'Deportes de Riesgo',
        order: 6,
        fields: [
          { key: 'diving', label: '¿Buceo?', type: 'TEXT', value: '' },
          { key: 'racing', label: '¿Carrera de Vehículos?', type: 'TEXT', value: '' },
          { key: 'pilot', label: '¿Es Piloto de avión o Piloto Estudiante?', type: 'TEXT', value: '' },
          { key: 'ultralight', label: 'Aviones Ultraligeros', type: 'TEXT', value: '' },
          { key: 'parachute', label: 'Paracaidismo', type: 'TEXT', value: '' },
          { key: 'paragliding', label: 'Parapente', type: 'TEXT', value: '' },
          { key: 'climbing', label: 'Escalamiento de montañas', type: 'TEXT', value: '' },
          { key: 'other_risk', label: '¿Otra Actividad de Riesgo? Ampliar', type: 'TEXT', value: '' },
          { key: 'accidents', label: '¿Ha sufrido algún accidente o lesión practicando deporte o actividad física?', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'DEPORTES',
        title: 'Deportes',
        order: 7,
        fields: [
          { key: 'sports_activity', label: 'Deporte o Actividad Física', type: 'TEXT', value: '' },
          { key: 'sports_frequency', label: 'Frecuencia', type: 'TEXT', value: '' },
          { key: 'sports_details', label: 'Dar detalles', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'TABACO',
        title: 'Tabaco',
        order: 8,
        fields: [
          { key: 'smoker', label: '¿Es Fumador o utiliza algún tipo de tabaco?', type: 'TEXT', value: '' },
          { key: 'tobacco_type', label: 'Tipo de Tabaco', type: 'TEXT', value: '' },
          { key: 'tobacco_amount', label: 'Cantidad y Frecuencia de Consumo', type: 'TEXT', value: '' },
          { key: 'tobacco_period', label: 'Período de Consumo', type: 'TEXT', value: '' },
          { key: 'tobacco_last', label: 'Fecha del Último consumo', type: 'TEXT', value: '' },
          { key: 'vape', label: '¿Consume cigarrillo electrónico?', type: 'TEXT', value: '' },
          { key: 'vape_details', label: 'En caso afirmativo: cantidad, frecuencia y circunstancias', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'ALCOHOL_DROGAS',
        title: 'Alcohol – Drogas',
        order: 9,
        fields: [
          { key: 'alcohol', label: '¿Toma Bebidas Alcohólicas?', type: 'TEXT', value: '' },
          { key: 'marijuana', label: 'Marihuana', type: 'TEXT', value: '' },
          { key: 'amphetamines', label: 'Anfetaminas', type: 'TEXT', value: '' },
          { key: 'barbiturics', label: 'Barbitúricos', type: 'TEXT', value: '' },
          { key: 'cocaine', label: 'Cocaína', type: 'TEXT', value: '' },
          { key: 'lsd', label: 'LSD', type: 'TEXT', value: '' },
          { key: 'stimulants', label: 'Estimulantes', type: 'TEXT', value: '' },
          { key: 'other_drugs', label: 'Otras Drogas', type: 'TEXT', value: '' },
          { key: 'treatment', label: 'Tratamiento por Consumo de Drogas / Alcohol', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'POLITICA',
        title: 'Política',
        order: 10,
        fields: [
          { key: 'pep', label: '¿Es Persona Políticamente Expuesta (PEP)?', type: 'TEXT', value: '' },
          { key: 'political_party', label: '¿Participa en algún partido político?', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'SEGURIDAD',
        title: 'Seguridad',
        order: 11,
        fields: [
          { key: 'kidnapping', label: '¿Ha sido Secuestrado o Recibido Amenazas?', type: 'TEXT', value: '' },
          { key: 'armored_car', label: 'Auto Blindado', type: 'TEXT', value: '' },
          { key: 'weapons', label: 'Portación / Tenencia de Armas', type: 'TEXT', value: '' },
          { key: 'weapon_time', label: '¿Hace cuánto tiempo las utiliza?', type: 'TEXT', value: '' },
          { key: 'weapon_use', label: '¿En qué circunstancia la porta?', type: 'TEXT', value: '' },
          { key: 'weapon_reason', label: 'Razón de portación', type: 'TEXT', value: '' },
          { key: 'weapon_type', label: 'Tipo de arma, calibre y modelo', type: 'TEXT', value: '' },
          { key: 'weapon_fired', label: '¿Utilizó o disparó el arma en alguna ocasión?', type: 'TEXT', value: '' },
          { key: 'weapon_training', label: '¿Ha recibido entrenamiento especial?', type: 'TEXT', value: '' },
          { key: 'military', label: '¿Ha pertenecido a alguna fuerza militar o política?', type: 'TEXT', value: '' },
          { key: 'weapon_maintenance', label: 'Frecuencia de mantenimiento del arma', type: 'TEXT', value: '' },
          { key: 'practice_place', label: 'Lugar de práctica', type: 'TEXT', value: '' },
          { key: 'security_equipment', label: 'Equipo de seguridad utilizado', type: 'TEXT', value: '' },
          { key: 'accidents_security', label: '¿Ha tenido accidentes?', type: 'TEXT', value: '' },
          { key: 'personal_guard', label: 'Custodia Personal', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'HISTORIA_SEGUROS',
        title: 'Historia de Seguros',
        order: 12,
        fields: [
          { key: 'insurance_date', label: 'Fecha', type: 'TEXT', value: '' },
          { key: 'insurance_company', label: 'Compañía', type: 'TEXT', value: '' },
          { key: 'insurance_amount', label: 'Monto', type: 'TEXT', value: '' },
          { key: 'insurance_reason', label: 'Motivo del seguro', type: 'TEXT', value: '' },
          { key: 'simultaneous_policy', label: '¿Seguro de vida en otra compañía? Detallar', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'DETALLE_SEGURO',
        title: 'Detalle del seguro',
        order: 13,
        fields: [
          { key: 'insurance_object', label: 'Objeto del seguro', type: 'TEXT', value: '' },
          { key: 'policy_holder', label: 'Tomador de la Póliza', type: 'TEXT', value: '' },
          { key: 'policy_payer', label: 'Pagador de la Póliza', type: 'TEXT', value: '' },
          { key: 'bank_name', label: 'Banco de origen de fondos', type: 'TEXT', value: '' },
          { key: 'funds_origin', label: 'Origen de fondos', type: 'TEXT', value: '' },
          { key: 'previous_rejected', label: '¿Le han Rechazado alguna Solicitud anteriormente?', type: 'TEXT', value: '' },
          { key: 'replaces_policy', label: '¿Este Seguro Reemplaza una Póliza Actual?', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'INGRESOS',
        title: 'Ingresos',
        order: 14,
        fields: [
          { key: 'earned_income', label: 'Ingreso Ganado Anual', type: 'TEXT', value: '' },
          { key: 'earned_concept', label: 'Concepto (Sueldo, Comisiones, Bonos, Honorarios) Detallar', type: 'TEXT', value: '' },
          { key: 'unearned_income', label: 'Ingresos Anuales No Ganados (Inversiones)', type: 'TEXT', value: '' },
          { key: 'unearned_concept', label: 'Concepto (Dividendos, Intereses, Rentas, etc.)', type: 'TEXT', value: '' },
          { key: 'total_income', label: 'Ingreso Total Anual', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'ACTIVO_PERSONAL',
        title: 'Activo Personal',
        order: 15,
        fields: [
          { key: 'total_assets', label: 'Total Activo Personal', type: 'TEXT', value: '' },
          { key: 'real_estate', label: 'Inmuebles / Bienes Raíces', type: 'TEXT', value: '' },
          { key: 'cash_bank', label: 'Efectivo en banco', type: 'TEXT', value: '' },
          { key: 'goods', label: 'Bienes (vehículos, embarcaciones, obras de arte, joyas, etc.)', type: 'TEXT', value: '' },
          { key: 'society', label: 'Participación en Sociedades', type: 'TEXT', value: '' },
          { key: 'stocks', label: 'Acciones y Bonos', type: 'TEXT', value: '' },
          { key: 'other_assets', label: 'Otros Activos (Detalles)', type: 'TEXT', value: '' },
          { key: 'receivables', label: 'Cuentas por Cobrar', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'PASIVO_PERSONAL',
        title: 'Pasivo Personal',
        order: 16,
        fields: [
          { key: 'total_liabilities', label: 'Total Pasivo Personal', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'FINANZAS_OTROS',
        title: 'Finanzas – Otros',
        order: 17,
        fields: [
          { key: 'banks', label: 'Bancos con los cuales opera', type: 'TEXT', value: '' },
          { key: 'bank_relationship', label: 'Antigüedad', type: 'TEXT', value: '' },
          { key: 'credit_cards', label: 'Tarjetas de crédito', type: 'TEXT', value: '' },
          { key: 'bankruptcy', label: '¿Está en Quiebra Comercial?', type: 'TEXT', value: '' },
          { key: 'negative_history', label: 'Antecedentes comerciales negativos', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'HISTORIAL_MANEJO',
        title: 'Historial de Manejo',
        order: 18,
        fields: [
          { key: 'dui', label: 'Condena por DUI últimos 5 años', type: 'TEXT', value: '' },
          { key: 'traffic', label: 'Infracciones de tránsito últimos 3 años', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'JUICIOS',
        title: 'Juicios',
        order: 19,
        fields: [
          { key: 'criminal_case', label: 'Juicio Penal', type: 'TEXT', value: '' },
          { key: 'civil_case', label: 'Juicio Civil', type: 'TEXT', value: '' },
          { key: 'commercial_case', label: 'Juicio Comercial', type: 'TEXT', value: '' },
          { key: 'labor_case', label: 'Juicio Laboral', type: 'TEXT', value: '' },
          { key: 'arrested', label: '¿Ha sido Arrestado por algún Motivo? Detallar.', type: 'TEXT', value: '' }
        ]
      },
      {
        code: 'COMENTARIOS',
        title: 'Ampliación o Comentarios Adicional',
        order: 20,
        fields: [
          { key: 'additional_comments', label: 'Comentarios adicionales', type: 'TEXT', value: '' }
        ]
      }
    ]
  };

  await prisma.reportTemplate.upsert({
    where: { code: 'INSPECTION_REPORT_V1' },
    update: { name: 'Reporte de Inspección VIP', payload: reportTemplatePayload as any },
    create: { code: 'INSPECTION_REPORT_V1', name: 'Reporte de Inspección VIP', payload: reportTemplatePayload as any }
  });

  const [insurerUser1, insurerUser2, alaraUser, adminUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        user_type: 'INSURER',
        insurer_id: insurer1.id,
        email: 'insurer@palig.com',
        phone: '+507 6000 0101',
        full_name: 'Carolina Ibáñez',
        password_hash: await hashPassword('Insurer123!'),
      },
    }),
    prisma.user.create({
      data: {
        user_type: 'INSURER',
        insurer_id: insurer2.id,
        email: 'insurer@assa.com',
        phone: '+57 300 222 9921',
        full_name: 'Santiago Rivas',
        password_hash: await hashPassword('Insurer123!'),
      },
    }),
    prisma.user.create({
      data: {
        user_type: 'ALARA',
        alara_office_id: office.id,
        email: 'alara@alarains.com',
        phone: '+507 6500 7890',
        full_name: 'Martha Rivera',
        password_hash: await hashPassword('Alara123!'),
      },
    }),
    prisma.user.create({
      data: {
        user_type: 'ALARA',
        alara_office_id: office.id,
        email: 'admin@alarains.com',
        phone: '+507 6500 7000',
        full_name: 'Luis Herrera',
        password_hash: await hashPassword('Admin123!'),
      },
    }),
  ]);

  await prisma.userRole.createMany({
    data: [
      { user_id: insurerUser1.id, role_id: roleInsurer.id },
      { user_id: insurerUser2.id, role_id: roleInsurer.id },
      { user_id: alaraUser.id, role_id: roleAlara.id },
      { user_id: adminUser.id, role_id: roleAdmin.id },
    ],
  });

  const [client1, client2, client3] = await prisma.$transaction([
    prisma.client.create({
      data: {
        first_name: 'Paola',
        last_name: 'Ríos',
        id_type: 'PASSPORT',
        id_number: 'P-45678',
        email: 'paola.rios@email.com',
        phone_mobile: '+507 6990 1000',
        employer_name: 'Grupo Financiero Delta',
        profession: 'Directora financiera',
      },
    }),
    prisma.client.create({
      data: {
        first_name: 'Mario',
        last_name: 'Vega',
        id_type: 'CEDULA',
        id_number: '8-888-222',
        email: 'mario.vega@email.com',
        phone_mobile: '+507 6777 0101',
        employer_name: 'Vega Logistics',
        profession: 'Gerente general',
      },
    }),
    prisma.client.create({
      data: {
        first_name: 'Andrea',
        last_name: 'Ponce',
        id_type: 'CEDULA',
        id_number: '9-111-333',
        email: 'andrea.ponce@email.com',
        phone_mobile: '+57 312 456 1200',
        employer_name: 'Andes Med',
        profession: 'Cirujana',
      },
    }),
  ]);

  const [insurerClient1, insurerClient2, insurerClient3] = await prisma.$transaction([
    prisma.insurerClient.create({ data: { insurer_id: insurer1.id, client_id: client1.id, is_vip: true } }),
    prisma.insurerClient.create({ data: { insurer_id: insurer1.id, client_id: client2.id, is_vip: true } }),
    prisma.insurerClient.create({ data: { insurer_id: insurer2.id, client_id: client3.id, is_vip: true } }),
  ]);

  const [request1, request2, request3, request4] = await prisma.$transaction([
    prisma.inspectionRequest.create({
      data: {
        insurer_id: insurer1.id,
        insurer_client_id: insurerClient1.id,
        client_id: client1.id,
        request_number: 'VIP-2026-001',
        agent_name: 'Luis Gálvez',
        insured_amount: 250000,
        has_amount_in_force: true,
        responsible_name: 'Carolina Ibáñez',
        responsible_phone: '+507 6000 0101',
        responsible_email: 'insurer@palig.com',
        marital_status: 'Casada',
        comments: 'Cliente con historial premium.',
        client_notified: true,
        interview_language: 'Español',
        status: 'AGENDADA',
        assigned_investigator_user_id: alaraUser.id,
        scheduled_start_at: new Date(),
        scheduled_end_at: new Date(Date.now() + 60 * 60 * 1000),
        created_by_user_id: insurerUser1.id,
        updated_by_user_id: insurerUser1.id,
      },
    }),
    prisma.inspectionRequest.create({
      data: {
        insurer_id: insurer1.id,
        insurer_client_id: insurerClient2.id,
        client_id: client2.id,
        request_number: 'VIP-2026-002',
        responsible_name: 'Carolina Ibáñez',
        responsible_phone: '+507 6000 0101',
        responsible_email: 'insurer@palig.com',
        status: 'SOLICITADA',
        created_by_user_id: insurerUser1.id,
        updated_by_user_id: insurerUser1.id,
      },
    }),
    prisma.inspectionRequest.create({
      data: {
        insurer_id: insurer1.id,
        insurer_client_id: insurerClient1.id,
        client_id: client1.id,
        request_number: 'VIP-2026-003',
        responsible_name: 'Carolina Ibáñez',
        responsible_phone: '+507 6000 0101',
        responsible_email: 'insurer@palig.com',
        status: 'REALIZADA',
        assigned_investigator_user_id: alaraUser.id,
        completed_at: new Date(),
        report_shared_at: new Date(),
        report_shared_by_user_id: alaraUser.id,
        created_by_user_id: insurerUser1.id,
        updated_by_user_id: alaraUser.id,
      },
    }),
    prisma.inspectionRequest.create({
      data: {
        insurer_id: insurer1.id,
        insurer_client_id: insurerClient1.id,
        client_id: client1.id,
        request_number: 'VIP-2026-004',
        responsible_name: 'Carolina Ibáñez',
        responsible_phone: '+507 6000 0101',
        responsible_email: 'insurer@palig.com',
        status: 'REALIZADA',
        assigned_investigator_user_id: alaraUser.id,
        completed_at: new Date(),
        report_shared_at: null,
        report_shared_by_user_id: null,
        created_by_user_id: insurerUser1.id,
        updated_by_user_id: alaraUser.id,
      },
    }),
  ]);

  await prisma.inspectionRequestStatusHistory.createMany({
    data: [
      {
        inspection_request_id: request1.id,
        old_status: 'SOLICITADA',
        new_status: 'AGENDADA',
        note: 'Agenda confirmada',
        changed_by_user_id: alaraUser.id,
      },
      {
        inspection_request_id: request2.id,
        old_status: 'SOLICITADA',
        new_status: 'SOLICITADA',
        note: 'Solicitud creada',
        changed_by_user_id: insurerUser1.id,
      },
      {
        inspection_request_id: request3.id,
        old_status: 'AGENDADA',
        new_status: 'REALIZADA',
        note: 'Entrevista completada',
        changed_by_user_id: alaraUser.id,
      },
      {
        inspection_request_id: request4.id,
        old_status: 'AGENDADA',
        new_status: 'REALIZADA',
        note: 'Entrevista completada',
        changed_by_user_id: alaraUser.id,
      },
    ],
  });

  await prisma.calendarEvent.create({
    data: {
      inspection_request_id: request1.id,
      investigator_user_id: alaraUser.id,
      provider: 'INTERNAL',
      title: 'Entrevista VIP - Caso VIP-2026-001',
      start_at: new Date(),
      end_at: new Date(Date.now() + 60 * 60 * 1000),
      status: 'CONFIRMED',
    },
  });

  const report = await prisma.inspectionReport.create({
    data: {
      inspection_request_id: request3.id,
      created_by_user_id: alaraUser.id,
      summary: 'Entrevista realizada sin hallazgos críticos.',
      additional_comments: 'Se recomienda seguimiento anual.',
      outcome: 'FAVORABLE',
    },
  });

  const report4 = await prisma.inspectionReport.create({
    data: {
      inspection_request_id: request4.id,
      created_by_user_id: alaraUser.id,
      summary: 'Inspección realizada y enviada a aseguradora.',
      additional_comments: 'Sin hallazgos relevantes.',
      outcome: 'FAVORABLE',
    },
  });

  const section = await prisma.reportSection.create({
    data: {
      inspection_report_id: report.id,
      section_code: 'SALUD',
      section_title: 'Salud',
      section_order: 1,
    },
  });

  const section4 = await prisma.reportSection.create({
    data: {
      inspection_report_id: report4.id,
      section_code: 'DATOS_PERSONALES',
      section_title: 'Datos personales',
      section_order: 1,
    },
  });

  await prisma.reportField.createMany({
    data: [
      { report_section_id: section.id, field_key: 'condicion', field_label: 'Condición general', field_type: 'TEXT', field_value: 'Buena' },
      { report_section_id: section.id, field_key: 'medicacion', field_label: 'Medicaciones', field_type: 'TEXT', field_value: 'Ninguna' },
    ],
  });

  await prisma.reportField.createMany({
    data: [
      {
        report_section_id: section4.id,
        field_key: 'estado_general',
        field_label: 'Estado general',
        field_type: 'TEXT',
        field_value: 'Bueno',
      },
      {
        report_section_id: section4.id,
        field_key: 'observaciones',
        field_label: 'Observaciones',
        field_type: 'TEXT',
        field_value: 'Reporte enviado a aseguradora.',
      },
    ],
  });

  await prisma.investigation.create({
    data: {
      inspection_request_id: request3.id,
      created_by_user_id: alaraUser.id,
      source_type: 'NEWS',
      source_name: 'Prensa local',
      finding_summary: 'Sin registros adversos.',
      risk_level: 'BAJO',
      is_adverse_record: false,
    },
  });

  await prisma.workflowRun.create({
    data: {
      inspection_request_id: request3.id,
      provider: 'N8N',
      status: 'SUCCESS',
      request_payload: { example: true },
      response_payload: { ok: true },
      finished_at: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      insurer_id: insurer1.id,
      inspection_request_id: request1.id,
      recipient_user_id: insurerUser1.id,
      channel: 'EMAIL',
      subject: 'Inspección agendada',
      message: 'La inspección VIP ha sido agendada.',
      status: 'SENT',
      sent_at: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      insurer_id: insurer1.id,
      inspection_request_id: request3.id,
      recipient_user_id: insurerUser1.id,
      channel: 'IN_APP',
      subject: 'Reporte de inspección disponible',
      message: 'El reporte de la solicitud VIP-2026-003 fue enviado por ALARA.',
      status: 'SENT',
      sent_at: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      insurer_id: insurer1.id,
      inspection_request_id: request4.id,
      recipient_user_id: insurerUser1.id,
      channel: 'IN_APP',
      subject: 'Reporte de inspección disponible',
      message: 'El reporte de la solicitud VIP-2026-004 está pendiente de envío.',
      status: 'PENDING',
      sent_at: null,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
