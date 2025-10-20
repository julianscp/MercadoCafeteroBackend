import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    const mailHost = process.env.MAIL_HOST;
    const mailUser = process.env.MAIL_USER;
    const mailPass = process.env.MAIL_PASS;

    if (!mailHost || !mailUser || !mailPass) {
      this.logger.warn('⚠️ No se encontraron las variables de entorno de email (MAIL_HOST, MAIL_USER, MAIL_PASS). El servicio de correo estará deshabilitado.');
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport({
        host: mailHost,
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: false,
        auth: {
          user: mailUser,
          pass: mailPass,
        },
      });
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    if (!this.transporter) {
      this.logger.warn(`📧 [SIMULADO] Correo no enviado - Servicio deshabilitado. Para: ${to}, Asunto: ${subject}`);
      return { id: 'simulated-email-id' };
    }

    try {
      const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER || 'Mercado Cafetero';

      const info = await this.transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html,
      });

      this.logger.log(`✅ Correo enviado correctamente. ID: ${info.messageId}`);
      return { id: info.messageId };
    } catch (error: any) {
      this.logger.error(`❌ Error inesperado: ${error.message}`);
      throw error;
    }
  }

  async sendStockAlert(to: string, producto: string, stock: number) {
    const subject = `⚠️ Stock bajo: ${producto}`;
    const text = `El producto "${producto}" está en nivel crítico (${stock} unidades).`;
    const html = `
      <h2>⚠️ Alerta de stock bajo</h2>
      <p>El producto <strong>${producto}</strong> está en nivel crítico.</p>
      <p>Unidades restantes: <strong>${stock}</strong></p>
    `;
    return this.sendMail(to, subject, text, html);
  }

  async sendVerificationCode(to: string, code: string) {
    const subject = 'Verifica tu cuenta - Mercado Cafetero';
    const html = `
      <h2>Verificación de cuenta</h2>
      <p>Tu código de verificación es:</p>
      <h3>${code}</h3>
      <p>Este código expirará en 10 minutos.</p>
    `;
    const text = `Tu código de verificación es ${code}`;
    return this.sendMail(to, subject, text, html);
  }
}
