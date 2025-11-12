"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReclamosModule = void 0;
const common_1 = require("@nestjs/common");
const reclamos_controller_1 = require("./reclamos.controller");
const reclamos_service_1 = require("./reclamos.service");
const prisma_module_1 = require("../prisma/prisma.module");
const mail_module_1 = require("../mail/mail.module");
let ReclamosModule = class ReclamosModule {
};
exports.ReclamosModule = ReclamosModule;
exports.ReclamosModule = ReclamosModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, mail_module_1.MailModule],
        controllers: [reclamos_controller_1.ReclamosController],
        providers: [reclamos_service_1.ReclamosService],
        exports: [reclamos_service_1.ReclamosService],
    })
], ReclamosModule);
//# sourceMappingURL=reclamos.module.js.map