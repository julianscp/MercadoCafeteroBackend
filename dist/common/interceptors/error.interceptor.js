"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let ErrorInterceptor = class ErrorInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.catchError)((error) => {
            console.error('Error caught by interceptor:', error);
            if (error.code === 'P2002') {
                return (0, rxjs_1.throwError)(() => new common_1.HttpException('El recurso ya existe en la base de datos', common_1.HttpStatus.CONFLICT));
            }
            if (error.code === 'P2025') {
                return (0, rxjs_1.throwError)(() => new common_1.HttpException('Recurso no encontrado', common_1.HttpStatus.NOT_FOUND));
            }
            if (error.name === 'ValidationError') {
                return (0, rxjs_1.throwError)(() => new common_1.HttpException('Datos de entrada inválidos', common_1.HttpStatus.BAD_REQUEST));
            }
            if (error instanceof common_1.HttpException) {
                return (0, rxjs_1.throwError)(() => error);
            }
            return (0, rxjs_1.throwError)(() => new common_1.HttpException('Error interno del servidor', common_1.HttpStatus.INTERNAL_SERVER_ERROR));
        }));
    }
};
exports.ErrorInterceptor = ErrorInterceptor;
exports.ErrorInterceptor = ErrorInterceptor = __decorate([
    (0, common_1.Injectable)()
], ErrorInterceptor);
//# sourceMappingURL=error.interceptor.js.map