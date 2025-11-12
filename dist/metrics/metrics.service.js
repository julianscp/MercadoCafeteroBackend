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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let MetricsService = class MetricsService {
    ordersCounter = new prom_client_1.Counter({
        name: 'orders_total',
        help: 'Total de pedidos realizados',
        labelNames: ['status'],
    });
    responseTime = new prom_client_1.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duración de las peticiones HTTP',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
    });
    stockGauge = new prom_client_1.Gauge({
        name: 'products_stock',
        help: 'Stock actual de productos',
        labelNames: ['product_id', 'product_name'],
    });
    activeUsersGauge = new prom_client_1.Gauge({
        name: 'active_users',
        help: 'Número de usuarios activos',
    });
    errorsCounter = new prom_client_1.Counter({
        name: 'errors_total',
        help: 'Total de errores en el sistema',
        labelNames: ['type', 'endpoint'],
    });
    loginCounter = new prom_client_1.Counter({
        name: 'login_total',
        help: 'Total de intentos de login',
        labelNames: ['status'],
    });
    constructor() {
    }
    incrementOrders(status) {
        this.ordersCounter.inc({ status });
    }
    recordResponseTime(method, route, status, duration) {
        this.responseTime.observe({ method, route, status }, duration);
    }
    setProductStock(productId, productName, stock) {
        this.stockGauge.set({ product_id: productId.toString(), product_name: productName }, stock);
    }
    setActiveUsers(count) {
        this.activeUsersGauge.set(count);
    }
    incrementErrors(type, endpoint) {
        this.errorsCounter.inc({ type, endpoint });
    }
    incrementLogin(status) {
        this.loginCounter.inc({ status });
    }
    async getMetrics() {
        return prom_client_1.register.metrics();
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map