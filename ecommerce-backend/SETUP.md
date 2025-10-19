# Mercado Cafetero - Guía de Configuración

## 🚀 Configuración del Backend

### Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del backend (`MCIS3Back-main/ecommerce-backend/`) con las siguientes variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mercadocafetero"

# JWT (OBLIGATORIO - mínimo 32 caracteres)
JWT_SECRET="your-super-secret-jwt-key-here-minimum-32-characters"

# Email Service (Resend)
RESEND_API_KEY="your-resend-api-key"
RESEND_SENDER="Mercado Cafetero <noreply@yourdomain.com>"

# Admin Email for Stock Alerts
ADMIN_EMAIL="admin@yourdomain.com"

# Cloudinary
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"

# Server
PORT=3000
NODE_ENV="development"

# Frontend URLs (opcional)
FRONTEND_URL="http://localhost:3001"
PRODUCTION_FRONTEND_URL="https://your-production-domain.com"
```

### Instalación y Ejecución

```bash
cd MCIS3Back-main/ecommerce-backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:dev
```

## 🎨 Configuración del Frontend

### Variables de Entorno Requeridas

Crea un archivo `.env.local` en la raíz del frontend (`MCIS3Front-main/`) con:

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
```

### Instalación y Ejecución

```bash
cd MCIS3Front-main
npm install
npm run dev
```

## 🔒 Mejoras de Seguridad Implementadas

### 1. JWT Secret Obligatorio
- ✅ Eliminado fallback hardcodeado
- ✅ Validación de existencia del JWT_SECRET
- ✅ Validación de payload del token

### 2. Rate Limiting
- ✅ 100 requests/minuto globalmente
- ✅ 5 registros/minuto para registro
- ✅ 10 intentos/minuto para login
- ✅ 3 solicitudes/5min para reset de contraseña

### 3. Validación de Entrada
- ✅ Validación global con ValidationPipe
- ✅ Validaciones específicas en DTOs
- ✅ Mensajes de error en español

### 4. Manejo de Errores
- ✅ Interceptor global de errores
- ✅ Logging estructurado
- ✅ Transformación de errores de Prisma
- ✅ Manejo de errores HTTP

### 5. CORS Configurable
- ✅ URLs dinámicas desde variables de entorno
- ✅ Configuración flexible para desarrollo/producción

## 📊 Monitoreo y Logs

El sistema ahora incluye:

- **Logging de Requests**: Cada request se registra con método, URL, usuario y tiempo de respuesta
- **Logging de Errores**: Errores detallados con stack traces
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Validación Global**: Validación automática de todos los DTOs

## 🚨 Consideraciones de Producción

1. **JWT_SECRET**: Usa una clave segura de al menos 32 caracteres
2. **Database**: Configura conexión SSL en producción
3. **CORS**: Limita orígenes solo a tus dominios de producción
4. **Rate Limiting**: Ajusta límites según tu tráfico esperado
5. **Logging**: Considera usar un servicio de logging como Winston
6. **Monitoring**: Implementa métricas y alertas

## 🔧 Troubleshooting

### Error: "JWT_SECRET environment variable is required"
- Verifica que el archivo `.env` existe y contiene `JWT_SECRET`
- Reinicia el servidor después de agregar la variable

### Error: "Too Many Requests"
- El rate limiting está funcionando
- Espera el tiempo especificado antes de reintentar

### Error de CORS
- Verifica que `FRONTEND_URL` esté configurado correctamente
- Asegúrate de que la URL del frontend coincida exactamente
