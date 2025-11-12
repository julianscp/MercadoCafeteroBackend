"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const mail_1 = __importDefault(require("@sendgrid/mail"));
let MailService = MailService_1 = class MailService {
    logger = new common_1.Logger(MailService_1.name);
    isEnabled;
    constructor() {
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            this.logger.warn('⚠️ No se encontró SENDGRID_API_KEY en las variables de entorno. El servicio de correo estará deshabilitado.');
            this.isEnabled = false;
        }
        else {
            mail_1.default.setApiKey(apiKey);
            this.isEnabled = true;
            this.logger.log('✅ SendGrid configurado correctamente');
        }
    }
    async sendMail(to, subject, text, html) {
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
            const [response] = await mail_1.default.send(msg);
            this.logger.log(`✅ Correo enviado correctamente. Status: ${response.statusCode}`);
            return { id: response.headers['x-message-id'] || 'sent' };
        }
        catch (error) {
            this.logger.error(`❌ Error al enviar correo: ${error.message}`);
            if (error.response) {
                this.logger.error(`Detalles: ${JSON.stringify(error.response.body)}`);
            }
            throw error;
        }
    }
    async sendStockAlert(to, producto, stock) {
        const subject = `⚠️ Stock bajo: ${producto}`;
        const text = `El producto "${producto}" está en nivel crítico (${stock} unidades).`;
        const html = `
      <h2>⚠️ Alerta de stock bajo</h2>
      <p>El producto <strong>${producto}</strong> está en nivel crítico.</p>
      <p>Unidades restantes: <strong>${stock}</strong></p>
    `;
        return this.sendMail(to, subject, text, html);
    }
    async sendVerificationCode(to, code) {
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
    async sendComplaintResponse(to, nombre, reclamoId, respuesta) {
        const subject = `Respuesta a tu reclamo #${reclamoId} - Mercado Cafetero`;
        const html = `
      <h2>Hola ${nombre},</h2>
      <p>Hemos respondido a tu reclamo #${reclamoId}.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Respuesta del administrador:</h3>
        <p>${respuesta}</p>
      </div>
      <p>Puedes ver tu reclamo y la respuesta en tu panel de cliente.</p>
      <p>Saludos,<br>Equipo de Mercado Cafetero</p>
    `;
        const text = `Hola ${nombre},\n\nHemos respondido a tu reclamo #${reclamoId}.\n\nRespuesta: ${respuesta}\n\nPuedes ver tu reclamo en tu panel de cliente.`;
        return this.sendMail(to, subject, text, html);
    }
    async sendOrderConfirmation(to, nombre, orderId, productos, total, direccionEnvio) {
        const subject = `Confirmación de compra #${orderId} - Mercado Cafetero`;
        const productosHtml = productos.map(p => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${p.nombre}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${p.precio.toLocaleString('es-CO')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${p.subtotal.toLocaleString('es-CO')}</td>
      </tr>
    `).join('');
        const html = `
      <h2>¡Gracias por tu compra, ${nombre}!</h2>
      <p>Tu pedido #${orderId} ha sido confirmado y está siendo procesado.</p>
      
      <h3>Detalles del pedido:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db;">Producto</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Cantidad</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Precio Unitario</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${productosHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #d1d5db;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #d1d5db;">$${total.toLocaleString('es-CO')}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3>📍 Dirección de envío:</h3>
        <p>${direccionEnvio}</p>
      </div>

      <p>Te notificaremos cuando tu pedido sea despachado.</p>
      <p>Saludos,<br>Equipo de Mercado Cafetero</p>
    `;
        const productosText = productos.map(p => `- ${p.nombre} x${p.cantidad} = $${p.subtotal.toLocaleString('es-CO')}`).join('\n');
        const text = `¡Gracias por tu compra, ${nombre}!\n\nTu pedido #${orderId} ha sido confirmado.\n\nProductos:\n${productosText}\n\nTotal: $${total.toLocaleString('es-CO')}\n\nDirección de envío: ${direccionEnvio}\n\nTe notificaremos cuando tu pedido sea despachado.`;
        return this.sendMail(to, subject, text, html);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailService);
//# sourceMappingURL=mail.service.js.map