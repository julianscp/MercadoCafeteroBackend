"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const mail_service_1 = require("../mail/mail.service");
const logging_service_1 = require("../logging/logging.service");
const metrics_service_1 = require("../metrics/metrics.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    mailService;
    loggingService;
    metricsService;
    constructor(prisma, jwtService, mailService, loggingService, metricsService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.loggingService = loggingService;
        this.metricsService = metricsService;
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser)
            throw new common_1.BadRequestException('Email ya registrado');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const verificationCode = Math.floor(1000000 + Math.random() * 9000000).toString();
        const verificationExpires = new Date(Date.now() + 1000 * 60 * 15);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                nombre: dto.nombre,
                direccion: dto.direccion,
                telefono: dto.telefono,
                rol: 'cliente',
                verificado: false,
                verificationCode,
                verificationExpires,
            },
        });
        const confirmUrl = `http://localhost:3000/auth/confirm-email?token=${verificationCode}`;
        await this.mailService.sendVerificationCode(user.email, verificationCode);
        await this.loggingService.logEvent({
            event: 'REGISTER',
            level: 'INFO',
            message: `Usuario ${user.email} se registró exitosamente`,
            userId: user.id,
            userEmail: user.email,
        });
        const { password, verificationCode: _, verificationExpires: __, ...result } = user;
        return { message: 'Registro exitoso. Revisa tu correo para confirmar la cuenta.', user: result };
    }
    async confirmEmail(email, code) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        if (user.verificado) {
            return { message: 'El correo ya está verificado.' };
        }
        if (!user.verificationCode || !user.verificationExpires) {
            throw new common_1.BadRequestException('No se generó un código de verificación.');
        }
        if (user.verificationCode !== code) {
            throw new common_1.BadRequestException('Código inválido.');
        }
        if (user.verificationExpires < new Date()) {
            throw new common_1.BadRequestException('El código ha expirado.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verificado: true,
                verificationCode: null,
                verificationExpires: null,
            },
        });
        await this.loggingService.logEvent({
            event: 'EMAIL_VERIFICATION',
            level: 'INFO',
            message: `Usuario ${user.email} verificó su correo electrónico`,
            userId: user.id,
            userEmail: user.email,
        });
        return { message: 'Correo verificado con éxito. Ya puedes iniciar sesión.' };
    }
    async resendVerificationCode(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        if (user.verificado)
            throw new common_1.BadRequestException('La cuenta ya está verificada');
        const newCode = Math.floor(1000000 + Math.random() * 9000000).toString();
        const newExpires = new Date(Date.now() + 1000 * 60 * 15);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: newCode,
                verificationExpires: newExpires,
            },
        });
        await this.mailService.sendMail(user.email, 'Reenvío de código de verificación', `Tu nuevo código es: ${newCode}`, `<p>Tu nuevo código de verificación es: <b>${newCode}</b></p>`);
        return { message: 'Se ha enviado un nuevo código de verificación.' };
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.UnauthorizedException('Email no registrado');
        if (user.lockUntil && user.lockUntil > new Date()) {
            throw new common_1.UnauthorizedException('Cuenta bloqueada temporalmente. Intenta más tarde.');
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            let failedAttempts = user.failedAttempts + 1;
            let lockUntil = null;
            if (failedAttempts >= 3) {
                lockUntil = new Date(Date.now() + 1000 * 60 * 15);
                failedAttempts = 0;
                await this.mailService.sendMail(user.email, 'Están intentando acceder a tu cuenta', `Tu cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos de inicio de sesión.\n\nSi no fuiste tú, considera cambiar tu contraseña e ingresar en 15 minutos.`);
                await this.loggingService.logAccountLocked(user.email, 'Múltiples intentos fallidos de inicio de sesión');
            }
            await this.prisma.user.update({
                where: { email },
                data: { failedAttempts, lockUntil },
            });
            await this.loggingService.logFailedLogin(email, 'Contraseña incorrecta');
            this.metricsService.incrementLogin('failed');
            throw new common_1.UnauthorizedException('Contraseña incorrecta');
        }
        await this.prisma.user.update({
            where: { email },
            data: { failedAttempts: 0, lockUntil: null },
        });
        if (!user.verificado) {
            throw new common_1.UnauthorizedException('Debes confirmar tu correo antes de iniciar sesión.');
        }
        return user;
    }
    async login(dto, ipAddress, userAgent) {
        const user = await this.validateUser(dto.email, dto.password);
        const payload = { sub: user.id, email: user.email, role: user.rol };
        await this.loggingService.logLogin(user.id, user.email, ipAddress, userAgent);
        this.metricsService.incrementLogin('success');
        return { access_token: this.jwtService.sign(payload) };
    }
    async requestPasswordReset(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        const token = (0, crypto_1.randomBytes)(20).toString('hex');
        await this.prisma.user.update({
            where: { email: dto.email },
            data: {
                resetToken: token,
                resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 15),
            },
        });
        await this.mailService.sendMail(user.email, 'Recupera tu contraseña', `Tu token es: ${token}`, `<p>Tu token de recuperación es: <b>${token}</b></p>`);
        return { message: 'Se envió el enlace de recuperación. Revisa tu correo (o vista previa en consola).' };
    }
    async resetPassword(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: dto.token,
                resetTokenExpiry: { gt: new Date() },
            },
        });
        if (!user)
            throw new common_1.BadRequestException('Token inválido o expirado');
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });
        return { message: 'Contraseña actualizada con éxito' };
    }
    async checkEmail(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        return { available: !user };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService,
        logging_service_1.LoggingService,
        metrics_service_1.MetricsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map