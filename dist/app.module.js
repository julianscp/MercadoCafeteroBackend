"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const products_module_1 = require("./products/products.module");
const alerts_module_1 = require("./alerts/alerts.module");
const mail_module_1 = require("./mail/mail.module");
const orders_module_1 = require("./orders/orders.module");
const reclamos_module_1 = require("./reclamos/reclamos.module");
const logs_module_1 = require("./logs/logs.module");
const logging_module_1 = require("./logging/logging.module");
const metrics_module_1 = require("./metrics/metrics.module");
const payments_module_1 = require("./payments/payments.module");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const error_interceptor_1 = require("./common/interceptors/error.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            alerts_module_1.AlertsModule,
            mail_module_1.MailModule,
            orders_module_1.OrdersModule,
            reclamos_module_1.ReclamosModule,
            logs_module_1.LogsModule,
            logging_module_1.LoggingModule,
            metrics_module_1.MetricsModule,
            payments_module_1.PaymentsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: error_interceptor_1.ErrorInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map