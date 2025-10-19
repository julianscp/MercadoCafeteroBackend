import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ No se encontró RESEND_API_KEY en las variables de entorno. El servicio de correo estará deshabilitado.');
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    if (!this.resend) {
      this.logger.warn(`📧 [SIMULADO] Correo no enviado - Servicio deshabilitado. Para: ${to}, Asunto: ${subject}`);
      return { id: 'simulated-email-id' };
    }

    try {
      const fromEmail = process.env.RESEND_SENDER || 'Mercado Cafetero <onboarding@resend.dev>';

      const response = await this.resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        text,
        html,
      });

      if (response.error) {
        this.logger.error(`❌ Error al enviar correo: ${response.error.message}`);
        throw new Error(response.error.message);
      }

      this.logger.log(`✅ Correo enviado correctamente. ID: ${response.data?.id}`);
      return { id: response.data?.id };
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
