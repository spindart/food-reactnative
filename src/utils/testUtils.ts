import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupTestDatabase = async () => {
  // Add logic to seed the database with test data if needed
  console.log('Setting up test database...');
};

export const teardownTestDatabase = async () => {
  // Add logic to clean up the database after tests
  console.log('Tearing down test database...');
  await prisma.$disconnect();
};

export const clearTestDatabase = async () => {
  await prisma.produto.deleteMany(); // Delete related products first
  await prisma.avaliacao.deleteMany();
  await prisma.estabelecimento.deleteMany();
};

export const seedTestDatabase = async () => {
  await clearTestDatabase();
  await prisma.estabelecimento.create({
    data: {
      id: 1,
      nome: 'Test Establishment',
      descricao: 'A test establishment for unit tests.',
      endereco: '123 Test Street',
      avaliacao: 4.5,
      avaliacoesCount: 10,
      donoId: 1,
    },
  });
  await prisma.estabelecimento.create({
    data: {
      id: 2,
      nome: 'Another Test Establishment',
      descricao: 'Another test establishment for unit tests.',
      endereco: '456 Test Avenue',
      avaliacao: 4.0,
      avaliacoesCount: 5,
      donoId: 1,
    },
  });
};

export const mockAuthentication = (app: any) => {
  console.log('Applying mock authentication middleware');
  app.use((req: any, res: any, next: any) => {
    if (!req.user) {
      console.log('Setting req.user to { id: 1 }');
      req.user = { id: 1 }; // Use integer ID for consistency
    } else {
      console.log('req.user already set by another middleware:', req.user);
    }
    next();
  });
};

export { prisma };
