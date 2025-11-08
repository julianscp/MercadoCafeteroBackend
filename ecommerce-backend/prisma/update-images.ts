import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🖼️ Actualizando imágenes de productos...');

  // Obtener todos los productos
  const productos = await prisma.product.findMany({
    select: {
      id: true,
      nombre: true,
      imagenUrl: true,
      categoria: true,
    },
  });

  console.log(`📦 Total de productos encontrados: ${productos.length}`);

  // URLs de imágenes de ejemplo para diferentes categorías
  const imagenesPorCategoria: { [key: string]: string[] } = {
    'Café en Grano': [
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&h=500&fit=crop',
    ],
    'Café Molido': [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=500&h=500&fit=crop',
    ],
    'Café Instantáneo': [
      'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
    ],
  };

  // Imágenes genéricas de café
  const imagenesGenericas = [
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&h=500&fit=crop',
  ];

  let actualizados = 0;
  let yaTienenImagen = 0;

  for (const producto of productos) {
    if (!producto.imagenUrl) {
      // Seleccionar una imagen según la categoría
      let imagenUrl: string;
      
      if (imagenesPorCategoria[producto.categoria]) {
        const imagenes = imagenesPorCategoria[producto.categoria];
        imagenUrl = imagenes[actualizados % imagenes.length];
      } else {
        imagenUrl = imagenesGenericas[actualizados % imagenesGenericas.length];
      }

      await prisma.product.update({
        where: { id: producto.id },
        data: { imagenUrl },
      });

      console.log(`✅ Imagen agregada a: ${producto.nombre} (${producto.categoria})`);
      actualizados++;
    } else {
      console.log(`ℹ️ Ya tiene imagen: ${producto.nombre}`);
      yaTienenImagen++;
    }
  }

  console.log('\n🎉 Actualización completada!');
  console.log(`📊 Resumen:`);
  console.log(`   - Productos actualizados: ${actualizados}`);
  console.log(`   - Productos que ya tenían imagen: ${yaTienenImagen}`);
  console.log(`   - Total: ${productos.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error actualizando imágenes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

