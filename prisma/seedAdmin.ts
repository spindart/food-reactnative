import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'kelvin.behank@gmail.com';
  const adminPassword = 'admin123'; // Altere para uma senha segura
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  const adminExists = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: adminEmail,
        senha: hashedPassword,
        role: 'dono',
      },
    });
    console.log('Usuário admin cadastrado com sucesso!');
  } else {
    console.log('Usuário admin já existe.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
