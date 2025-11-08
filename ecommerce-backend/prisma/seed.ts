import { PrismaClient, ProductEstado } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear usuario administrador (solo si no existe)
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@mercadocafetero.com' },
  });

  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        email: 'admin@mercadocafetero.com',
        password: hashedPassword,
        rol: 'admin',
        nombre: 'Administrador',
        direccion: 'Calle Principal 123',
        telefono: '3001234567',
        verificado: true,
      },
    });
    console.log('✅ Usuario administrador creado:', admin.email);
  } else {
    console.log('ℹ️ Usuario administrador ya existe:', admin.email);
  }

  // Crear usuario cliente de ejemplo (solo si no existe)
  let cliente = await prisma.user.findUnique({
    where: { email: 'cliente@ejemplo.com' },
  });

  if (!cliente) {
    const clientPassword = await bcrypt.hash('cliente123', 10);
    cliente = await prisma.user.create({
      data: {
        email: 'cliente@ejemplo.com',
        password: clientPassword,
        rol: 'cliente',
        nombre: 'Juan Pérez',
        direccion: 'Calle Secundaria 456',
        telefono: '3009876543',
        verificado: true,
      },
    });
    console.log('✅ Usuario cliente creado:', cliente.email);
  } else {
    console.log('ℹ️ Usuario cliente ya existe:', cliente.email);
  }

  // Crear productos de café con imágenes
  const productos = [
    {
      nombre: 'Café Premium Colombia',
      descripcion: 'Café de origen colombiano, grano arábica de alta calidad con notas de chocolate y caramelo.',
      precio: 25000,
      stock: 50,
      stockMinimo: 10,
      categoria: 'Café en Grano',
      subcategoria: 'Arábica',
      marca: 'Café Colombia',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Molido Tradicional',
      descripcion: 'Café molido tradicional, perfecto para cafetera de filtro. Sabor suave y aromático.',
      precio: 18000,
      stock: 75,
      stockMinimo: 15,
      categoria: 'Café Molido',
      subcategoria: 'Tradicional',
      marca: 'Café Tradicional',
      descuento: 5,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Instantáneo Premium',
      descripcion: 'Café instantáneo de alta calidad, fácil de preparar y con excelente sabor.',
      precio: 12000,
      stock: 100,
      stockMinimo: 20,
      categoria: 'Café Instantáneo',
      subcategoria: 'Premium',
      marca: 'Café Express',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Descafeinado',
      descripcion: 'Café descafeinado manteniendo todo el sabor y aroma del café tradicional.',
      precio: 22000,
      stock: 30,
      stockMinimo: 8,
      categoria: 'Café en Grano',
      subcategoria: 'Descafeinado',
      marca: 'Café Natural',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Orgánico',
      descripcion: 'Café orgánico certificado, cultivado sin pesticidas ni químicos.',
      precio: 30000,
      stock: 25,
      stockMinimo: 5,
      categoria: 'Café en Grano',
      subcategoria: 'Orgánico',
      marca: 'Café Verde',
      descuento: 10,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Espresso Italiano',
      descripcion: 'Mezcla italiana tradicional para espresso, intenso y cremoso.',
      precio: 28000,
      stock: 40,
      stockMinimo: 10,
      categoria: 'Café Molido',
      subcategoria: 'Espresso',
      marca: 'Café Italiano',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café de Origen Etiopía',
      descripcion: 'Café de origen etíope, conocido por sus notas florales y cítricas únicas.',
      precio: 35000,
      stock: 8,
      stockMinimo: 5,
      categoria: 'Café en Grano',
      subcategoria: 'Origen Único',
      marca: 'Café Etiopía',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Molido Suave',
      descripcion: 'Café molido con perfil de tueste suave, ideal para quienes prefieren sabores más ligeros.',
      precio: 16000,
      stock: 60,
      stockMinimo: 12,
      categoria: 'Café Molido',
      subcategoria: 'Suave',
      marca: 'Café Suave',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Intenso',
      descripcion: 'Café con tueste intenso, para quienes buscan sabores fuertes y robustos.',
      precio: 20000,
      stock: 35,
      stockMinimo: 8,
      categoria: 'Café Molido',
      subcategoria: 'Intenso',
      marca: 'Café Fuerte',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Gourmet Blend',
      descripcion: 'Mezcla gourmet de diferentes orígenes, balance perfecto entre sabor y aroma.',
      precio: 32000,
      stock: 12,
      stockMinimo: 3,
      categoria: 'Café en Grano',
      subcategoria: 'Gourmet',
      marca: 'Café Gourmet',
      descuento: 15,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Capuchino en Grano',
      descripcion: 'Café especial para capuchino, con notas cremosas y dulces perfectas para leche.',
      precio: 27000,
      stock: 45,
      stockMinimo: 10,
      categoria: 'Café en Grano',
      subcategoria: 'Especial',
      marca: 'Café Delicioso',
      descuento: 0,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop',
    },
    {
      nombre: 'Café Americano Premium',
      descripcion: 'Café americano premium, suave y equilibrado ideal para cualquier momento del día.',
      precio: 19000,
      stock: 55,
      stockMinimo: 12,
      categoria: 'Café Molido',
      subcategoria: 'Americano',
      marca: 'Café Premium',
      descuento: 8,
      estado: ProductEstado.ACTIVO,
      imagenUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
    },
  ];

  // Crear productos (solo si no existen)
  for (const producto of productos) {
    const existe = await prisma.product.findFirst({
      where: { nombre: producto.nombre },
    });

    if (!existe) {
      const createdProduct = await prisma.product.create({
        data: producto,
      });
      console.log(`✅ Producto creado: ${createdProduct.nombre}`);
    } else {
      // Actualizar imagen si el producto existe pero no tiene imagen
      if (!existe.imagenUrl && producto.imagenUrl) {
        await prisma.product.update({
          where: { id: existe.id },
          data: { imagenUrl: producto.imagenUrl },
        });
        console.log(`🖼️ Imagen agregada a: ${existe.nombre}`);
      } else {
        console.log(`ℹ️ Producto ya existe: ${producto.nombre}`);
      }
    }
  }

  // Crear algunas órdenes de ejemplo
  const orden1 = await prisma.order.create({
    data: {
      userId: cliente.id,
      products: JSON.stringify([
        { id: 1, nombre: 'Café Premium Colombia', cantidad: 2, precio: 25000 },
        { id: 2, nombre: 'Café Molido Tradicional', cantidad: 1, precio: 18000 },
      ]),
      total: 68000,
      status: 'completado',
    },
  });

  const orden2 = await prisma.order.create({
    data: {
      userId: cliente.id,
      products: JSON.stringify([
        { id: 3, nombre: 'Café Instantáneo Premium', cantidad: 3, precio: 12000 },
      ]),
      total: 36000,
      status: 'pendiente',
    },
  });

  console.log('✅ Órdenes de ejemplo creadas');

  // Crear algunos reclamos de ejemplo
  const reclamo1 = await prisma.reclamo.create({
    data: {
      userId: cliente.id,
      orderId: orden1.id,
      mensaje: 'El café llegó un poco tarde pero en buen estado. Gracias.',
      estado: 'resuelto',
    },
  });

  console.log('✅ Reclamos de ejemplo creados');

  // Crear algunos logs de stock de ejemplo
  await prisma.stockLog.createMany({
    data: [
      {
        productoId: 1,
        cantidad: 50,
        tipo: 'ENTRADA',
        usuarioId: admin.id,
      },
      {
        productoId: 2,
        cantidad: 30,
        tipo: 'ENTRADA',
        usuarioId: admin.id,
      },
      {
        productoId: 3,
        cantidad: -5,
        tipo: 'SALIDA',
        usuarioId: cliente.id,
      },
      {
        productoId: 4,
        cantidad: 25,
        tipo: 'ENTRADA',
        usuarioId: admin.id,
      },
      {
        productoId: 5,
        cantidad: -2,
        tipo: 'SALIDA',
        usuarioId: cliente.id,
      },
    ],
  });

  console.log('✅ Logs de stock de ejemplo creados');

  console.log('🎉 Seed completado exitosamente!');
  console.log('📧 Admin: admin@mercadocafetero.com / admin123');
  console.log('👤 Cliente: cliente@ejemplo.com / cliente123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
