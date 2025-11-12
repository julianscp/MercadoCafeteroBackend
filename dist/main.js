"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        configService.get('FRONTEND_URL'),
        configService.get('PRODUCTION_FRONTEND_URL'),
    ].filter(Boolean);
    app.enableCors({
        origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true,
    });
    const port = configService.get('PORT') || 3000;
    await app.listen(port);
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📧 Admin email: ${configService.get('ADMIN_EMAIL')}`);
}
bootstrap();
//# sourceMappingURL=main.js.map