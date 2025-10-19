# 🚀 Guía de Despliegue en Vercel - Backend

## Paso a Paso para Desplegar el Backend

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en GitHub y que el repositorio sea público o que Vercel tenga acceso.

### 2. Desplegar en Vercel

#### Opción A: Desde la Interfaz Web

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en "Add New Project"
3. Importa tu repositorio del backend
4. Configura el proyecto:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (raíz del repositorio)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Opción B: Desde la CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Iniciar sesión
vercel login

# Desplegar
vercel

# Para producción
vercel --prod
```

### 3. Configurar Variables de Entorno

En la configuración del proyecto en Vercel, agrega estas variables:

#### Variables Requeridas:
```
DATABASE_URL=tu_url_de_postgresql
JWT_SECRET=tu_secret_key_muy_segura_minimo_32_caracteres
JWT_EXPIRES_IN=1h
NODE_ENV=production
```

#### Variables Opcionales (para funcionalidades adicionales):
```
RESEND_API_KEY=tu_api_key_de_resend
RESEND_SENDER=Mercado Cafetero <noreply@tudominio.com>
ADMIN_EMAIL=admin@tudominio.com
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
FRONTEND_URL=https://tu-frontend.vercel.app
PRODUCTION_FRONTEND_URL=https://tu-frontend.vercel.app
```

### 4. Configurar Base de Datos

#### Opción A: Vercel Postgres (Recomendado)
1. En tu proyecto de Vercel, ve a la pestaña "Storage"
2. Crea una nueva base de datos PostgreSQL
3. Copia la URL de conexión y úsala como `DATABASE_URL`
4. Ejecuta las migraciones:
   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy
   ```

#### Opción B: Servicios Externos
- **Supabase**: https://supabase.com (gratis)
- **Neon**: https://neon.tech (gratis)
- **Railway**: https://railway.app (tiene tier gratis)

### 5. Ejecutar Migraciones de Base de Datos

Después de configurar la base de datos, ejecuta las migraciones:

```bash
# Conectar a la base de datos de producción
npx prisma migrate deploy
```

### 6. Verificar el Despliegue

Una vez desplegado, Vercel te dará una URL como:
`https://tu-backend-xyz.vercel.app`

Prueba acceder a:
- `https://tu-backend-xyz.vercel.app/api` (debería mostrar la API)

### 7. Configurar CORS

Asegúrate de que la variable `FRONTEND_URL` o `PRODUCTION_FRONTEND_URL` esté configurada con la URL de tu frontend desplegado.

## 🔧 Troubleshooting

### Error: "Cannot find module"
- Asegúrate de que todas las dependencias estén en `package.json`
- Verifica que el comando de instalación sea correcto

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos esté accesible desde internet

### Error: "JWT_SECRET is required"
- Verifica que la variable `JWT_SECRET` esté configurada en Vercel

## 📝 Notas Importantes

- Vercel ejecuta aplicaciones NestJS como funciones serverless
- El archivo `vercel-entry.ts` actúa como adaptador para Vercel
- Las funciones serverless tienen un timeout de 10 segundos en el plan gratuito
- Para operaciones largas, considera usar el plan Pro de Vercel

## 🔗 Enlaces Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [NestJS en Vercel](https://vercel.com/guides/deploying-nestjs-to-vercel)
- [Prisma en Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
