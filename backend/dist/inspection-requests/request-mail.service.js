"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RequestMailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestMailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let RequestMailService = RequestMailService_1 = class RequestMailService {
    constructor() {
        this.logger = new common_1.Logger(RequestMailService_1.name);
    }
    async sendRequestCreatedPdf(params) {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT ?? 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM ?? 'no-reply@alara.local';
        const to = process.env.REQUEST_CREATED_NOTIFY_TO ?? 'amelia.fuentes.barahona@gmail.com';
        if (!host || !user || !pass) {
            this.logger.warn('SMTP no configurado. Omitiendo envio de correo con PDF de solicitud.');
            return { sent: false, reason: 'smtp_not_configured' };
        }
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
        await transporter.sendMail({
            from,
            to,
            subject: `Nueva solicitud creada: ${params.requestNumber}`,
            text: `Se adjunta el PDF de la solicitud ${params.requestNumber}.`,
            attachments: [
                {
                    filename: params.pdfFilename,
                    content: params.pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        });
        return { sent: true };
    }
};
exports.RequestMailService = RequestMailService;
exports.RequestMailService = RequestMailService = RequestMailService_1 = __decorate([
    (0, common_1.Injectable)()
], RequestMailService);
//# sourceMappingURL=request-mail.service.js.map