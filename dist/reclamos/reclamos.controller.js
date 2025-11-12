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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReclamosController = void 0;
const common_1 = require("@nestjs/common");
const reclamos_service_1 = require("./reclamos.service");
const create_reclamo_dto_1 = require("./dto/create-reclamo.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let ReclamosController = class ReclamosController {
    reclamosService;
    constructor(reclamosService) {
        this.reclamosService = reclamosService;
    }
    createReclamo(req, createReclamoDto) {
        const userId = req.user.userId;
        return this.reclamosService.createReclamo(userId, createReclamoDto);
    }
    findReclamosByUser(req) {
        const userId = req.user.userId;
        return this.reclamosService.findReclamosByUser(userId);
    }
    findReclamoById(req, id) {
        const userId = req.user.userId;
        return this.reclamosService.findReclamoById(id, userId);
    }
    findAllReclamos() {
        return this.reclamosService.findAllReclamos();
    }
    updateReclamoStatus(id, estado) {
        return this.reclamosService.updateReclamoStatus(id, estado);
    }
    respondToReclamo(id, respuesta) {
        return this.reclamosService.respondToReclamo(id, respuesta);
    }
};
exports.ReclamosController = ReclamosController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('reclamos'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_reclamo_dto_1.CreateReclamoDto]),
    __metadata("design:returntype", void 0)
], ReclamosController.prototype, "createReclamo", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('reclamos'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReclamosController.prototype, "findReclamosByUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('reclamos/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], ReclamosController.prototype, "findReclamoById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('admin/reclamos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReclamosController.prototype, "findAllReclamos", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)('admin/reclamos/:id/estado'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('estado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], ReclamosController.prototype, "updateReclamoStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)('admin/reclamos/:id/responder'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('respuesta')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], ReclamosController.prototype, "respondToReclamo", null);
exports.ReclamosController = ReclamosController = __decorate([
    (0, common_1.Controller)('clientes'),
    __metadata("design:paramtypes", [reclamos_service_1.ReclamosService])
], ReclamosController);
//# sourceMappingURL=reclamos.controller.js.map