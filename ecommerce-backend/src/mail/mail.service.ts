import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ No se encontró SENDGRID_API_KEY en las variables de entorno. El servicio de correo estará deshabilitado.');
      this.isEnabled = false;
    } else {
      sgMail.setApiKey(apiKey);
      this.isEnabled = true;
      this.logger.log('✅ SendGrid configurado correctamente');
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    if (!this.isEnabled) {
      this.logger.warn(`📧 [SIMULADO] Correo no enviado - Servicio deshabilitado. Para: ${to}, Asunto: ${subject}`);
      return { id: 'simulated-email-id' };
    }

    try {
      const fromEmail = process.env.SENDGRID_FROM || 'noreply@mercadocafetero.com';

      const msg = {
        to,
        from: fromEmail,
        subject,
        text,
        html,
      };

      const [response] = await sgMail.send(msg);

      this.logger.log(`✅ Correo enviado correctamente. Status: ${response.statusCode}`);
      return { id: response.headers['x-message-id'] || 'sent' };
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo: ${error.message}`);
      if (error.response) {
        this.logger.error(`Detalles: ${JSON.stringify(error.response.body)}`);
      }
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
