import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class RequestMailService {
  private readonly logger = new Logger(RequestMailService.name);

  async sendRequestCreatedPdf(params: { requestNumber: string; pdfFilename: string; pdfBuffer: Buffer }) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM ?? 'no-reply@alara.local';
    const to = process.env.REQUEST_CREATED_NOTIFY_TO ?? 'amelia.fuentes.barahona@gmail.com';

    if (!host || !user || !pass) {
      this.logger.warn('SMTP no configurado. Omitiendo envio de correo con PDF de solicitud.');
      return { sent: false as const, reason: 'smtp_not_configured' };
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

    return { sent: true as const };
  }
}
