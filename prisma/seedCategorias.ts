import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categorias = [
    'Restaurante – refeição pronta',
    'Lanches / Burgers / Pizza',
    'Marmitas / comida caseira',
    'Padaria / Café da manhã',
    'Mercado / Mercearia',
    'Farmácia / Higiene',
    'Pet shop',
    'Saudável / Vegana / Vegetariana',
    'Sobremesas / Açaí / Doces',
  ];

  for (const nome of categorias) {
    await prisma.categoria.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  console.log('Categorias populadas com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
