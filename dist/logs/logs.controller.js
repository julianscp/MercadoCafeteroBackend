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
exports.LogsController = void 0;
const common_1 = require("@nestjs/common");
const logging_service_1 = require("../logging/logging.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let LogsController = class LogsController {
    loggingService;
    constructor(loggingService) {
        this.loggingService = loggingService;
    }
    async getLogs(level, event, userEmail, dateFrom, dateTo) {
        const logLevel = level ? level : undefined;
        const logEvent = event ? event : undefined;
        return this.loggingService.getLogs({
            level: logLevel,
            event: logEvent,
            userEmail,
            startDate: dateFrom ? new Date(dateFrom) : undefined,
            endDate: dateTo ? new Date(dateTo) : undefined,
        });
    }
};
exports.LogsController = LogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('level')),
    __param(1, (0, common_1.Query)('event')),
    __param(2, (0, common_1.Query)('userEmail')),
    __param(3, (0, common_1.Query)('dateFrom')),
    __param(4, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LogsController.prototype, "getLogs", null);
exports.LogsController = LogsController = __decorate([
    (0, common_1.Controller)('logs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [logging_service_1.LoggingService])
], LogsController);
//# sourceMappingURL=logs.controller.js.map