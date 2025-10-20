import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  // Contador de pedidos
  private ordersCounter = new Counter({
    name: 'orders_total',
    help: 'Total de pedidos realizados',
    labelNames: ['status'],
  });

  // Histograma de tiempo de respuesta de APIs
  private responseTime = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de las peticiones HTTP',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  // Gauge de productos en stock
  private stockGauge = new Gauge({
    name: 'products_stock',
    help: 'Stock actual de productos',
    labelNames: ['product_id', 'product_name'],
  });

  // Contador de usuarios activos
  private activeUsersGauge = new Gauge({
    name: 'active_users',
    help: 'Número de usuarios activos',
  });

  // Contador de errores
  private errorsCounter = new Counter({
    name: 'errors_total',
    help: 'Total de errores en el sistema',
    labelNames: ['type', 'endpoint'],
  });

  // Contador de logins
  private loginCounter = new Counter({
    name: 'login_total',
    help: 'Total de intentos de login',
    labelNames: ['status'],
  });

  constructor() {
    // Las métricas se registran automáticamente al ser creadas
    // No necesitamos registrarlas manualmente
  }

  // Métodos para registrar métricas
  incrementOrders(status: 'success' | 'error') {
    this.ordersCounter.inc({ status });
  }

  recordResponseTime(method: string, route: string, status: string, duration: number) {
    this.responseTime.observe({ method, route, status }, duration);
  }

  setProductStock(productId: number, productName: string, stock: number) {
    this.stockGauge.set({ product_id: productId.toString(), product_name: productName }, stock);
  }

  setActiveUsers(count: number) {
    this.activeUsersGauge.set(count);
  }

  incrementErrors(type: string, endpoint: string) {
    this.errorsCounter.inc({ type, endpoint });
  }

  incrementLogin(status: 'success' | 'failed') {
    this.loginCounter.inc({ status });
  }

  // Obtener todas las métricas en formato Prometheus
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}

